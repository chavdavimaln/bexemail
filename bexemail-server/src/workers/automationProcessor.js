const { Worker, Queue } = require('bullmq');
const db = require('../config/db'); // Your MySQL connection pool
const connection = require('../config/redisConnection');

// We need a reference to the main email queue to send campaigns
const emailQueue = new Queue('email_queue', { connection });
const automationQueue = new Queue('automationQueue', { connection });



// Helper to find the next node in the @xyflow/react JSON graph
const getNextNodeId = (currentNodeId, edges) => {
    const edge = edges.find(e => e.source === currentNodeId);
    return edge ? edge.target : null;
};

// Helper to find a specific node's data
const getNodeById = (nodeId, nodes) => {
    return nodes.find(n => n.id === nodeId);
};

const automationWorker = new Worker('automationQueue', async (job) => {
    const { automation_id, subscriber_id, current_node_id } = job.data;

    try {
        // --- GLOBAL EXIT RULE CHECK ---
        // Fetch the subscriber's current status
        const [subscriberStatus] = await db.query(
            `SELECT status FROM subscribers WHERE id = ?`, 
            [subscriber_id]
        );

        // If they unsubscribed, hard-bounced, or were suppressed manually, pull them out immediately
        const exitStatuses = ['unsubscribed', 'bounced', 'suppressed'];
        
        if (subscriberStatus.length > 0 && exitStatuses.includes(subscriberStatus[0].status)) {
            console.log(`Subscriber ${subscriber_id} meets exit condition (${subscriberStatus[0].status}). Stopping journey.`);
            
            // Mark as exited
            await db.query(
                `UPDATE automation_contacts SET status = 'exited' WHERE subscriber_id = ? AND automation_id = ?`,
                [subscriber_id, automation_id]
            );
            
            // Log the exit
            await db.query(
                `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                [automation_id, subscriber_id, current_node_id || 'global', `Exited early: Subscriber ${subscriberStatus[0].status}`]
            );
            return; // Terminate execution
        }
        // --- END EXIT RULE CHECK ---

        // 1. Fetch the automation graph from MySQL
        const [automations] = await db.query(
            `SELECT workflow_json, status, reentry_policy FROM automations WHERE id = ?`, 
            [automation_id]
        );

        if (automations.length === 0) {
            console.log(`Automation ${automation_id} not found. Stopping.`);
            return;
        }
        
        const reentryPolicy = typeof automations[0].reentry_policy === 'string' ? JSON.parse(automations[0].reentry_policy) : (automations[0].reentry_policy || {});
        
        // Custom Exit Condition (e.g., tag added)
        if (reentryPolicy.exitTag) {
            // Check if the user has this tag
            const [tagsData] = await db.query(`SELECT tags FROM subscribers WHERE id = ?`, [subscriber_id]);
            if (tagsData.length > 0 && tagsData[0].tags) {
                const subTags = typeof tagsData[0].tags === 'string' ? JSON.parse(tagsData[0].tags) : tagsData[0].tags;
                if (subTags.includes(reentryPolicy.exitTag)) {
                    console.log(`Subscriber ${subscriber_id} meets custom exit condition (Tag: ${reentryPolicy.exitTag}). Stopping journey.`);
                    await db.query(`UPDATE automation_contacts SET status = 'exited' WHERE subscriber_id = ? AND automation_id = ?`, [subscriber_id, automation_id]);
                    await db.query(`INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`, [automation_id, subscriber_id, current_node_id || 'global', `Exited early: Met custom exit condition (Tag: ${reentryPolicy.exitTag})`]);
                    return;
                }
            }
        }
        
        if (automations[0].status === 'paused') {
            console.log(`Automation ${automation_id} is paused. Hibernating subscriber ${subscriber_id} for 1 hour.`);
            // Re-queue the job to check back in 1 hour (3600000 ms)
            await automationQueue.add('process_step', {
                automation_id,
                subscriber_id,
                current_node_id
            }, { delay: 3600000 });
            return;
        }

        if (automations[0].status !== 'active') {
            console.log(`Automation ${automation_id} is ${automations[0].status}. Stopping.`);
            return;
        }

        const graph = typeof automations[0].workflow_json === 'string'
            ? JSON.parse(automations[0].workflow_json)
            : (automations[0].workflow_json || { nodes: [], edges: [] });
        const nodes = graph.nodes || [];
        const edges = graph.edges || [];

        // 2. Determine which node we are processing
        let nodeToProcessId = current_node_id;
        
        // If no node is provided, start at the Trigger
        if (!nodeToProcessId) {
            const triggerNode = nodes.find(n => n.type === 'triggerNode');
            if (!triggerNode) throw new Error("No trigger node found in graph");
            nodeToProcessId = getNextNodeId(triggerNode.id, edges);
        }

        if (!nodeToProcessId) {
            // End of workflow
            await db.query(
                `UPDATE automation_contacts SET status = 'completed' WHERE subscriber_id = ? AND automation_id = ?`,
                [subscriber_id, automation_id]
            );
            return;
        }

        const currentNode = getNodeById(nodeToProcessId, nodes);
        
        // 3. Switch-case logic for the Node Type
        switch (currentNode.type) {
            
            case 'delayNode': 
                const delayTime = parseInt(currentNode.data.delayTime || 1);
                const delayUnit = currentNode.data.delayUnit || 'days';
                const waitCondition = currentNode.data.waitCondition; // e.g., 'opened_email'
                
                let nextExecution = new Date();
                
                if (waitCondition) {
                    // Wait-Until logic: set a far future date, or poll. Realistically this requires webhook/event hooks to resume.
                    // For now, we set status to 'waiting_condition'
                    await db.query(
                        `UPDATE automation_contacts 
                         SET current_node_id = ?, status = 'waiting_condition', context_json = JSON_SET(COALESCE(context_json, '{}'), '$.waitCondition', ?) 
                         WHERE subscriber_id = ? AND automation_id = ?`,
                        [currentNode.id, waitCondition, subscriber_id, automation_id]
                    );
                    await db.query(
                        `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                        [automation_id, subscriber_id, currentNode.id, `Waiting for condition: ${waitCondition}`]
                    );
                    break;
                }
                
                // Calculate future time based on unit
                if (delayUnit === 'minutes') nextExecution.setMinutes(nextExecution.getMinutes() + delayTime);
                if (delayUnit === 'hours') nextExecution.setHours(nextExecution.getHours() + delayTime);
                if (delayUnit === 'days') nextExecution.setDate(nextExecution.getDate() + delayTime);

                // Update database to 'waiting' state
                await db.query(
                    `UPDATE automation_contacts 
                     SET current_node_id = ?, status = 'waiting', next_execution_time = ? 
                     WHERE subscriber_id = ? AND automation_id = ?`,
                    [currentNode.id, nextExecution, subscriber_id, automation_id]
                );
                
                // Log activity
                await db.query(
                    `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                    [automation_id, subscriber_id, currentNode.id, `Waiting for ${delayTime} ${delayUnit}`]
                );
                break;

            case 'emailNode': 
                // Push job to standard email queue
                await emailQueue.add('send_automation_email', {
                    subscriber_id,
                    subject: currentNode.data.subject,
                    template: currentNode.data.template
                });

                await db.query(
                    `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                    [automation_id, subscriber_id, currentNode.id, `Queued email: ${currentNode.data.subject}`]
                );

                // Immediately advance to next node
                const nextNodeAfterEmail = getNextNodeId(currentNode.id, edges);
                
                if (nextNodeAfterEmail) {
                    // Recursively process next step
                    // automationWorker.rateLimit(0); // Optional: delay before next step
                    await automationQueue.add('process_step', {
                        automation_id,
                        subscriber_id,
                        current_node_id: nextNodeAfterEmail
                    });
                } else {
                    await db.query(
                        `UPDATE automation_contacts SET status = 'completed' WHERE subscriber_id = ? AND automation_id = ?`,
                        [subscriber_id, automation_id]
                    );
                }
                break;

            case 'actionNode': 
                // Handle Tag/Untag logic
                const actionType = currentNode.data.actionType || 'addTag';
                
                if (actionType === 'addTag' || actionType === 'removeTag') {
                    const tagTarget = currentNode.data.tag;
                    if (tagTarget) {
                        try {
                            const [subRow] = await db.query(`SELECT tags FROM subscribers WHERE id = ?`, [subscriber_id]);
                            let currentTags = [];
                            if (subRow.length > 0 && subRow[0].tags) {
                                currentTags = typeof subRow[0].tags === 'string' ? JSON.parse(subRow[0].tags) : subRow[0].tags;
                            }
                            
                            if (actionType === 'addTag' && !currentTags.includes(tagTarget)) {
                                currentTags.push(tagTarget);
                            } else if (actionType === 'removeTag') {
                                currentTags = currentTags.filter(t => t !== tagTarget);
                            }
                            
                            await db.query(`UPDATE subscribers SET tags = ? WHERE id = ?`, [JSON.stringify(currentTags), subscriber_id]);
                            const actionString = actionType === 'addTag' ? 'Added tag' : 'Removed tag';
                            await db.query(
                                `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                                [automation_id, subscriber_id, currentNode.id, `${actionString}: ${tagTarget}`]
                            );
                        } catch (err) {
                            console.error("Failed to update tags", err);
                        }
                    }
                } else if (actionType === 'updateField') {
                    // Note: Ensure field name is sanitized to prevent SQL injection in real app
                    const field = currentNode.data.updateField;
                    const val = currentNode.data.updateValue;
                    if (field && val) {
                        try {
                            if (field === 'status' || field === 'country') {
                                await db.query(`UPDATE subscribers SET ?? = ? WHERE id = ?`, [field, val, subscriber_id]);
                            } else {
                                await db.query(`UPDATE subscribers SET custom_attributes = JSON_SET(COALESCE(custom_attributes, '{}'), ?, ?) WHERE id = ?`, [`$.${field}`, val, subscriber_id]);
                            }
                            await db.query(
                                `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                                [automation_id, subscriber_id, currentNode.id, `Updated field ${field} to ${val}`]
                            );
                        } catch (err) {
                            console.error("Failed to update subscriber field", err);
                        }
                    }
                } else if (actionType === 'webhook') {
                    const webhookUrl = currentNode.data.webhookUrl;
                    if (webhookUrl) {
                        try {
                            const [subData] = await db.query(`SELECT * FROM subscribers WHERE id = ?`, [subscriber_id]);
                            const axios = require('axios');
                            await axios.post(webhookUrl, { subscriber: subData[0] || {} });
                            
                            await db.query(
                                `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                                [automation_id, subscriber_id, currentNode.id, `Triggered Webhook: ${webhookUrl}`]
                            );
                        } catch (err) {
                            console.error("Failed to trigger webhook", err.message);
                            await db.query(
                                `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken, status, error_message) VALUES (?, ?, ?, ?, 'failed', ?)`,
                                [automation_id, subscriber_id, currentNode.id, `Webhook Failed: ${webhookUrl}`, err.message]
                            );
                        }
                    }
                } else if (actionType === 'crmCreateLead' || actionType === 'crmUpdateDeal') {
                    const provider = currentNode.data.crmProvider || 'salesforce';
                    try {
                        // Simulate CRM integration API call
                        await db.query(
                            `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                            [automation_id, subscriber_id, currentNode.id, `CRM (${provider}): ${actionType === 'crmCreateLead' ? 'Created Lead' : 'Updated Deal'}`]
                        );
                    } catch (err) {
                        console.error("Failed to sync with CRM", err);
                    }
                } else if (actionType === 'changeScore') {
                    const operator = currentNode.data.scoreOperator || 'add';
                    const value = parseInt(currentNode.data.scoreValue || 10, 10);
                    
                    try {
                        // Fetch current score from custom_attributes (assuming score is stored there)
                        const [subData] = await db.query(`SELECT custom_attributes FROM subscribers WHERE id = ?`, [subscriber_id]);
                        let customAttrs = {};
                        if (subData[0] && subData[0].custom_attributes) {
                            customAttrs = typeof subData[0].custom_attributes === 'string' ? JSON.parse(subData[0].custom_attributes) : subData[0].custom_attributes;
                        }
                        
                        let currentScore = parseInt(customAttrs.score || 0, 10);
                        if (operator === 'add') {
                            currentScore += value;
                        } else {
                            currentScore -= value;
                        }
                        
                        await db.query(`UPDATE subscribers SET custom_attributes = JSON_SET(COALESCE(custom_attributes, '{}'), '$.score', ?) WHERE id = ?`, [currentScore, subscriber_id]);
                        
                        await db.query(
                            `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                            [automation_id, subscriber_id, currentNode.id, `Updated Score: ${operator === 'add' ? '+' : '-'}${value} (New Score: ${currentScore})`]
                        );
                    } catch (err) {
                        console.error("Failed to update contact score", err);
                    }
                } else if (actionType === 'sendSms') {
                    // Simulate SMS integration
                    const message = currentNode.data.smsMessage || 'Hello!';
                    try {
                        await db.query(
                            `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                            [automation_id, subscriber_id, currentNode.id, `Sent SMS: ${message.substring(0, 30)}...`]
                        );
                    } catch (err) {
                        console.error("Failed to send SMS", err);
                    }
                } else if (actionType === 'startWorkflow') {
                    const targetWorkflow = currentNode.data.targetWorkflow;
                    if (targetWorkflow) {
                        try {
                            const [targetAuto] = await db.query(`SELECT id, status, workflow_json FROM automations WHERE id = ? OR name = ?`, [targetWorkflow, targetWorkflow]);
                            
                            if (targetAuto.length > 0 && targetAuto[0].status === 'active') {
                                const targetGraph = typeof targetAuto[0].workflow_json === 'string'
                                    ? JSON.parse(targetAuto[0].workflow_json)
                                    : (targetAuto[0].workflow_json || {});
                                const tNodes = targetGraph.nodes || [];
                                const tTrigger = tNodes.find(n => n.type === 'triggerNode' || n.type === 'trigger');
                                
                                if (tTrigger) {
                                    await automationQueue.add('process_step', {
                                        automation_id: targetAuto[0].id,
                                        subscriber_id: subscriber_id,
                                        current_node_id: tTrigger.id
                                    });
                                    
                                    await db.query(
                                        `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                                        [automation_id, subscriber_id, currentNode.id, `Triggered Workflow ID: ${targetAuto[0].id}`]
                                    );
                                }
                            } else {
                                await db.query(
                                    `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken, error_message, status) VALUES (?, ?, ?, ?, ?, 'failed')`,
                                    [automation_id, subscriber_id, currentNode.id, `Triggered Workflow: ${targetWorkflow}`, 'Target workflow not active or found']
                                );
                            }
                        } catch (err) {
                            console.error("Failed to start new workflow", err);
                        }
                    }
                }
                
                // Advance to next step
                const nextNodeAfterAction = getNextNodeId(currentNode.id, edges);
                if (nextNodeAfterAction) {
                    await automationQueue.add('process_step', {
                        automation_id,
                        subscriber_id,
                        current_node_id: nextNodeAfterAction
                    });
                }
                break;

            case 'ifElseNode':
                // 1. Evaluate the condition against the subscriber's actual data
                const { conditionField, label: expectedValue } = currentNode.data;
                let conditionMet = false;

                // Fetch subscriber data to evaluate (mocked example query)
                const [subscriber] = await db.query(
                    `SELECT * FROM subscribers WHERE id = ?`, [subscriber_id]
                );
                
                // Simple logic check
                if (subscriber.length > 0) {
                    if (conditionField === 'Tag' && subscriber[0].tags && subscriber[0].tags.includes(expectedValue)) {
                        conditionMet = true;
                    } else if (conditionField === 'Country' && subscriber[0].country === expectedValue) {
                        conditionMet = true;
                    }
                }

                // 2. Find the correct edge based on the handle ('yes' or 'no')
                const activeHandle = conditionMet ? 'yes' : 'no';
                const branchEdge = edges.find(e => 
                    e.source === currentNode.id && e.sourceHandle === activeHandle
                );

                // 3. Log the decision and advance
                await db.query(
                    `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                    [automation_id, subscriber_id, currentNode.id, `Condition Evaluated: ${conditionMet ? 'Yes' : 'No'}`]
                );

                if (branchEdge) {
                    await automationQueue.add('process_step', {
                        automation_id, subscriber_id, current_node_id: branchEdge.target
                    });
                } else {
                    // Workflow ends if there is no connected node on this branch
                    await db.query(
                        `UPDATE automation_contacts SET status = 'completed' WHERE subscriber_id = ? AND automation_id = ?`,
                        [subscriber_id, automation_id]
                    );
                }
                break;

            case 'splitNode':
                // 1. Route based on percentage split
                const splitA = currentNode.data.splitA || 50;
                const isBranchA = (Math.random() * 100) < splitA;
                const splitHandle = isBranchA ? 'path_a' : 'path_b';

                const splitEdge = edges.find(e => 
                    e.source === currentNode.id && e.sourceHandle === splitHandle
                );

                await db.query(
                    `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                    [automation_id, subscriber_id, currentNode.id, `Routed to Split: ${isBranchA ? 'A' : 'B'} (${isBranchA ? splitA : 100 - splitA}%)`]
                );

                if (splitEdge) {
                    await automationQueue.add('process_step', {
                        automation_id, subscriber_id, current_node_id: splitEdge.target
                    });
                } else {
                    await db.query(
                        `UPDATE automation_contacts SET status = 'completed' WHERE subscriber_id = ? AND automation_id = ?`,
                        [subscriber_id, automation_id]
                    );
                }
                break;

            case 'goalNode':
                // Record the conversion and stop the workflow
                const conversionValue = parseFloat(currentNode.data.conversionValue || 0);
                
                await db.query(
                    `UPDATE automation_contacts SET status = 'goal_achieved' WHERE subscriber_id = ? AND automation_id = ?`,
                    [subscriber_id, automation_id]
                );

                await db.query(
                    `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
                    [automation_id, subscriber_id, currentNode.id, `Goal Achieved: ${currentNode.data.label || 'Conversion'} (Value: $${conversionValue})`]
                );
                
                // If there is revenue, we can update an automation_goals table or custom_attributes
                // Let's add it to the subscriber's total revenue for this example
                if (conversionValue > 0) {
                    try {
                        const [subData] = await db.query(`SELECT custom_attributes FROM subscribers WHERE id = ?`, [subscriber_id]);
                        let customAttrs = {};
                        if (subData[0] && subData[0].custom_attributes) {
                            customAttrs = typeof subData[0].custom_attributes === 'string' ? JSON.parse(subData[0].custom_attributes) : subData[0].custom_attributes;
                        }
                        
                        const currentRevenue = parseFloat(customAttrs.ltv || 0) + conversionValue;
                        await db.query(`UPDATE subscribers SET custom_attributes = JSON_SET(COALESCE(custom_attributes, '{}'), '$.ltv', ?) WHERE id = ?`, [currentRevenue, subscriber_id]);
                    } catch (e) {
                        console.error("Failed to update LTV", e);
                    }
                }
                
                console.log(`Subscriber ${subscriber_id} achieved goal in automation ${automation_id} (Revenue: $${conversionValue})!`);
                return; // Workflow ends here

            default:
                console.log(`Unknown node type: ${currentNode.type}`);
        }

    } catch (error) {
        console.error("Error processing automation job:", error);
        await db.query(
            `UPDATE automation_contacts SET status = 'failed' WHERE subscriber_id = ? AND automation_id = ?`,
            [subscriber_id, automation_id]
        );
    }
}, { connection });

console.log("Automation Processor is running...");
