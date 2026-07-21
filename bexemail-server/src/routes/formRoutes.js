const express = require('express');
const router = express.Router();
const cors = require('cors');
const formController = require('../controllers/formController');

// Allow external websites to post to this endpoint
router.post('/submit/:listId', cors(), formController.submitForm);

module.exports = router;
