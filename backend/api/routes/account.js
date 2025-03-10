const express = require('express');
const router = express.Router();
const AccountController = require('../controllers/accountController');
const authenticateToken = require('../middleware/authenticateUser');
const { 
    loginLimiter,
    registerLimiter,
    changePasswordLimiter,
    deleteUserLimiter,
    getUserInfoLimiter

} = require('../middleware/rateLimiters');

router.post('/register', registerLimiter, AccountController.register);
router.post('/login', loginLimiter, AccountController.login);
router.put('/', authenticateToken, changePasswordLimiter, AccountController.changePassword);
router.delete('/', authenticateToken, deleteUserLimiter, AccountController.deleteUserInfo);
router.get('/', authenticateToken, getUserInfoLimiter, AccountController.getUserInfo);
router.get('/validate-token', authenticateToken, getUserInfoLimiter, AccountController.validate);


module.exports = router;