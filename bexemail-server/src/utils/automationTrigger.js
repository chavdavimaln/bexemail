const db = require('../config/db');
const connection = require('../config/redisConnection');

let _automationQueue = null;
function getAutomationQueue() {
  if (!_automationQueue) {
    const { Queue } = require('bullmq');
    _automationQueue = new Queue('automationQueue', { connection });
  }
  return _automationQueue;
}

/**
 * Triggers automations for a given subscriber and trigger event/label.
 * @param {number} subscriberId 
 * @param {string} triggerLabel - e.g., 'Subscriber joins list', 'Signup form submitted', etc.
 * @param {object} context - { listId, fieldName, fieldValue, formId, ... }
 */
async function triggerAutomations(subscriberId, triggerLabel, context = {}) {
  try {
    // 1. Fetch all active automations
    const [automations] = await db.query(
      `SELECT id, workflow_json, reentry_policy, audience_id FROM automations WHERE status = 'active'`
    );

    for (const automation of automations) {
      const graph = typeof automation.workflow_json === 'string'
        ? JSON.parse(automation.workflow_json)
        : (automation.workflow_json || { nodes: [], edges: [] });

      const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
      
      // Find the trigger node
      const triggerNode = nodes.find(n => n.type === 'triggerNode' || n.type === 'trigger');
      if (!triggerNode) continue;

      const nodeLabel = triggerNode.data?.label || '';
      
      // Check if trigger label matches
      if (nodeLabel.toLowerCase() !== triggerLabel.toLowerCase()) {
        continue;
      }

      // Check specific conditions based on trigger type
      if (triggerLabel.toLowerCase() === 'subscriber joins list' && context.listId) {
        // Match list ID (either from triggerNode.data or automation.audience_id)
        const targetListId = triggerNode.data?.selectedList || automation.audience_id;
        if (targetListId && String(targetListId) !== String(context.listId)) {
          continue;
        }
      }

      if (triggerLabel.toLowerCase() === 'specific form field selected' && context.fieldName) {
        const targetField = triggerNode.data?.selectedField || triggerNode.data?.fieldName;
        const targetValue = triggerNode.data?.fieldValue;
        if (targetField && String(targetField).toLowerCase() !== String(context.fieldName).toLowerCase()) {
          continue;
        }
        if (targetValue && String(targetValue).toLowerCase() !== String(context.fieldValue).toLowerCase()) {
          continue;
        }
      }

      // Check Re-entry Policy
      const reentryPolicy = typeof automation.reentry_policy === 'string'
        ? JSON.parse(automation.reentry_policy)
        : (automation.reentry_policy || {});

      const [existing] = await db.query(
        `SELECT status, entered_at FROM automation_contacts WHERE subscriber_id = ? AND automation_id = ? ORDER BY entered_at DESC LIMIT 1`,
        [subscriberId, automation.id]
      );

      if (existing.length > 0) {
        const currentStatus = existing[0].status;
        if (['processing', 'waiting', 'waiting_condition'].includes(currentStatus)) {
          continue; // Already active in this automation
        }
        if (reentryPolicy.allowReentry === false) {
          continue; // Re-entry not allowed
        }
        if (reentryPolicy.cooldownDays && existing[0].entered_at) {
          const cooldownMs = reentryPolicy.cooldownDays * 24 * 60 * 60 * 1000;
          const timeSinceLastEntry = Date.now() - new Date(existing[0].entered_at).getTime();
          if (timeSinceLastEntry < cooldownMs) {
            continue; // Cooldown period not elapsed
          }
        }
      }

      // Enroll subscriber in the automation
      await db.query(
        `INSERT INTO automation_contacts (automation_id, subscriber_id, current_node_id, status, context_json) 
         VALUES (?, ?, ?, 'processing', ?)`,
        [automation.id, subscriberId, triggerNode.id, JSON.stringify(context)]
      );

      // Push to BullMQ queue
      try {
        await getAutomationQueue().add('process_step', {
          automation_id: automation.id,
          subscriber_id: subscriberId,
          current_node_id: triggerNode.id
        });
      } catch (redisErr) {
        console.warn(`[Redis/BullMQ] Could not queue step: Redis may be offline. Error: ${redisErr.message}`);
      }

      // Log the entry
      await db.query(
        `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
        [automation.id, subscriberId, triggerNode.id, `Entered via Trigger: ${triggerLabel}`]
      );
    }
  } catch (error) {
    console.error(`Error processing automation trigger (${triggerLabel}):`, error);
  }
}

module.exports = { triggerAutomations };
