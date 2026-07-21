const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { checkRole } = require('../middleware/rbac');

// Any logged-in user can use AI generation
router.post('/generate-subject', checkRole([]), aiController.generateSubject);

module.exports = router;
