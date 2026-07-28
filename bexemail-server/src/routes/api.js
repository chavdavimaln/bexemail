const express = require('express');
const router = express.Router();
const subscribersController = require('../controllers/subscribers');
const listsController = require('../controllers/lists');
const campaignsController = require('../controllers/campaigns');
const templatesController = require('../controllers/templates');
const analyticsController = require('../controllers/analytics');
const settingsController = require('../controllers/settings');
const { checkRole, ROLES } = require('../middleware/rbac');

// Subscribers
router.post('/subscribers', subscribersController.createSubscriber);
router.get('/subscribers', subscribersController.getSubscribers);
router.post('/subscribers/unsubscribe/:subscriberId', subscribersController.unsubscribe);  // must be before :id routes
router.put('/subscribers/:id', subscribersController.updateSubscriber);
router.delete('/subscribers/:id', subscribersController.deleteSubscriber);

// Senders
const sendersController = require('../controllers/senders');
router.get('/senders', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN]), sendersController.getSenders);
router.post('/senders', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN]), sendersController.createSender);
router.put('/senders/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN]), sendersController.updateSender);
router.delete('/senders/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN]), sendersController.deleteSender);

// Lists
router.post('/lists', checkRole([ROLES.SUPER_ADMIN, ROLES.CAMPAIGN_MANAGER]), listsController.createList);
router.get('/lists', listsController.getLists);
router.put('/lists/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.CAMPAIGN_MANAGER]), listsController.updateList);
router.delete('/lists/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.CAMPAIGN_MANAGER]), listsController.deleteList);
router.post('/lists/assign', checkRole([ROLES.SUPER_ADMIN, ROLES.CAMPAIGN_MANAGER]), listsController.assignSubscribers);
router.post('/lists/sync', listsController.syncSubscriberLists);  // no role guard - used by contacts edit

// Campaigns (Require Campaign Manager or Super Admin)
router.get('/campaigns', checkRole([ROLES.CAMPAIGN_MANAGER, ROLES.SUPER_ADMIN]), campaignsController.getCampaigns);
router.get('/campaigns/:id', checkRole([ROLES.CAMPAIGN_MANAGER, ROLES.SUPER_ADMIN]), campaignsController.getCampaignById);
router.put('/campaigns/:id', checkRole([ROLES.CAMPAIGN_MANAGER, ROLES.SUPER_ADMIN]), campaignsController.updateCampaign);
router.delete('/campaigns/:id', checkRole([ROLES.CAMPAIGN_MANAGER, ROLES.SUPER_ADMIN]), campaignsController.deleteCampaign);
router.post('/campaigns/dispatch', checkRole([ROLES.CAMPAIGN_MANAGER, ROLES.SUPER_ADMIN]), campaignsController.dispatchCampaign);
router.put('/campaigns/:id/approve', checkRole([ROLES.SUPER_ADMIN]), campaignsController.approveCampaign);
router.post('/campaigns/:id/duplicate', checkRole([ROLES.CAMPAIGN_MANAGER, ROLES.SUPER_ADMIN]), campaignsController.duplicateCampaign);
router.put('/campaigns/:id/status', checkRole([ROLES.CAMPAIGN_MANAGER, ROLES.SUPER_ADMIN]), campaignsController.updateCampaignStatus);

// Templates
router.post('/templates', templatesController.createTemplate);
router.get('/templates', templatesController.getTemplates);
router.get('/templates/:id', templatesController.getTemplateById);
router.put('/templates/:id', templatesController.updateTemplate);
router.delete('/templates/:id', templatesController.deleteTemplate);

// Analytics
router.get('/analytics/dashboard', analyticsController.getDashboardStats);
router.get('/track/open/:campaignId/:subscriberId', analyticsController.trackOpen);
router.get('/analytics/:campaignId', analyticsController.getCampaignAnalytics);

// Settings (Require Super Admin or Campaign Manager)
router.get('/settings', checkRole([ROLES.SUPER_ADMIN, ROLES.CAMPAIGN_MANAGER]), settingsController.getSettings);
router.put('/settings', checkRole([ROLES.SUPER_ADMIN, ROLES.CAMPAIGN_MANAGER]), settingsController.updateSettings);

// Automations
const automationsController = require('../controllers/automations');
router.post('/automations', automationsController.createAutomation);
router.get('/automations', automationsController.getAutomations);
router.put('/automations/:id/status', automationsController.updateAutomationStatus);
router.delete('/automations/:id', automationsController.deleteAutomation);

// API Keys
const apiKeysController = require('../controllers/apiKeys');
router.post('/api-keys', checkRole([ROLES.SUPER_ADMIN]), apiKeysController.generateKey);
router.get('/api-keys', checkRole([ROLES.SUPER_ADMIN]), apiKeysController.getKeys);
router.put('/api-keys/:id/revoke', checkRole([ROLES.SUPER_ADMIN]), apiKeysController.revokeKey);

// History Routes
const historyController = require('../controllers/history');
router.get('/history', checkRole([ROLES.SUPER_ADMIN, ROLES.CAMPAIGN_MANAGER]), historyController.getHistory);
router.post('/history/:id/restore', checkRole([ROLES.SUPER_ADMIN]), historyController.restoreHistory);
router.post('/history/:id/restore-edited', checkRole([ROLES.SUPER_ADMIN]), historyController.restoreEditedHistory);
router.get('/history/download', checkRole([ROLES.SUPER_ADMIN]), historyController.downloadHistory);

// External Integrations (RBAC protected)
const integrationsController = require('../controllers/integrations');
router.get('/integrations', checkRole([ROLES.SUPER_ADMIN, ROLES.CAMPAIGN_MANAGER]), integrationsController.getIntegrations);
router.post('/integrations', checkRole([ROLES.SUPER_ADMIN]), integrationsController.createIntegration);
router.put('/integrations/:id', checkRole([ROLES.SUPER_ADMIN]), integrationsController.updateIntegration);
router.delete('/integrations/:id', checkRole([ROLES.SUPER_ADMIN]), integrationsController.deleteIntegration);
router.post('/integrations/:id/sync', checkRole([ROLES.SUPER_ADMIN, ROLES.CAMPAIGN_MANAGER]), integrationsController.syncIntegration);

// Admin Users (RBAC protected with controller-level scoping)
const adminsController = require('../controllers/admins');
const backupController = require('../controllers/backupController');

router.get('/admins', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), adminsController.getAdmins);
router.post('/admins', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN]), adminsController.createAdmin);
router.put('/admins/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), adminsController.updateAdmin);
router.delete('/admins/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN]), adminsController.deleteAdmin);
router.post('/admins/:id/reset-password', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), adminsController.resetPasswordManually);

// Database Backup (Super Admin and Admin/Sub Admin)
router.get('/backup/download', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN]), backupController.downloadBackup);

module.exports = router;
