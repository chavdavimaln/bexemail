const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { checkRole } = require('../middleware/rbac');

// Any logged-in user can use AI generation
router.post('/generate-subject', checkRole([]), aiController.generateSubject);
router.post('/generate-campaign', checkRole([]), aiController.generateCampaign);
router.post('/generate-ab-variants', checkRole([]), aiController.generateAbVariants);

module.exports = router;
