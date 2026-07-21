const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automationController');

// Define the routes as specified in Prompt 7
router.get('/', automationController.getAutomations);
router.post('/', automationController.createAutomation);
router.get('/dashboard-stats', automationController.getDashboardStats); // Must be before /:id routes
router.get('/activity/recent', automationController.getRecentActivity);
router.get('/templates', automationController.getAutomationTemplates);
router.post('/templates/:templateId/use', automationController.createFromTemplate);
router.get('/builder-options', automationController.getBuilderOptions);
router.post('/ai-generate', automationController.generateWorkflow);
router.get('/:id/stats', automationController.getAutomationStats);
router.get('/:id', automationController.getAutomation);
router.put('/:id', automationController.updateAutomation);
router.put('/:id/publish', automationController.publishAutomation); // keeping existing for compatibility if needed, but 'activate' is better
router.post('/:id/activate', automationController.activateAutomation);
router.post('/:id/pause', automationController.pauseAutomation);
router.post('/:id/resume', automationController.resumeAutomation);
router.post('/:id/stop', automationController.stopAutomation);
router.post('/:id/duplicate', automationController.duplicateAutomation);
router.post('/:id/test', automationController.testAutomation);
router.get('/:id/contacts', automationController.getAutomationContacts);
router.post('/:id/contacts/:contactId/retry', automationController.retryContactStep);
router.get('/:id/logs', automationController.getAutomationLogs);
router.get('/:id/logs/:subscriberId', automationController.getContactJourneyLogs);
router.get('/:id/reports/nodes', automationController.getNodeReports);
router.get('/:id/versions', automationController.getAutomationVersions);
router.post('/:id/versions/:versionId/restore', automationController.restoreVersion);

module.exports = router;
