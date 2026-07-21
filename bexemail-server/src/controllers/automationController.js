const db = require('../config/db');

const parseJson = (value, fallback) => {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

// GET /api/automations/templates - Database-backed workflow templates
exports.getAutomationTemplates = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, slug, name, description, category, icon_key, color_key,
                   is_popular, trigger_type, workflow_json, updated_at
            FROM automation_templates
            ORDER BY is_popular DESC, name ASC
        `);
        res.status(200).json(rows.map(row => ({
            ...row,
            workflow_graph: parseJson(row.workflow_json, { nodes: [], edges: [] })
        })));
    } catch (error) {
        console.error('Failed to fetch automation templates:', error);
        res.status(500).json({ error: 'Failed to fetch automation templates' });
    }
};

// POST /api/automations/templates/:templateId/use - Create a persisted draft from a template
exports.createFromTemplate = async (req, res) => {
    try {
        const [templates] = await db.query(
            'SELECT name, trigger_type, workflow_json FROM automation_templates WHERE id = ?',
            [req.params.templateId]
        );
        if (templates.length === 0) return res.status(404).json({ error: 'Automation template not found' });

        const template = templates[0];
        const [result] = await db.query(
            `INSERT INTO automations (name, status, trigger_type, reentry_policy, workflow_json)
             VALUES (?, 'draft', ?, ?, ?)`,
            [template.name, template.trigger_type, JSON.stringify({ allowReentry: true, cooldownDays: 7 }), template.workflow_json]
        );
        res.status(201).json({ id: result.insertId, message: 'Automation created from template' });
    } catch (error) {
        console.error('Failed to create automation from template:', error);
        res.status(500).json({ error: 'Failed to create automation from template' });
    }
};

// GET /api/automations/builder-options - All database-backed selector data for the builder
exports.getBuilderOptions = async (req, res) => {
    try {
        const [[products], [subscriberTags], [automations], [lists], [emailTemplates]] = await Promise.all([
            db.query('SELECT id, external_id, name, price FROM automation_products WHERE is_active = TRUE ORDER BY name'),
            db.query("SELECT tags FROM subscribers WHERE tags IS NOT NULL AND tags <> ''"),
            db.query("SELECT id, name FROM automations WHERE status <> 'archived' ORDER BY name"),
            db.query('SELECT id, name FROM lists WHERE COALESCE(is_deleted, 0) = 0 ORDER BY name'),
            db.query('SELECT id, template_name AS name, category FROM templates ORDER BY template_name')
        ]);

        const tags = [...new Set(subscriberTags.flatMap(row => {
            const parsed = parseJson(row.tags, []);
            if (Array.isArray(parsed)) return parsed.map(tag => String(tag).trim()).filter(Boolean);
            return String(row.tags).split(',').map(tag => tag.trim()).filter(Boolean);
        }))].sort((a, b) => a.localeCompare(b));

        res.status(200).json({ products, tags, automations, lists, emailTemplates });
    } catch (error) {
        console.error('Failed to fetch automation builder options:', error);
        res.status(500).json({ error: 'Failed to fetch automation builder options' });
    }
};

// POST /api/automations/ai-generate - Generate a graph and persist the generation record
exports.generateWorkflow = async (req, res) => {
    try {
        const prompt = String(req.body.prompt || '').trim();
        if (!prompt) return res.status(400).json({ error: 'Describe the workflow you want to generate' });

        const [products] = await db.query('SELECT id, name FROM automation_products WHERE is_active = TRUE ORDER BY id LIMIT 1');
        const lowerPrompt = prompt.toLowerCase();
        const isCartFlow = lowerPrompt.includes('cart');
        const isPurchaseFlow = lowerPrompt.includes('purchase') || lowerPrompt.includes('product');
        const delayHours = lowerPrompt.match(/(\d+)\s*hour/)?.[1];
        const delayDays = lowerPrompt.match(/(\d+)\s*day/)?.[1];
        const delayTime = Number(delayHours || delayDays || 2);
        const delayUnit = delayHours ? 'hours' : 'days';
        const triggerLabel = isCartFlow ? 'Abandoned cart' : (isPurchaseFlow ? 'Buys a specific product' : 'Subscriber joins list');
        const selectedProduct = products[0]?.id || null;

        const graph = {
            nodes: [
                { id: 'generated_trigger', type: 'triggerNode', position: { x: 280, y: 50 }, data: { label: triggerLabel, selectedProduct } },
                { id: 'generated_email', type: 'emailNode', position: { x: 280, y: 200 }, data: { label: 'Send first email', subject: isCartFlow ? 'You left something behind' : 'Welcome — here is what comes next' } },
                { id: 'generated_delay', type: 'delayNode', position: { x: 280, y: 350 }, data: { label: `Wait ${delayTime} ${delayUnit}`, delayTime, delayUnit } },
                { id: 'generated_condition', type: 'ifElseNode', position: { x: 280, y: 500 }, data: { label: isCartFlow ? 'Purchase completed?' : 'Email opened?', conditionField: 'Tag', operator: 'equals' } }
            ],
            edges: [
                { id: 'generated_edge_1', source: 'generated_trigger', target: 'generated_email' },
                { id: 'generated_edge_2', source: 'generated_email', target: 'generated_delay' },
                { id: 'generated_edge_3', source: 'generated_delay', target: 'generated_condition' }
            ]
        };

        const [result] = await db.query(
            'INSERT INTO automation_generation_history (prompt, workflow_json) VALUES (?, ?)',
            [prompt, JSON.stringify(graph)]
        );
        res.status(200).json({ generationId: result.insertId, name: 'Generated Automation', workflow_graph: graph });
    } catch (error) {
        console.error('Failed to generate workflow:', error);
        res.status(500).json({ error: 'Failed to generate workflow' });
    }
};

// GET /api/automations - Fetch all automations for the list page
exports.getAutomations = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT a.id, a.name, a.status, a.trigger_type, a.updated_at,
                   (SELECT COUNT(*) FROM automation_contacts ac WHERE ac.automation_id = a.id AND ac.status IN ('processing', 'waiting')) as active_contacts,
                   (SELECT COUNT(*) FROM automation_contacts ac WHERE ac.automation_id = a.id AND ac.status = 'completed') as completed_contacts
            FROM automations a
            ORDER BY a.updated_at DESC
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching automations:", error);
        res.status(500).json({ error: "Failed to fetch automations" });
    }
};

// GET /api/automations/:id - Fetch single automation
exports.getAutomation = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM automations WHERE id = ?`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Automation not found" });
        const automation = rows[0];
        const workflowGraph = parseJson(automation.workflow_json, { nodes: [], edges: [] });
        const reentryPolicy = parseJson(automation.reentry_policy, {});
        res.status(200).json({ ...automation, workflow_graph: workflowGraph, reentry_policy: reentryPolicy });
    } catch (error) {
        console.error("Error fetching automation:", error);
        res.status(500).json({ error: "Failed to fetch automation" });
    }
};

// POST /api/automations - Create new automation (Wizard Step 1)
exports.createAutomation = async (req, res) => {
    const { name, trigger_type, audience_id, reentry_policy, workflow_graph } = req.body;
    
    try {
        // Create an empty valid React Flow graph
        const graph = workflow_graph || { nodes: [], edges: [] };
        
        const [result] = await db.query(
            `INSERT INTO automations (name, status, trigger_type, audience_id, reentry_policy, workflow_json) VALUES (?, 'draft', ?, ?, ?, ?)`,
            [name || 'Untitled Automation', trigger_type || 'custom', audience_id || null, JSON.stringify(reentry_policy || {}), JSON.stringify(graph)]
        );
        res.status(201).json({ message: "Automation created successfully", id: result.insertId });
    } catch (error) {
        console.error("Error creating automation:", error);
        res.status(500).json({ error: "Failed to create automation" });
    }
};

// PUT /api/automations/:id - Update automation graph and settings
exports.updateAutomation = async (req, res) => {
    const { id } = req.params;
    const { name, trigger_type, audience_id, reentry_policy, workflow_graph } = req.body;

    try {
        // Build dynamic update query
        let query = "UPDATE automations SET ";
        let params = [];
        
        if (name !== undefined) { query += "name = ?, "; params.push(name); }
        if (trigger_type !== undefined) { query += "trigger_type = ?, "; params.push(trigger_type); }
        if (audience_id !== undefined) { query += "audience_id = ?, "; params.push(audience_id); }
        if (reentry_policy !== undefined) { query += "reentry_policy = ?, "; params.push(JSON.stringify(reentry_policy)); }
        if (workflow_graph !== undefined) { query += "workflow_json = ?, "; params.push(JSON.stringify(workflow_graph)); }
        
        // Remove trailing comma and space
        query = query.slice(0, -2);
        query += " WHERE id = ?";
        params.push(id);

        if (params.length > 1) {
            await db.query(query, params);
        }

        res.status(200).json({ message: "Automation updated successfully" });
    } catch (error) {
        console.error("Error updating automation:", error);
        res.status(500).json({ error: "Failed to update automation" });
    }
};

// POST /api/automations/:id/activate
exports.activateAutomation = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query(`SELECT workflow_json FROM automations WHERE id = ?`, [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Automation not found" });

        let graph = rows[0].workflow_json || {};
        if (typeof graph === 'string') graph = JSON.parse(graph);
        const nodes = graph.nodes || [];
        const hasTrigger = nodes.some(n => n.type === 'triggerNode' || n.type === 'trigger');
        const hasAction = nodes.some(n => ['emailNode', 'actionNode', 'email', 'action'].includes(n.type));

        if (!hasTrigger || !hasAction) {
            return res.status(400).json({ 
                error: "Validation failed. A workflow must contain at least one Trigger and one Action." 
            });
        }

        // Get latest version number
        const [versionRows] = await db.query(`SELECT MAX(version_number) as max_version FROM automation_versions WHERE automation_id = ?`, [id]);
        const nextVersion = (versionRows[0].max_version || 0) + 1;

        // Save new version
        await db.query(
            `INSERT INTO automation_versions (automation_id, version_number, workflow_graph) VALUES (?, ?, ?)`,
            [id, nextVersion, JSON.stringify(graph)]
        );

        await db.query(`UPDATE automations SET status = 'active' WHERE id = ?`, [id]);
        res.status(200).json({ message: "Automation activated successfully", version: nextVersion });
    } catch (error) {
        console.error("Error activating automation:", error);
        res.status(500).json({ error: "Failed to activate automation" });
    }
};

// PUT /api/automations/:id/publish (Legacy support)
exports.publishAutomation = exports.activateAutomation;

exports.saveDraft = exports.createAutomation; // Legacy support

// POST /api/automations/:id/pause
exports.pauseAutomation = async (req, res) => {
    try {
        await db.query(`UPDATE automations SET status = 'paused' WHERE id = ?`, [req.params.id]);
        await db.query(`UPDATE automation_contacts SET status = 'paused' WHERE automation_id = ? AND status IN ('processing', 'waiting')`, [req.params.id]);
        res.status(200).json({ message: "Automation paused" });
    } catch (error) {
        res.status(500).json({ error: "Failed to pause automation" });
    }
};

// POST /api/automations/:id/resume
exports.resumeAutomation = async (req, res) => {
    try {
        await db.query(`UPDATE automations SET status = 'active' WHERE id = ?`, [req.params.id]);
        await db.query(`UPDATE automation_contacts SET status = 'processing' WHERE automation_id = ? AND status = 'paused'`, [req.params.id]);
        res.status(200).json({ message: "Automation resumed" });
    } catch (error) {
        res.status(500).json({ error: "Failed to resume automation" });
    }
};

// POST /api/automations/:id/stop
exports.stopAutomation = async (req, res) => {
    try {
        await db.query(`UPDATE automations SET status = 'stopped' WHERE id = ?`, [req.params.id]);
        await db.query(`UPDATE automation_contacts SET status = 'exited' WHERE automation_id = ? AND status IN ('processing', 'waiting', 'paused')`, [req.params.id]);
        res.status(200).json({ message: "Automation stopped" });
    } catch (error) {
        res.status(500).json({ error: "Failed to stop automation" });
    }
};

// GET /api/automations/:id/contacts
exports.getAutomationContacts = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ac.*, s.email, s.first_name, NULL as last_name
            FROM automation_contacts ac
            JOIN subscribers s ON ac.subscriber_id = s.id
            WHERE ac.automation_id = ?
            ORDER BY ac.updated_at DESC
        `, [req.params.id]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching automation contacts:", error);
        res.status(500).json({ error: "Failed to fetch automation contacts" });
    }
};

// GET /api/automations/:id/logs
exports.getAutomationLogs = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT al.*, s.email, s.first_name, NULL as last_name
            FROM automation_logs al
            LEFT JOIN subscribers s ON al.subscriber_id = s.id
            WHERE al.automation_id = ?
            ORDER BY al.timestamp DESC
        `, [req.params.id]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching automation logs:", error);
        res.status(500).json({ error: "Failed to fetch automation logs" });
    }
};

// GET /api/automations/:id/logs/:subscriberId
exports.getContactJourneyLogs = async (req, res) => {
    try {
        const [logs] = await db.query(`
            SELECT node_id, action_taken, status, error_message, timestamp 
            FROM automation_logs 
            WHERE automation_id = ? AND subscriber_id = ?
            ORDER BY timestamp DESC
        `, [req.params.id, req.params.subscriberId]);
        res.status(200).json(logs);
    } catch (error) {
        console.error("Error fetching logs:", error);
        res.status(500).json({ error: "Failed to fetch contact journey logs" });
    }
};

// POST /api/automations/:id/duplicate
exports.duplicateAutomation = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM automations WHERE id = ?`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Automation not found" });
        
        const original = rows[0];
        const newName = `${original.name} (Copy)`;
        
        const [result] = await db.query(
            `INSERT INTO automations (name, status, trigger_type, audience_id, reentry_policy, workflow_json) VALUES (?, 'draft', ?, ?, ?, ?)`,
            [newName, original.trigger_type, original.audience_id, original.reentry_policy || JSON.stringify({}), original.workflow_json || JSON.stringify({ nodes: [], edges: [] })]
        );
        
        res.status(201).json({ message: "Automation duplicated", id: result.insertId });
    } catch (error) {
        console.error("Error duplicating automation:", error);
        res.status(500).json({ error: "Failed to duplicate automation" });
    }
};

// POST /api/automations/:id/contacts/:contactId/retry
exports.retryContactStep = async (req, res) => {
    const { id, contactId } = req.params;
    try {
        await db.query(`UPDATE automation_contacts SET status = 'processing', next_execution_time = NOW() WHERE id = ? AND automation_id = ?`, [contactId, id]);
        // Note: The actual cron or a specific bullmq job should pick this up or we should add it directly to queue here
        res.status(200).json({ message: "Contact queued for retry" });
    } catch (error) {
        res.status(500).json({ error: "Failed to retry contact" });
    }
};

// GET /api/automations/:id/reports/nodes
exports.getNodeReports = async (req, res) => {
    try {
        // Aggregate statistics per node (e.g., how many passed through, how many failed)
        const [rows] = await db.query(`
            SELECT node_id, status, COUNT(*) as count 
            FROM automation_logs 
            WHERE automation_id = ?
            GROUP BY node_id, status
        `, [req.params.id]);
        
        const reports = rows.reduce((acc, row) => {
            if (!acc[row.node_id]) acc[row.node_id] = { total: 0, success: 0, failed: 0 };
            acc[row.node_id].total += row.count;
            if (row.status === 'success') acc[row.node_id].success += row.count;
            if (row.status === 'failed') acc[row.node_id].failed += row.count;
            return acc;
        }, {});
        
        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ error: "Failed to get node reports" });
    }
};

// GET /api/automations/:id/versions
exports.getAutomationVersions = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, version_number, published_at, created_by 
            FROM automation_versions 
            WHERE automation_id = ? 
            ORDER BY version_number DESC
        `, [req.params.id]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: "Failed to get versions" });
    }
};

// POST /api/automations/:id/versions/:versionId/restore
exports.restoreVersion = async (req, res) => {
    const { id, versionId } = req.params;
    try {
        const [versions] = await db.query(`SELECT workflow_graph FROM automation_versions WHERE id = ? AND automation_id = ?`, [versionId, id]);
        if (versions.length === 0) return res.status(404).json({ error: "Version not found" });
        
        const graph = versions[0].workflow_graph;
        await db.query(`UPDATE automations SET workflow_json = ? WHERE id = ?`, [typeof graph === 'string' ? graph : JSON.stringify(graph), id]);
        
        res.status(200).json({ message: "Version restored successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to restore version" });
    }
};

// POST /api/automations/:id/test
exports.testAutomation = async (req, res) => {
    const { id } = req.params;
    const { subscriberId } = req.body;
    
    try {
        if (!subscriberId) return res.status(400).json({ error: 'Select a database contact for the test' });
        const [subscribers] = await db.query(
            'SELECT id, email, first_name, status FROM subscribers WHERE id = ?',
            [subscriberId]
        );
        if (subscribers.length === 0) return res.status(404).json({ error: 'Selected database contact was not found' });
        const testContact = subscribers[0];

        const [automations] = await db.query('SELECT workflow_json FROM automations WHERE id = ?', [id]);
        if (automations.length === 0) return res.status(404).json({ error: "Automation not found" });
        
        let graph = automations[0].workflow_json || {};
        if (typeof graph === 'string') graph = JSON.parse(graph);
        
        let nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        let edges = Array.isArray(graph.edges) ? graph.edges : [];

        // Convert workflows created by the original step-based editor.
        if (nodes.length === 0 && Array.isArray(graph.steps)) {
            const typeMap = {
                trigger: 'triggerNode',
                email: 'emailNode',
                action: 'actionNode',
                delay: 'delayNode',
                condition: 'ifElseNode'
            };
            nodes = graph.steps.map((step, index) => ({
                id: `legacy_${step.id ?? index}`,
                type: typeMap[step.type] || 'actionNode',
                data: {
                    ...step,
                    label: step.label || step.description || `Step ${index + 1}`
                }
            }));
            edges = nodes.slice(1).map((node, index) => ({
                id: `legacy_edge_${index}`,
                source: nodes[index].id,
                target: node.id
            }));
        }

        if (nodes.length === 0) {
            return res.status(400).json({ error: "Add at least one trigger before running a test." });
        }
        
        const simulatedLogs = [];
        let currentNode = nodes.find(n => n.type === 'triggerNode' || n.type === 'trigger');
        if (!currentNode) {
            return res.status(400).json({ error: "The workflow needs a trigger node before it can be tested." });
        }
        
        // Simple dry-run simulation
        let stepCount = 0;
        while (currentNode && stepCount < 20) { // arbitrary limit to prevent infinite loops in bad graphs
            simulatedLogs.push({
                node_id: currentNode.id,
                action: `Evaluated ${currentNode.type}: ${currentNode.data?.label || 'No label'}`,
                type: currentNode.type,
                contact: testContact.email,
                subscriber_id: testContact.id
            });
            
            // Advance to next node
            let nextEdge = edges.find(e => e.source === currentNode.id);
            if (currentNode.type === 'ifElseNode') {
                // For test, let's randomly pick true branch or default to target node
                nextEdge = edges.find(e => e.source === currentNode.id && e.sourceHandle === 'true') 
                           || edges.find(e => e.source === currentNode.id);
            } else if (currentNode.type === 'splitNode') {
                 nextEdge = edges.find(e => e.source === currentNode.id && e.sourceHandle === 'pathA') 
                           || edges.find(e => e.source === currentNode.id);
            }
            
            if (nextEdge) {
                currentNode = nodes.find(n => n.id === nextEdge.target);
            } else {
                currentNode = null;
            }
            stepCount++;
        }
        
        res.status(200).json({ message: "Dry run completed successfully", simulatedLogs });
    } catch (error) {
        console.error("Test automation error:", error);
        res.status(500).json({ error: "Failed to run test automation" });
    }
};

// GET /api/automations/dashboard-stats
exports.getDashboardStats = async (req, res) => {
    try {
        const [counts] = await db.query(`
            SELECT 
                COUNT(*) as totalAutomations,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeAutomations,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draftAutomations,
                SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as pausedAutomations
            FROM automations
        `);
        
        const [journeys] = await db.query(`
            SELECT 
                SUM(CASE WHEN status IN ('processing', 'waiting') THEN 1 ELSE 0 END) as contactsProcessing,
                SUM(CASE WHEN status IN ('completed', 'goal_achieved') THEN 1 ELSE 0 END) as completedJourneys,
                COUNT(*) as totalJourneys
            FROM automation_contacts
        `);

        const [activity] = await db.query(`
            SELECT
                SUM(CASE WHEN action_taken LIKE 'Queued email:%' THEN 1 ELSE 0 END) as emailsSent,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedSteps,
                SUM(CASE WHEN action_taken LIKE 'Goal Achieved:%' THEN 1 ELSE 0 END) as goalsAchieved,
                SUM(CASE WHEN action_taken LIKE 'Goal Achieved:%Value: $%' THEN
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(action_taken, 'Value: $', -1), ')', 1) AS DECIMAL(12,2))
                    ELSE 0 END) as revenue
            FROM automation_logs
        `);

        const cJourneys = Number(journeys[0].completedJourneys) || 0;
        const cTotal = Number(journeys[0].totalJourneys) || 0;
        const conversionRate = cTotal > 0 ? ((cJourneys / cTotal) * 100).toFixed(1) + '%' : '0%';
        const revenueValue = Number(activity[0].revenue) || 0;

        res.status(200).json({
            ...counts[0],
            contactsProcessing: Number(journeys[0].contactsProcessing) || 0,
            completedJourneys: cJourneys,
            emailsSent: Number(activity[0].emailsSent) || 0,
            failedSteps: Number(activity[0].failedSteps) || 0,
            conversionRate,
            revenue: '$' + revenueValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        });
    } catch (error) {
        console.error("Failed to get dashboard stats:", error);
        res.status(500).json({ error: "Failed to get dashboard stats" });
    }
};

// GET /api/automations/activity/recent
exports.getRecentActivity = async (req, res) => {
    try {
        const [logs] = await db.query(`
            SELECT 
                al.id, 
                al.automation_id,
                a.name as automation_name,
                CASE
                    WHEN al.status = 'failed' THEN 'error'
                    WHEN al.action_taken LIKE 'Queued email:%' THEN 'email_sent'
                    WHEN al.action_taken LIKE 'Goal Achieved:%' THEN 'goal_completed'
                    ELSE 'activity'
                END as event_type,
                al.action_taken as message,
                al.timestamp as created_at,
                s.first_name,
                NULL as last_name,
                s.email
            FROM automation_logs al
            JOIN automations a ON al.automation_id = a.id
            LEFT JOIN subscribers s ON al.subscriber_id = s.id
            ORDER BY al.timestamp DESC
            LIMIT 10
        `);
        res.status(200).json(logs);
    } catch (error) {
        console.error("Failed to fetch recent activity:", error);
        res.status(500).json({ error: "Failed to fetch recent activity" });
    }
};

// GET /api/automations/:id/stats
exports.getAutomationStats = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [contacts] = await db.query(`
            SELECT 
                COUNT(*) as totalEntered,
                SUM(CASE WHEN status IN ('completed', 'goal_achieved') THEN 1 ELSE 0 END) as completed
            FROM automation_contacts
            WHERE automation_id = ?
        `, [id]);

        const [logs] = await db.query(`
            SELECT
                COUNT(DISTINCT subscriber_id) as loggedContacts,
                SUM(CASE WHEN action_taken LIKE 'Queued email:%' THEN 1 ELSE 0 END) as emailsSent,
                SUM(CASE WHEN action_taken LIKE 'Goal Achieved:%' THEN 1 ELSE 0 END) as goalsAchieved,
                SUM(CASE WHEN action_taken LIKE 'Goal Achieved:%Value: $%' THEN
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(action_taken, 'Value: $', -1), ')', 1) AS DECIMAL(12,2))
                    ELSE 0 END) as revenue
            FROM automation_logs
            WHERE automation_id = ?
        `, [id]);
        
        const tEntered = contacts[0].totalEntered || logs[0].loggedContacts || 0;
        const tCompleted = contacts[0].completed || 0;
        const conversionRate = tEntered > 0 ? ((tCompleted / tEntered) * 100).toFixed(2) : 0;
        const totalRevenue = Number(logs[0].revenue) || 0;
        
        const [enteredByDay] = await db.query(`
            SELECT DATE(created_at) as day, COUNT(*) as count
            FROM automation_contacts
            WHERE automation_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(created_at)
        `, [id]);
        const [completedByDay] = await db.query(`
            SELECT DATE(COALESCE(completed_at, updated_at)) as day, COUNT(*) as count
            FROM automation_contacts
            WHERE automation_id = ?
              AND status IN ('completed', 'goal_achieved')
              AND COALESCE(completed_at, updated_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(COALESCE(completed_at, updated_at))
        `, [id]);
        const [goalsByDay] = await db.query(`
            SELECT DATE(timestamp) as day, COUNT(*) as count
            FROM automation_logs
            WHERE automation_id = ?
              AND action_taken LIKE 'Goal Achieved:%'
              AND timestamp >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(timestamp)
        `, [id]);

        const toDateKey = value => new Date(value).toISOString().slice(0, 10);
        const enteredMap = new Map(enteredByDay.map(row => [toDateKey(row.day), Number(row.count)]));
        const completedMap = new Map(completedByDay.map(row => [toDateKey(row.day), Number(row.count)]));
        const goalsMap = new Map(goalsByDay.map(row => [toDateKey(row.day), Number(row.count)]));
        const timeSeries = Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setHours(12, 0, 0, 0);
            date.setDate(date.getDate() - (6 - index));
            const key = date.toISOString().slice(0, 10);
            return {
                date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                entered: enteredMap.get(key) || 0,
                completed: completedMap.get(key) || 0,
                goals: goalsMap.get(key) || 0
            };
        });
        
        // Node stats
        const [nodeStats] = await db.query(`
            SELECT node_id, 
                   COUNT(*) as passed,
                   SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as dropped
            FROM automation_logs
            WHERE automation_id = ? AND node_id IS NOT NULL
            GROUP BY node_id
        `, [id]);
        
        const formattedNodes = nodeStats.map(n => ({
            name: n.node_id,
            passed: n.passed,
            dropped: n.dropped
        }));

        res.status(200).json({
            summary: {
                entered: tEntered,
                completed: tCompleted,
                emailsSent: logs[0].emailsSent || 0,
                goalsAchieved: logs[0].goalsAchieved || 0,
                conversionRate: parseFloat(conversionRate),
                totalRevenue
            },
            timeSeries,
            nodes: formattedNodes.length > 0 ? formattedNodes : [
                { name: 'Trigger', passed: tEntered, dropped: 0 }
            ]
        });
    } catch (error) {
        console.error("Failed to get automation stats:", error);
        res.status(500).json({ error: "Failed to get automation stats" });
    }
};
