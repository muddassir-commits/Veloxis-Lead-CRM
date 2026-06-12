const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const sequenceService = require('../server/services/sequenceService');

console.log('================================================================');
console.log('⏰ VELOXIS AUTOMATED DAEMON RUNNER STARTED');
console.log('📡 Interval: Every 30 Seconds');
console.log('⚙️  Environment:', process.env.NODE_ENV || 'development');
console.log('================================================================');

// Run immediately on startup
runProcess();

// Set interval to run every 30 seconds
const intervalId = setInterval(runProcess, 30000);

async function runProcess() {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n[${timestamp}] ⏰ Checking for due outreach sequences...`);
  try {
    await sequenceService.processDueSequences();
    console.log(`[${timestamp}] ✅ Check and dispatch execution complete.`);
  } catch (err) {
    console.error(`[${timestamp}] ❌ Failed processing due sequences:`, err.message);
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\nStopping automated daemon runner...');
  clearInterval(intervalId);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nStopping automated daemon runner...');
  clearInterval(intervalId);
  process.exit(0);
});
