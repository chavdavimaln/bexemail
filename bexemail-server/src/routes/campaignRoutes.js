const express = require('express');
const router = express.Router();
const campaignsController = require('../controllers/campaigns');

router.post('/dispatch', campaignsController.dispatchCampaign);

module.exports = router;
