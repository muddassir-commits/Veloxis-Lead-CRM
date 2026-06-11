const dns = require('dns').promises;

// List of common disposable email domains
const disposableDomains = new Set([
  'mailinator.com', 'tempmail.com', 'yopmail.com', 'guerrillamail.com',
  '10minutemail.com', 'getairmail.com', 'dispostable.com', 'sharklasers.com',
  'temp-mail.org', 'maildrop.cc', 'throwawaymail.com', 'burnermail.io'
]);

/**
 * Validates the syntax of an email address
 * @param {string} email 
 * @returns {boolean}
 */
function validateSyntax(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

/**
 * Verifies an email address using syntax checks, blacklist filters, and MX DNS lookup.
 * @param {string} email - The email to verify.
 * @returns {Promise<Object>} - Validation report.
 */
async function verifyEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, reason: 'Invalid or missing email string' };
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Check syntax
  if (!validateSyntax(cleanEmail)) {
    return { isValid: false, reason: 'Invalid email syntax format' };
  }

  const [, domain] = cleanEmail.split('@');

  // 2. Check disposable list
  if (disposableDomains.has(domain)) {
    return { isValid: false, reason: 'Disposable/Temporary email service provider' };
  }

  // 3. DNS MX Record Lookup
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { isValid: false, reason: 'No DNS MX records found (Domain cannot receive emails)' };
    }
    // Return success report
    return {
      isValid: true,
      reason: 'Valid email format & domain MX records authenticated',
      domain,
      mxRecords: mxRecords.map(r => r.exchange)
    };
  } catch (err) {
    console.error(`DNS lookup failed for ${domain}:`, err.message);
    return { isValid: false, reason: `Domain DNS lookup failed: ${err.code || err.message}` };
  }
}

module.exports = {
  verifyEmail,
  validateSyntax
};
