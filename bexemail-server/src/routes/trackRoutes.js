const express = require('express');
const router = express.Router();
const trackController = require('../controllers/trackController');

router.get('/open/:campaignId/:subscriberId', trackController.trackOpen);
router.get('/click/:campaignId/:subscriberId', trackController.trackClick);

module.exports = router;
