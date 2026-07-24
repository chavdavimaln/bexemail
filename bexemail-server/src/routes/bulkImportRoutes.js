const express = require('express');
const router = express.Router();
const bulkImportController = require('../controllers/bulkImportController');

router.post('/parse', bulkImportController.parseContacts);
router.post('/confirm', bulkImportController.confirmImport);
router.post('/logs/:id/rollback', bulkImportController.rollbackImport);
router.get('/logs', bulkImportController.getImportLogs);
router.get('/subscribers', bulkImportController.getBifurcatedSubscribers);

module.exports = router;
