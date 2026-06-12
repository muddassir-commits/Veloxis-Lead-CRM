const path = require('path');
const autoScheduler = require('../server/services/autoSchedulerService');

async function triggerLiveReport() {
  console.log('📊 Initializing Live Outreach Report Dispatch...');
  try {
    await autoScheduler.sendDailyReport();
    console.log('\n✅ Report dispatched successfully to Telegram!');
  } catch (err) {
    console.error('\n❌ Failed to dispatch live report:', err.message);
  }
}

triggerLiveReport();
