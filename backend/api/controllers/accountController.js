const AccountService = require('../services/accountService');
const { 
    sanitizeName,
    sanitizeEmail,
    sanitizePassword
} = require('../utils/sanitizer');

class AccountController {
    async register(req, res, next) {
        try {
            const firstname = sanitizeName(req.body.firstname)
            const lastname = sanitizeName(req.body.lastname)
            const email = sanitizeEmail(req.body.email)
            const password = sanitizePassword(req.body.password)

            const { token, user, message } = await AccountService.register(firstname, lastname, email, password);
            res.status(201).json({ token, user, message });
        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            const email = sanitizeEmail(req.body.email)
            const password = sanitizePassword(req.body.password)

            const { token, user } = await AccountService.login(email, password);
            res.status(200).json({ token, user });
        } catch (error) {
            next(error);
        }
    }

    async getUserInfo(req, res, next) {
        try {
            const userid = req.user.userID
            const user = await AccountService.get(userid);
            res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    }

    async changePassword(req, res, next) {
        const userid = req.user.userID

        const currentPassword = sanitizePassword(req.body.currentPassword)
        const newPassword = sanitizePassword(req.body.newPassword)

        try {
            const result = await AccountService.updatePassword(userid, currentPassword, newPassword); 
            res.status(200).json({ result });
        } catch (error) {
            next(error);
        }
    }

    async deleteUserInfo(req, res, next) {
        const userid = req.user.userID
        const password = sanitizePassword(req.body.password)
        try {
            const result = await AccountService.delete(userid, password);
            res.status(200).json({ result });
        } catch (error) {
            next(error);
        }
    }
    
    async validate(req, res, next) {
        const userid = req.user.userID;
        const isAdmin = req.user.isAdmin;
        try {
            const result = await AccountService.validate(userid, isAdmin);   
            res.status(200).json({ result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AccountController();
