const express = require('express');
const router = express.Router();
const cors = require('cors');
const preferenceController = require('../controllers/preferenceController');

// These routes are public since subscribers access them from email links
router.use(cors());

router.get('/:subscriberId', preferenceController.getPreferences);
router.post('/:subscriberId', preferenceController.updatePreferences);

module.exports = router;
