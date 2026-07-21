const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/:campaignId', reportController.getCampaignReport);

module.exports = router;
