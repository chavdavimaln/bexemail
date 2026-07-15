async function testApi() {
  try {
    const res = await fetch('http://localhost:5000/api/history', {
      headers: { 'x-user-role': 'Super Admin' }
    });
    const logs = await res.json();
    const log = logs.find(l => l.action === 'delete' && l.table_name === 'campaigns');
    if (!log) {
      console.log('No delete log found for campaigns');
      return;
    }
    console.log(`Found log ID ${log.id} for campaign ID ${log.record_id}. Attempting restore...`);
    
    const restoreRes = await fetch(`http://localhost:5000/api/history/${log.id}/restore`, {
      method: 'POST',
      headers: { 'x-user-role': 'Super Admin' }
    });
    
    const data = await restoreRes.json();
    if (restoreRes.ok) {
      console.log('Restore succeeded!');
    } else {
      console.error('RESTORE FAILED:', data);
    }
  } catch (err) {
    console.error('Network Error:', err.message);
  }
}
testApi();
