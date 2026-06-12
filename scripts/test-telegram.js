const path = require('path');
const telegramService = require('../server/services/telegramService');

async function testTelegram() {
  console.log('📱 Testing Telegram notification setup via CallMeBot...');
  
  const text = `🎉 *Veloxis CRM Telegram Setup Verified!*
Congratulations! Your CallMeBot Telegram integration is working perfectly. 

📅 Tested at: ${new Date().toLocaleString()}`;
  
  const result = await telegramService.sendTelegramMessage(text);
  
  if (result.success) {
    console.log('\n✅ TEST SUCCESSFUL! Check your Telegram for the verification message.');
  } else {
    console.log('\n❌ TEST FAILED:', result.error || 'Unknown error');
    console.log('Please ensure TELEGRAM_USERNAME is set correctly in your .env file and you have started the @CallMeBot_txtbot.');
  }
}

testTelegram();
