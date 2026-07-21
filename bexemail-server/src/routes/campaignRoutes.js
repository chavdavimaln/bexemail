const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

router.post('/dispatch', campaignController.dispatchCampaign);

module.exports = router;
