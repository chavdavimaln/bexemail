const pool = require('../config/db');

// Transparent 1x1 GIF base64 encoded
const pixel = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Pixel tracking endpoint
exports.trackOpen = async (req, res) => {
  const { campaignId, subscriberId } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  
  // Very basic UA parsing (In production use a library like UAParser.js)
  const isMobile = /mobile|iphone|ipad|android/i.test(userAgent);
  const deviceType = isMobile ? 'Mobile' : 'Desktop';
  let browser = 'Unknown';
  if (/chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/safari/i.test(userAgent)) browser = 'Safari';
  else if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/edge/i.test(userAgent)) browser = 'Edge';

  try {
    // Check if already opened to avoid duplicate counts (optional, but good practice)
    const [existing] = await pool.query(
      `SELECT id FROM campaign_events WHERE campaign_id = ? AND subscriber_id = ? AND event_type = 'open'`,
      [campaignId, subscriberId]
    );

    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO campaign_events (campaign_id, subscriber_id, event_type, device_type, browser) VALUES (?, ?, 'open', ?, ?)`,
        [campaignId, subscriberId, deviceType, browser]
      );
    }
  } catch (error) {
    console.error('Tracking error:', error);
    // Don't fail the request, just swallow the error for tracking
  }

  // Always return the 1x1 pixel
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(pixel);
};

exports.getCampaignAnalytics = async (req, res) => {
  const { campaignId } = req.params;

  try {
    // Basic aggregation queries
    const [queueStats] = await pool.query(
      `SELECT status, COUNT(*) as count FROM email_queue WHERE campaign_id = ? GROUP BY status`,
      [campaignId]
    );
    
    let sent = 0, failed = 0, pending = 0, totalQueued = 0;
    queueStats.forEach(stat => {
      totalQueued += stat.count;
      if (stat.status === 'sent') sent = stat.count;
      if (stat.status === 'failed') failed = stat.count;
      if (stat.status === 'pending') pending = stat.count;
    });

    // Unique Opens
    const [openStats] = await pool.query(
      `SELECT COUNT(DISTINCT subscriber_id) as unique_opens, COUNT(*) as total_opens 
       FROM campaign_opens WHERE campaign_id = ?`,
      [campaignId]
    );

    // Clicks
    const [clickStats] = await pool.query(
      `SELECT COUNT(DISTINCT subscriber_id) as unique_clicks, COUNT(*) as total_clicks 
       FROM campaign_clicks WHERE campaign_id = ?`,
      [campaignId]
    );

    res.json({
      total_recipients: totalQueued,
      pending,
      sent,
      failed,
      unique_opens: openStats[0].unique_opens,
      total_opens: openStats[0].total_opens,
      unique_clicks: clickStats[0].unique_clicks,
      total_clicks: clickStats[0].total_clicks,
      open_rate: sent > 0 ? ((openStats[0].unique_opens / sent) * 100).toFixed(2) : 0,
      click_rate: sent > 0 ? ((clickStats[0].unique_clicks / sent) * 100).toFixed(2) : 0
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const getAdminId = require('../utils/getAdminId');
    const adminId = getAdminId(req);

    // 1. Subscriber Stats
    const [subStats] = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'subscribed' THEN 1 ELSE 0 END) as active
       FROM subscribers WHERE admin_id = ?`,
      [adminId]
    );

    // 2. Queue Stats
    const [queueStats] = await pool.query(
      `SELECT 
        SUM(CASE WHEN eq.status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN eq.status = 'pending' THEN 1 ELSE 0 END) as pending
       FROM email_queue eq
       JOIN campaigns c ON eq.campaign_id = c.id
       WHERE c.admin_id = ?`,
      [adminId]
    );

    // 3. Campaign Performance (Global Opens/Clicks)
    let timelineStats = [];
    try {
      const [rows] = await pool.query(
        `SELECT 
          date_series.d as date,
          COALESCE(o.opens, 0) as opens,
          COALESCE(c.clicks, 0) as clicks
         FROM (
           SELECT DATE(NOW() - INTERVAL n DAY) as d FROM (
             SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
           ) days
         ) date_series
         LEFT JOIN (
           SELECT DATE(co.created_at) as d, COUNT(*) as opens 
           FROM campaign_opens co
           JOIN campaigns cmp ON co.campaign_id = cmp.id
           WHERE cmp.admin_id = ?
           GROUP BY DATE(co.created_at)
         ) o ON date_series.d = o.d
         LEFT JOIN (
           SELECT DATE(cc.created_at) as d, COUNT(*) as clicks 
           FROM campaign_clicks cc
           JOIN campaigns cmp ON cc.campaign_id = cmp.id
           WHERE cmp.admin_id = ?
           GROUP BY DATE(cc.created_at)
         ) c ON date_series.d = c.d
         ORDER BY date_series.d DESC
         LIMIT 7`,
        [adminId, adminId]
      );
      timelineStats = rows;
    } catch (e) {
      console.warn('[Analytics] Campaign opens/clicks timeline query fallback:', e.message);
      timelineStats = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return { date: d.toISOString().split('T')[0], opens: 0, clicks: 0 };
      });
    }

    // 4. Recent Campaigns
    const [recentCampaigns] = await pool.query(
      `SELECT id, name, status, created_at FROM campaigns WHERE admin_id = ? ORDER BY created_at DESC LIMIT 5`,
      [adminId]
    );

    // 5. Recent Subscribers
    const [recentSubscribers] = await pool.query(
      `SELECT id, email, status, created_at FROM subscribers WHERE admin_id = ? ORDER BY created_at DESC LIMIT 5`,
      [adminId]
    );

    // 6. Recent Automations
    const [recentAutomations] = await pool.query(
      `SELECT id, name, status, created_at FROM automations WHERE admin_id = ? ORDER BY created_at DESC LIMIT 5`,
      [adminId]
    ).catch(() => [[], []]);

    // 7. Recent Lists
    const [recentLists] = await pool.query(
      `SELECT id, name, description, created_at FROM lists WHERE is_deleted = FALSE AND admin_id = ? ORDER BY created_at DESC LIMIT 5`,
      [adminId]
    );

    // Format for recharts
    const formattedTimeline = timelineStats.map(t => ({
      date: t.date.toISOString().split('T')[0],
      opens: parseInt(t.opens) || 0,
      clicks: parseInt(t.clicks) || 0,
      bounces: 0 // Mocking bounce rate since we just added the webhook
    })).reverse();

    res.json({
      subscribers: {
        total: subStats[0].total || 0,
        active: subStats[0].active || 0
      },
      emails: {
        sent: queueStats[0].sent || 0,
        pending: queueStats[0].pending || 0
      },
      timeline: formattedTimeline.length ? formattedTimeline : [
        { date: new Date().toISOString().split('T')[0], opens: 0, clicks: 0, bounces: 0 }
      ],
      recentCampaigns,
      recentSubscribers,
      recentAutomations,
      recentLists
    });

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
