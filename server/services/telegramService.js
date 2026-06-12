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
    // https://api.callmebot.com/text.php?user=${cleanUsername}&text=${encodeURIComponent(text)}
    const url = `https://api.callmebot.com/text.php?user=${cleanUsername}&text=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const responseText = await response.text();
    
    if (response.ok) {
      // CallMeBot returns 200 OK even for errors. Check body for "Error:" or "Permission denied".
      if (responseText.includes('Error:') || responseText.includes('Permission denied') || responseText.includes('Telegram Error Code')) {
        let errorMsg = 'Permission denied. User must authorize CallMeBot bot on Telegram.';
        if (responseText.includes('Authenticate')) {
          errorMsg += ' Click here to authenticate: https://api2.callmebot.com/txt/login.php';
        }
        console.error(`❌ Telegram notification delivery failed for ${cleanUsername}: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      console.log(`📱 Telegram notification sent to ${cleanUsername} successfully.`);
      return { success: true };
    } else {
      console.error(`❌ Telegram notification failed: ${response.status} - ${responseText}`);
      return { success: false, error: responseText };
    }
  } catch (err) {
    console.error('❌ Telegram dispatch exception:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendTelegramMessage
};
