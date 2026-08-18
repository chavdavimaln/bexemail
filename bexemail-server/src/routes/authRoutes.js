const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { checkRole } = require('../middleware/rbac'); // We will use this to verify JWT

router.post('/login', authController.login);
router.post('/register', authController.register);
// Since checkRole requires JWT, we can just pass an empty array to mean "any logged in user"
router.get('/me', checkRole([]), authController.getMe);
router.get('/system-limits-status', authController.getSystemLimitsStatus);
router.put('/profile', checkRole([]), authController.updateProfile);
router.put('/password', checkRole([]), authController.updatePassword);
router.post('/my-subscription', checkRole([]), authController.updateMySubscription);

// Password Reset endpoints (public)
const adminsController = require('../controllers/admins');
router.post('/forget-password', adminsController.sendForgetPassword);
router.post('/reset-password-public', authController.resetPasswordPublic);

module.exports = router;
