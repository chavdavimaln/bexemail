const pool = require('../config/db');

exports.getPreferences = async (req, res) => {
  const { subscriberId } = req.params;

  try {
    // 1. Get subscriber details
    const [subscribers] = await pool.query(
      `SELECT id, email, first_name, last_name, status FROM subscribers WHERE id = ?`,
      [subscriberId]
    );

    if (subscribers.length === 0) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    // 2. Get all public lists
    const [allLists] = await pool.query(`SELECT id, name, description FROM lists`);

    // 3. Get subscriber's active lists
    const [userLists] = await pool.query(
      `SELECT list_id FROM subscriber_lists WHERE subscriber_id = ?`,
      [subscriberId]
    );
    const activeListIds = userLists.map(row => row.list_id);

    // Format the response
    const preferences = allLists.map(list => ({
      id: list.id,
      name: list.name,
      description: list.description,
      isSubscribed: activeListIds.includes(list.id)
    }));

    res.json({
      subscriber: subscribers[0],
      preferences
    });

  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
};

exports.updatePreferences = async (req, res) => {
  const { subscriberId } = req.params;
  const { listIds, globalUnsubscribe } = req.body; // listIds = array of lists the user wants to STAY on

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (globalUnsubscribe) {
      // Hard unsubscribe
      await connection.query(
        `UPDATE subscribers SET status = 'unsubscribed' WHERE id = ?`,
        [subscriberId]
      );
      // Optional: Clear their list memberships
      await connection.query(
        `DELETE FROM subscriber_lists WHERE subscriber_id = ?`,
        [subscriberId]
      );
    } else {
      // 1. Re-subscribe them if they were unsubscribed
      await connection.query(
        `UPDATE subscribers SET status = 'subscribed' WHERE id = ?`,
        [subscriberId]
      );

      // 2. Clear all current list memberships
      await connection.query(
        `DELETE FROM subscriber_lists WHERE subscriber_id = ?`,
        [subscriberId]
      );

      // 3. Insert new memberships
      if (listIds && listIds.length > 0) {
        const insertData = listIds.map(id => [subscriberId, id]);
        await connection.query(
          `INSERT INTO subscriber_lists (subscriber_id, list_id) VALUES ?`,
          [insertData]
        );
      }
    }

    await connection.commit();
    res.json({ message: 'Preferences updated successfully' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  } finally {
    if (connection) connection.release();
  }
};
