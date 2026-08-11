const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');

// Public Plan routes
router.get('/', planController.getPlans);
router.get('/backup', planController.backupPlans);

// Admin Plan CRUD routes
router.post('/', planController.addPlan);
router.put('/:id', planController.updatePlan);
router.delete('/:id', planController.deletePlan);
router.post('/restore', planController.restorePlans);

// User Subscription Assignment routes
router.get('/user-subscriptions', planController.getUserSubscriptions);
router.post('/assign', planController.assignPlan);
router.post('/deassign', planController.deassignPlan);

module.exports = router;
