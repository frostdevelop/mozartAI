const express = require('express');
const signupController = require('../controller/signup.controller');
const loginController = require('../controller/login.controller');
const logoutController = require('../controller/logout.controller');
const userCheckController = require('../controller/userchk.controller');
const router = express.Router();

router.post('/session',loginController);
router.delete('/session',logoutController);
router.post('/acc',signupController);
router.post('/checkusername',userCheckController);

module.exports = router;