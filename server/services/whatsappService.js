const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/**
 * Sends a WhatsApp message notification using the CallMeBot API.
 * Falls back to console log printout if the credentials are not set.
 * @param {string} text - Message content to send
 * @returns {Promise<Object>} Status result
 */
async function sendWhatsAppMessage(text) {
  const apiKey = process.env.CALLMEBOT_API_KEY;
  const phone = process.env.WHATSAPP_PHONE || '+918887620727';

  if (!apiKey || apiKey === 'your_apikey_here' || apiKey === '') {
    console.log('\n========================================');
    console.log('⚠️ CALLMEBOT_API_KEY not configured in .env. Logging WhatsApp Message:');
    console.log(text);
    console.log('========================================\n');
    return { success: false, error: 'API key missing' };
  }

  // Format phone number to clean string with + prefix
  let formattedPhone = phone.trim().replace(/[^0-9+]/g, '');
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }

  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${formattedPhone}&text=${encodeURIComponent(text)}&apikey=${apiKey}`;
    const response = await fetch(url);
    
    if (response.ok) {
      console.log(`📱 WhatsApp notification sent to ${formattedPhone} successfully.`);
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error(`❌ WhatsApp notification failed: ${response.status} - ${errorText}`);
      return { success: false, error: errorText };
    }
  } catch (err) {
    console.error('❌ WhatsApp dispatch exception:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendWhatsAppMessage
};
