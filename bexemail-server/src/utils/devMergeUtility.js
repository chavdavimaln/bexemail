const pool = require('../config/db');

/**
 * Utility for developers to manually merge or reassign data between Admin accounts.
 * Safely preserves unique IDs, updates admin_id, admin_email, domain_name, and smtp_email associations.
 */
async function mergeAdminData(sourceAdminId, targetAdminId) {
  if (!sourceAdminId || !targetAdminId) {
    throw new Error('Both sourceAdminId and targetAdminId are required for data merge');
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Get target Admin email
    const [targetUsers] = await connection.query('SELECT id, email FROM admin_users WHERE id = ?', [targetAdminId]);
    if (targetUsers.length === 0) {
      throw new Error(`Target Admin user #${targetAdminId} not found`);
    }
    const targetEmail = targetUsers[0].email;

    // Fetch target admin primary domain and smtp
    const [targetDomains] = await connection.query('SELECT domain_name FROM registered_domains WHERE admin_id = ? LIMIT 1', [targetAdminId]);
    const targetDomain = targetDomains.length > 0 ? targetDomains[0].domain_name : null;

    const [targetSenders] = await connection.query('SELECT id, email FROM senders WHERE admin_id = ? LIMIT 1', [targetAdminId]);
    const targetSmtpEmail = targetSenders.length > 0 ? targetSenders[0].email : null;
    const targetSmtpId = targetSenders.length > 0 ? targetSenders[0].id : null;

    // 2. Reassign Subscribers
    const [subRes] = await connection.query(
      'UPDATE subscribers SET admin_id = ?, admin_email = ?, domain_name = COALESCE(domain_name, ?), smtp_email = COALESCE(smtp_email, ?) WHERE admin_id = ?',
      [targetAdminId, targetEmail, targetDomain, targetSmtpEmail, sourceAdminId]
    );

    // 3. Reassign Campaigns
    const [campRes] = await connection.query(
      'UPDATE campaigns SET admin_id = ?, admin_email = ?, domain_name = COALESCE(domain_name, ?), smtp_id = COALESCE(smtp_id, ?), smtp_email = COALESCE(smtp_email, ?) WHERE admin_id = ?',
      [targetAdminId, targetEmail, targetDomain, targetSmtpId, targetSmtpEmail, sourceAdminId]
    );

    // 4. Reassign Templates
    const [tplRes] = await connection.query(
      'UPDATE templates SET admin_id = ?, admin_email = ?, domain_name = COALESCE(domain_name, ?) WHERE admin_id = ? AND is_predesigned = 0',
      [targetAdminId, targetEmail, targetDomain, sourceAdminId]
    );

    // 5. Reassign Target Lists
    const [listRes] = await connection.query(
      'UPDATE lists SET admin_id = ?, admin_email = ?, domain_name = COALESCE(domain_name, ?) WHERE admin_id = ?',
      [targetAdminId, targetEmail, targetDomain, sourceAdminId]
    );

    // 6. Reassign Senders (SMTP)
    const [sndRes] = await connection.query(
      'UPDATE senders SET admin_id = ?, admin_email = ?, domain_name = COALESCE(domain_name, ?) WHERE admin_id = ?',
      [targetAdminId, targetEmail, targetDomain, sourceAdminId]
    );

    // 7. Reassign Registered Domains
    const [domRes] = await connection.query(
      'UPDATE registered_domains SET admin_id = ?, admin_email = ? WHERE admin_id = ?',
      [targetAdminId, targetEmail, sourceAdminId]
    );

    await connection.commit();

    return {
      success: true,
      sourceAdminId,
      targetAdminId,
      targetAdminEmail: targetEmail,
      mergedCount: {
        subscribers: subRes.affectedRows,
        campaigns: campRes.affectedRows,
        templates: tplRes.affectedRows,
        lists: listRes.affectedRows,
        senders: sndRes.affectedRows,
        domains: domRes.affectedRows
      }
    };
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  mergeAdminData
};
