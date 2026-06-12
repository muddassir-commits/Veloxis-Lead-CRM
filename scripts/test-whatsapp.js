const path = require('path');
const whatsappService = require('../server/services/whatsappService');

async function testWhatsApp() {
  console.log('📱 Testing WhatsApp notification setup via CallMeBot...');
  
  const text = `🎉 *Veloxis CRM WhatsApp Setup Verified!*
Congratulations! Your CallMeBot API integration is working perfectly. 

📅 Tested at: ${new Date().toLocaleString()}`;
  
  const result = await whatsappService.sendWhatsAppMessage(text);
  
  if (result.success) {
    console.log('\n✅ TEST SUCCESSFUL! Check your WhatsApp for the verification message.');
  } else {
    console.log('\n❌ TEST FAILED:', result.error || 'Unknown error');
    console.log('Please ensure CALLMEBOT_API_KEY is correct in your .env file and that you have authorized the bot.');
  }
}

testWhatsApp();
