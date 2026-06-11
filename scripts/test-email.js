const path = require('path');
const emailService = require('../server/services/emailService');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runTest() {
  console.log('🧪 Starting Hostinger SMTP Connection Test...');
  console.log(`SMTP User: ${process.env.SMTP_USER || 'muddassir@veloxisglobal.com'}`);
  console.log(`SMTP Host: ${process.env.SMTP_HOST || 'smtp.hostinger.com'}`);
  
  if (!process.env.SMTP_PASS || process.env.SMTP_PASS === 'your_hostinger_email_password_here') {
    console.error('❌ Error: SMTP_PASS is not configured in your .env file.');
    console.log('👉 Please edit the .env file in the project root and add your Hostinger email password.');
    process.exit(1);
  }

  // Verify SMTP Connection
  const checkResult = await emailService.testSMTPConnection();
  if (!checkResult.success) {
    console.error('\n❌ SMTP Verification FAILED:', checkResult.error);
    console.log('\n💡 Troubleshoot tips:');
    console.log('1. Verify your Hostinger email password in .env is correct.');
    console.log('2. Check if Hostinger is experiencing any email outages.');
    console.log('3. Ensure ports 465 (SSL) or 587 (TLS) are not blocked by a local firewall/ISP.');
    process.exit(1);
  }

  console.log('\n✅ SMTP Connection verified successfully! Transporter is ready to send messages.');

  // Test send if recipient is specified in CLI arguments
  const testRecipient = process.argv[2] || process.env.SMTP_USER;
  console.log(`\n📧 Sending test email to: ${testRecipient}...`);

  const htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #6c63ff;">Veloxis Global Outreach Test</h2>
        <p>Hello Muddassir,</p>
        <p>This is a test email sent from your <strong>Veloxis Global Lead Generation Command Center</strong>.</p>
        <p>If you received this, it means your Hostinger SMTP setup is working 100% correctly and ready for cold outreach campaigns!</p>
        <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="font-size: 0.8em; color: #777;">Sent via Node.js + Nodemailer + Hostinger SMTP.</p>
      </body>
    </html>
  `;

  const sendResult = await emailService.sendMail({
    to: testRecipient,
    subject: '🚀 Veloxis Global CRM Test Email',
    html: htmlBody
  });

  if (sendResult.success) {
    console.log('🎉 Test email sent successfully!');
    console.log(`Message ID: ${sendResult.messageId}`);
    console.log('👉 Check your inbox (or spam folder) for the test mail.');
  } else {
    console.error('❌ Sending test email failed:', sendResult.error);
  }
}

runTest();
