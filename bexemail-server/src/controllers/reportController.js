const db = require('../config/db');

exports.getCampaignReport = async (req, res) => {
    const { campaignId } = req.params;
    try {
        const [report] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM email_queue WHERE campaign_id = ? AND status = 'sent') as delivered,
                (SELECT COUNT(*) FROM campaign_opens WHERE campaign_id = ?) as opens,
                (SELECT COUNT(*) FROM campaign_clicks WHERE campaign_id = ?) as clicks
            FROM campaigns WHERE id = ?`, 
            [campaignId, campaignId, campaignId, campaignId]
        );
        res.status(200).json(report[0]);
    } catch (error) {
        console.error("Failed to fetch analytics:", error);
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
};
