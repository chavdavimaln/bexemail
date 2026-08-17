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
router.get('/senders', sendersController.getSenders);
router.post('/senders', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN]), sendersController.createSender);
router.put('/senders/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN]), sendersController.updateSender);
router.delete('/senders/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN]), sendersController.deleteSender);
router.post('/senders/:id/test', sendersController.testSender);
router.post('/senders/test', sendersController.testSender);

// Lists
router.post('/lists', checkRole([ROLES.SUPER_ADMIN, ROLES.CAMPAIGN_MANAGER]), listsController.createList);
router.get('/lists', listsController.getLists);
router.put('/lists/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.CAMPAIGN_MANAGER]), listsController.updateList);
router.delete('/lists/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.CAMPAIGN_MANAGER]), listsController.deleteList);
router.post('/lists/assign', checkRole([ROLES.SUPER_ADMIN, ROLES.CAMPAIGN_MANAGER]), listsController.assignSubscribers);
router.post('/lists/sync', listsController.syncSubscriberLists);  // no role guard - used by contacts edit
router.post('/lists/merge-duplicates', listsController.mergeDuplicateLists);

// Campaigns
router.get('/campaigns', campaignsController.getCampaigns);
router.get('/campaigns/:id', campaignsController.getCampaignById);
router.post('/campaigns', campaignsController.dispatchCampaign);
router.put('/campaigns/:id', campaignsController.updateCampaign);
router.delete('/campaigns/:id', campaignsController.deleteCampaign);
router.post('/campaigns/dispatch', campaignsController.dispatchCampaign);
router.post('/campaigns_wizard/dispatch', campaignsController.dispatchCampaign);
router.put('/campaigns/:id/approve', campaignsController.approveCampaign);
router.get('/campaigns/:id/logs', campaignsController.getCampaignLogs);
router.post('/campaigns/:id/duplicate', campaignsController.duplicateCampaign);
router.put('/campaigns/:id/status', campaignsController.updateCampaignStatus);

// Templates
router.post('/templates/send-test', templatesController.sendTestTemplate);
router.post('/templates/:id/send-test', templatesController.sendTestTemplate);
router.post('/templates/:id/clone', templatesController.cloneTemplate);
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

// Database & Module Backups (Super Admin, Sub Admin, Admin, and User with permission)
router.get('/backup/download', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), backupController.downloadBackup);
router.get('/backup/download-code-ui', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), backupController.downloadCodeUiSystem);
router.post('/backup/create', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), backupController.createDatabaseBackup);
router.post('/backup/import', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), backupController.importDatabaseBackup);
router.get('/backup/list', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), backupController.getBackupHistory);
router.post('/backup/:id/restore', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), backupController.restoreDatabaseBackup);
router.delete('/backup/delete', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), backupController.deleteDatabaseBackup);
router.post('/backup/delete', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), backupController.deleteDatabaseBackup);
router.delete('/backup/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), backupController.deleteDatabaseBackup);
router.get('/backup/:id/download', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), backupController.downloadSpecificBackup);

// Auto Backup Schedules & Reminders
router.get('/backup/schedules', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), backupController.getBackupSchedules);
router.post('/backup/schedules', checkRole([ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.USER]), backupController.saveBackupSchedule);

// Registered Domains Configuration
const domainsController = require('../controllers/domainsController');
router.get('/domains', domainsController.getDomains);
router.post('/domains', domainsController.createDomain);
router.put('/domains/:id', domainsController.updateDomain);
router.put('/domains/:id/set-primary', domainsController.setPrimaryDomain);
router.delete('/domains/:id', domainsController.deleteDomain);

module.exports = router;
