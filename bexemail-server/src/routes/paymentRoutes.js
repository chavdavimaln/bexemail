const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/process-checkout', paymentController.processCheckout);
router.get('/gateways', paymentController.getGateways);
router.get('/my-transactions', paymentController.getUserTransactions);

module.exports = router;
