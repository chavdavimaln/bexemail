const db = require('../config/db');

exports.dispatchCampaign = async (req, res) => {
    const { name, subject, html_content, sender_id, list_id, is_ab_test, variant_b_subject, scheduled_at } = req.body;

    try {
        const scheduleDate = scheduled_at ? new Date(scheduled_at) : null;
        const initialStatus = scheduleDate ? 'scheduled' : 'sending';

        // 1. Insert the campaign into the 'campaigns' table
        const [campaignResult] = await db.query(
            `INSERT INTO campaigns (name, subject, html_content, sender_id, list_id, is_ab_test, variant_b_subject, scheduled_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, subject, html_content, sender_id, list_id, is_ab_test, variant_b_subject, scheduleDate, initialStatus]
        );
        const campaignId = campaignResult.insertId;

        // 2. Fetch all active subscribers from the selected audience list
        const [subscribers] = await db.query(
            `SELECT subscriber_id FROM subscriber_lists WHERE list_id = ?`,
            [list_id]
        );

        // 3. Bulk insert recipients into 'email_queue'
        if (subscribers.length > 0) {
            let queueData = [];
            
            if (is_ab_test) {
                // For A/B test, only queue 10% A and 10% B for now. The rest happens via cron.
                const tenPercent = Math.max(1, Math.floor(subscribers.length * 0.10));
                const groupA = subscribers.slice(0, tenPercent);
                const groupB = subscribers.slice(tenPercent, tenPercent * 2);
                queueData = [...groupA, ...groupB].map(sub => [sub.subscriber_id, campaignId, 'pending']);
            } else {
                queueData = subscribers.map(sub => [sub.subscriber_id, campaignId, 'pending']);
            }

            if (queueData.length > 0) {
                await db.query(
                    `INSERT INTO email_queue (recipient_id, campaign_id, status) VALUES ?`,
                    [queueData]
                );
            }
        }

        res.status(200).json({ message: "Campaign dispatched successfully", campaignId });
    } catch (error) {
        console.error("Dispatch Error:", error);
        res.status(500).json({ error: "Failed to dispatch campaign" });
    }
};
