const express = require('express');
const router = express.Router();
const conn = require('./../db/db')
const sms_util = require('./../util/sms_util')
const svgCaptcha = require('svg-captcha');

let user = {}; // 用户信息

const recommendArr = require('./../data/shopList').data;
router.get('/homeshoplist/api', function (req, res, next) {
  // 1. 定义临时数组
  let temp_arr_all = [];
  // 2. 遍历
  for (let i = 0; i < recommendArr.length; i++) {
    // 2.1 取出单个数据对象
    let oldItem = recommendArr[i];
    // 2.2 取出数据表中对应的字段
    let temp_arr = [];
    temp_arr.push(oldItem.iconurl);
    temp_arr.push(oldItem.icontitle);
    // 2.3 合并到大的数组
    temp_arr_all.push(temp_arr);
  }
  // console.log(temp_arr_all);

  // 3. 批量插入数据库表
  // 3.1 数据库查询的语句
  let sqlStr = "INSERT INTO pdd_homeshoplist(`iconurl`,`icontitle`) VALUES ?";
  // 3.2 执行语句
  conn.query(sqlStr, [temp_arr_all], (error, results, fields) => {
    if (error) {
      console.log(error);
      console.log('插入失败');
    } else {
      console.log('插入成功');
    }
  });
});

/**
 * 获取首页轮播图
 */
router.get('/api/homecasual', (req, res) => {

  let sqlStr = 'select * from pdd_homecasual';
  conn.query(sqlStr, (error, results, fields) => {
    if (error) {
      res.json({ err_code: 0, message: '请求数据失败' })
    } else {
      res.json({ success_code: 200, message: results })
    }
  })

})

/**
 * 获取首页导航
 */
router.get('/api/homenav', (req, res) => {
  let sqlStr = 'select * from pdd_homenav';
  conn.query(sqlStr, (error, results, fields) => {
    if (error) {
      res.json({ err_code: 0, message: '请求数据失败' })
    } else {
      res.json({ success_code: 200, message: results })
    }
  })
});

/**
 * 获取首页商品列表
 */
router.get('/api/homeshoplist', (req, res) => {
  setTimeout(function () {
    const data = require('./../data/shopList');
    res.json({ success_code: 200, message: data })
  }, 300);
});

/**
* 获取推荐商品列表
*/
router.get('/api/recommendshoplist', (req, res) => {
  // 获取参数
  let pageNo = req.query.page || 1;
  let pageSize = req.query.count || 20;
  console.log(pageNo, pageSize);
  let sqlStr = 'select * from pdd_recommend LIMIT ' + (pageNo - 1) * pageSize + ',' + pageSize;

  conn.query(sqlStr, (error, results, fields) => {
    if (error) {
      res.json({ err_code: 0, message: '请求数据失败' })
    } else {
      res.json({ success_code: 200, message: results })
    }
  })
});

/**
* 获取推荐商品列表拼单用户
*/
router.get('/api/recommenduser', (req, res) => {
  setTimeout(function () {
    const data = require('./../data/recommend_users');
    res.json({ success_code: 200, message: data })
  }, 10);
});

/**
* 获取搜索分类列表
*/
router.get('/api/searchgoods', (req, res) => {
  setTimeout(function () {
    const data = require('./../data/search');
    res.json({ success_code: 200, message: data })
  }, 10);
});

/**
 * 获取手机验证码
 */
router.get('/api/getCode', (req, res) => {
  // 获取手机号码
  let phone = req.query.phone;
  // 随机产生验证码
  let code = sms_util.randomCode(6);
  // console.log(code);

  /* sms_util.sendCode(phone, code, function (success) {
    if (success) {
      user[phone] = code;
      res.json({ success_code: 200, message: code })
    } else {
      res.json({ err_code: 0, message: '验证码获取失败' })
    }
  }) */
  // 成功
  user[phone] = code
  res.json({ success_code: 200, message: code })
});

/**
 * 手机验证码登录
 */
router.post('/api/codeLogin', (req, res) => {
  let phone = req.body.phone;
  let code = req.body.code;

  // 验证码正确
  if (code === user[phone]) {
    delete user[phone];
    let sqlStr = "select * from pdd_user_info where user_phone = '" + phone + "' LIMIT 1";
    conn.query(sqlStr, (error, results, fields) => {
      if (error) {
        res.json({ err_code: 0, message: '请求数据失败' });
      } else {
        results = JSON.parse(JSON.stringify(results));
        
        // 用户存在
        if (results[0]) {
          req.session.userId = results[0].id;
          // 返回数据给客户端
          res.json({ success_code: 200, message: { id: results[0].id, user_name: results[0].user_name, user_phone: results[0].user_phone, user_email: results[0].user_email } })
        } else { // 用户不存在
          // 创建新用户
          let addSql = "INSERT INTO pdd_user_info(user_name, user_phone) VALUES (?, ?)";
          let addParams = [phone, phone];
          conn.query(addSql, addParams, (error, results, fields) => {
            if (error) {
              res.json({ err_code: 0, message: '请求数据失败' });
            } else {
              results = JSON.parse(JSON.stringify(results));
              req.session.userId = results.insertId;
              let sqlStr = "select * from pdd_user_info where id = '" + results.insertId + "' LIMIT 1";
              console.log(sqlStr)
              conn.query(sqlStr, (error, results, fields) => {
                if (error) {
                  res.json({ err_code: 0, message: '请求数据失败' });
                } else {
                  results = JSON.parse(JSON.stringify(results));
                  // 返回数据给客户端
                  res.json({ success_code: 200, message: { id: results[0].id, user_name: results[0].user_name, user_phone: results[0].user_phone, user_email: results[0].user_email } })
                }
              })
            }
          })
        }
      }
    })
  } else { // 验证码不正确
    res.json({ err_code: 0, message: '验证码不正确' })
  }
});

/**
 * 获取图片验证码 svg-captcha
 */
router.get('/api/getCaptcha', (req, res) => {
  let captcha = svgCaptcha.create({
    size: 4,
    ignoreChars: '0o1i',
    noise: 2,
    color: true,
  })
  // 保存
  req.session.captcha = captcha.text.toLocaleLowerCase();
  // console.log(req.session)
  // 返回客户端
  res.type('svg');
  res.send(captcha.data)
});

/**
 * 账号密码登录
 */
router.post('/api/pwdLogin', (req, res) => {
  let account = req.body.account; // 获取用户名/手机/邮箱
  let pwd = req.body.password; // 获取密码
  let captchaCode = req.body.captchaCode.toLocaleLowerCase(); // 获取图形验证码

  console.log(req.session.captcha)
  if (captchaCode === req.session.captcha) { // 图形验证码正确
    delete req.session.captcha;
    let params = [account, pwd];
    let sqlStr = "";
    // 判断account是用户名？手机？邮箱
    if (/^[A-Za-z\d]+([-_.][A-Za-z\d]+)*@([A-Za-z\d]+[-.])+[A-Za-z\d]{2,4}$/.test(account)) {
      // 邮箱
      sqlStr = "SELECT * FROM pdd_user_info where user_email = ? and user_pwd = ?";
    } else if (/^[1][3,4,5,7,8][0-9]{9}$/.test(account)) {
      // 手机
      sqlStr = "SELECT * FROM pdd_user_info where user_phone = ? and user_pwd = ?";
    } else {
      // 用户名
      sqlStr = "SELECT * FROM pdd_user_info where user_name = ? and user_pwd = ?";
    }
    conn.query(sqlStr, params, (error, results, fields) => {
      if (error) {
        res.josn({ err_code: 0, message: '请求数据失败' })
      } else {
        results = JSON.parse(JSON.stringify(results))
        if (results.length > 0) {
          req.session.userId = results[0].id;
          // 返回数据给客户端
          res.json({ success_code: 200, message: { id: results[0].id, user_name: results[0].user_name, user_phone: results[0].user_phone, user_email: results[0].user_email } })
        } else {
          res.json({ err_code: 0, message: '用户名/手机/邮箱不存在或密码不正确' })
        }
      }
    })

  } else { // 图形验证码不正确
    res.json({ err_code: 0, message: '验证码不正确' })
  }
});



router.get('/public/images/home/*', function (req, res) {
  const temp = __dirname.substring(0, __dirname.lastIndexOf('\\'))
  res.sendFile(temp + req.url);
  console.log(__dirname)
});

router.get('/public/images/search/*', function (req, res) {
  const temp = __dirname.substring(0, __dirname.lastIndexOf('\\'))
  res.sendFile(temp + req.url);
});

module.exports = router;
