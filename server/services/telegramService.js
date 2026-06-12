const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/**
 * Sends a Telegram message notification using the CallMeBot API.
 * Falls back to console log printout if username is not set.
 * @param {string} text - Message content to send
 * @returns {Promise<Object>} Status result
 */
async function sendTelegramMessage(text) {
  const username = process.env.TELEGRAM_USERNAME;

  if (!username || username === 'your_username_here' || username === '') {
    console.log('\n========================================');
    console.log('⚠️ TELEGRAM_USERNAME not configured in .env. Logging Telegram Message:');
    console.log(text);
    console.log('========================================\n');
    return { success: false, error: 'Telegram username missing' };
  }

  // Ensure username starts with @
  let cleanUsername = username.trim();
  if (!cleanUsername.startsWith('@')) {
    cleanUsername = '@' + cleanUsername;
  }

  try {
    // CallMeBot Telegram Text Message API format:
    // https://api.callmebot.com/text.php?user=[username]&text=[text]
    const url = `https://api.callmebot.com/text.php?user=${cleanUsername}&text=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    
    if (response.ok) {
      console.log(`📱 Telegram notification sent to ${cleanUsername} successfully.`);
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error(`❌ Telegram notification failed: ${response.status} - ${errorText}`);
      return { success: false, error: errorText };
    }
  } catch (err) {
    console.error('❌ Telegram dispatch exception:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendTelegramMessage
};
