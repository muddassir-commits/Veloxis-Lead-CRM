const path = require('path');
const fs = require('fs');

async function runSetupGuide() {
  console.log('================================================================');
  console.log('📬 VELOXIS GLOBAL — HOSTINGER EMAIL SMTP SETUP GUIDE');
  console.log('================================================================');
  console.log('You do NOT need Google Cloud Console or Gmail API. We will connect');
  console.log('directly to Hostinger SMTP using your professional email account:');
  console.log('muddassir@veloxisglobal.com');
  console.log('================================================================');
  
  console.log('\nSTEP 1: Retrieve Hostinger Email Password');
  console.log('----------------------------------------------------------------');
  console.log('1. Go to your Hostinger hPanel (https://hpanel.hostinger.com).');
  console.log('2. Navigate to "Emails" -> Choose "veloxisglobal.com".');
  console.log('3. Find "muddassir@veloxisglobal.com" in the list.');
  console.log('4. If you do not remember the password, click "Change Password" to reset it.');
  
  console.log('\nSTEP 2: Add Password to your CRM Config');
  console.log('----------------------------------------------------------------');
  console.log('1. Open your project folder.');
  console.log('2. Open the .env file:');
  console.log(`   [.env](file:///${path.resolve(__dirname, '../.env').replace(/\\/g, '/')})`);
  console.log('3. Set the SMTP_PASS variable to your password:');
  console.log('   SMTP_PASS=your_real_password_here');

  console.log('\nSTEP 3: Verify the SMTP Connection');
  console.log('----------------------------------------------------------------');
  console.log('1. Open your terminal.');
  console.log('2. Run the connection testing script:');
  console.log('   npm run test:email');
  console.log('3. Check your inbox (or spam) to verify receipt.');

  console.log('\nSTEP 4: Review IMAP Sync in Gmail App (Optional, Already Done!)');
  console.log('----------------------------------------------------------------');
  console.log('Since you connected muddassir@veloxisglobal.com to your personal');
  console.log('Gmail (theofficialmuddassir@gmail.com) via IMAP:');
  console.log('- Any automated cold emails sent from the CRM will show up in the Sent folder.');
  console.log('- All prospect replies will automatically sync into your Gmail client.');
  console.log('You can do all manual replies right from your phone!');
  console.log('================================================================\n');
}

runSetupGuide();
