const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Dynamic selection between Brevo SMTP and Hostinger SMTP
const useBrevo = process.env.BREVO_API_KEY && 
                 process.env.BREVO_API_KEY !== 'your_brevo_api_key_here' && 
                 process.env.BREVO_API_KEY !== '';

const host = useBrevo ? 'smtp-relay.brevo.com' : (process.env.SMTP_HOST || 'smtp.hostinger.com');
const port = useBrevo ? 587 : parseInt(process.env.SMTP_PORT || '465');
const secure = useBrevo ? false : (process.env.SMTP_SECURE === 'true'); // TLS (587) uses secure=false, SSL (465) uses secure=true
const user = useBrevo ? (process.env.BREVO_SENDER_EMAIL || 'muddassir@veloxisglobal.com') : (process.env.SMTP_USER || 'muddassir@veloxisglobal.com');
const pass = useBrevo ? process.env.BREVO_API_KEY : process.env.SMTP_PASS;

let transporter;

try {
  console.log(`✉️ Initializing Mail Transporter via ${useBrevo ? 'Brevo SMTP Relay' : 'Hostinger SMTP'} (${host}:${port})`);
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100
  });
} catch (error) {
  console.error('❌ Nodemailer initialization failed:', error.message);
}

/**
 * Send an email using Hostinger SMTP
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @param {string} [options.trackerId] - Optional tracking pixel ID to embed
 * @returns {Promise<Object>} - Nodemailer send result
 */
async function sendMail({ to, subject, text, html, trackerId }) {
  if (!pass) {
    throw new Error('SMTP password is not set in environment variables.');
  }

  // If a trackerId is provided, embed an invisible tracking pixel at the bottom of the HTML
  let finalHtml = html;
  if (trackerId && html) {
    // Generate tracking image URL. When deployed, it should point to Render backend URL.
    // In local development, if BACKEND_URL is still pointing to the default Render host, fallback to localhost.
    // In production, default to process.env.BACKEND_URL or fallback to Render production host.
    const isDev = process.env.NODE_ENV !== 'production';
    const isDefaultRenderUrl = process.env.BACKEND_URL && process.env.BACKEND_URL.includes('onrender.com');
    
    const backendUrl = isDev
      ? (isDefaultRenderUrl ? `http://localhost:${process.env.PORT || 5000}` : (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`))
      : (process.env.BACKEND_URL || 'https://veloxis-outreach-api.onrender.com');
    
    const trackingPixelUrl = `${backendUrl}/track/${trackerId}.gif`;
    
    // Embed tracking pixel before the closing body tag or at the end
    if (finalHtml.includes('</body>')) {
      finalHtml = finalHtml.replace('</body>', `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="" /></body>`);
    } else {
      finalHtml = `${finalHtml}<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="" />`;
    }
  }

  const mailOptions = {
    from: `"${process.env.SMTP_SENDER_NAME || 'Muddassir Ali'}" <${user}>`,
    to,
    subject,
    text,
    html: finalHtml
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email successfully sent to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, info };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test SMTP connection
 */
async function testSMTPConnection() {
  try {
    await transporter.verify();
    return { success: true, message: 'SMTP connection verified successfully!' };
  } catch (error) {
    console.error('❌ SMTP verification failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendMail,
  testSMTPConnection
};
