const dns = require('dns').promises;
const supabase = require('./supabaseService');

/**
 * Logs verification/validation failure into the database settings table
 */
async function logVerificationFailure(email, reason) {
  try {
    const { data: existing } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'verification_failures')
      .maybeSingle();
      
    let failuresList = existing?.value?.failures || [];
    
    // Check if failure already logged recently (within 24 hours) to avoid duplicates
    const exists = failuresList.some(f => f.email === email && (new Date() - new Date(f.timestamp) < 86400000));
    if (!exists) {
      failuresList.push({
        email,
        reason,
        timestamp: new Date().toISOString()
      });
      
      // Limit to last 150 items
      if (failuresList.length > 150) {
        failuresList = failuresList.slice(failuresList.length - 150);
      }
      
      await supabase.from('settings').upsert({
        key: 'verification_failures',
        value: { failures: failuresList },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    }
  } catch (err) {
    // Suppress error so validation runs without dependency blockages
  }
}

// List of common disposable email domains
const disposableDomains = new Set([
  'mailinator.com', 'tempmail.com', 'yopmail.com', 'guerrillamail.com',
  '10minutemail.com', 'getairmail.com', 'dispostable.com', 'sharklasers.com',
  'temp-mail.org', 'maildrop.cc', 'throwawaymail.com', 'burnermail.io'
]);

// Blacklist of placeholder emails and template domains
const blacklistEmails = new Set([
  'info@mysite.com', 'email@mysite.com', 'placeholder@mysite.com',
  'info@example.com', 'email@example.com', 'placeholder@example.com',
  'info@yourdomain.com', 'email@yourdomain.com', 'yourname@yourdomain.com',
  'example@example.com', 'test@test.com', 'admin@example.com',
  'user@example.com', 'john@doe.com', 'johndoe@example.com'
]);

const blacklistDomains = new Set([
  'mysite.com', 'example.com', 'yourdomain.com', 'domain.com',
  'wixpress.com', 'sentry-next.wixpress.com', 'sentry.wixpress.com',
  'wix.com', 'squarespace.com', 'weebly.com', 'wordpress.com',
  'template.com', 'placeholder.com'
]);

/**
 * Cleans trailing garbage attached to TLDs from extracted emails and validates syntax.
 * @param {string} email 
 * @returns {string|null} Cleaned email or null if invalid
 */
function cleanEmailAddress(email) {
  if (!email || typeof email !== 'string') return null;
  let clean = email.trim().toLowerCase();
  
  if (!clean.includes('@')) return null;
  const parts = clean.split('@');
  if (parts.length !== 2) return null;
  
  let [localPart, domain] = parts;
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return null;
  
  // Strip prepended phone suffixes (e.g. "1123sara@neilston.co.nz" -> "sara@neilston.co.nz")
  const phoneTailMatch = localPart.match(/^(\d{3,4})([a-z].*)$/);
  if (phoneTailMatch) {
    localPart = phoneTailMatch[2];
  }
  
  // List of common valid TLD extensions (longest first to avoid partial matches)
  const commonTlds = [
    'co.nz', 'co.uk', 'co.in', 'com.au', 'com.br', 'co.za', 'com.sg',
    'org.nz', 'net.nz', 'ac.nz', 'govt.nz', 'ltd.uk', 'plc.uk', 'me.uk',
    'com', 'net', 'org', 'edu', 'gov', 'biz', 'info', 'name', 'pro',
    'co', 'io', 'me', 'us', 'ca', 'uk', 'nz', 'au', 'in', 'de', 'fr',
    'it', 'es', 'nl', 'se', 'no', 'dk', 'fi', 'ch', 'at', 'jp', 'cn',
    'kr', 'tw', 'sg', 'hk', 'ae', 'za', 'br', 'mx', 'ar', 'cl', 'app',
    'xyz', 'club', 'online', 'site', 'tech', 'store', 'agency', 'space',
    'design', 'photography', 'media', 'company', 'builders', 'contractor',
    'renovations', 'plumbing', 'heating', 'electrical', 'services', 'solutions',
    'construction', 'group', 'ltd', 'limited', 'inc'
  ];
  
  for (const tld of commonTlds) {
    const tldPattern = new RegExp(`\\.${tld.replace('.', '\\.')}([a-z]{3,})?$`, 'i');
    const match = domain.match(tldPattern);
    if (match) {
      const cleanDomain = domain.substring(0, match.index + tld.length + 1);
      return `${localPart}@${cleanDomain}`;
    }
  }
  
  return clean;
}

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

  // 1. Clean and validate syntax
  const cleanEmail = cleanEmailAddress(email);
  if (!cleanEmail || !validateSyntax(cleanEmail)) {
    await logVerificationFailure(email, 'Invalid syntax');
    return { isValid: false, reason: 'Invalid email syntax format' };
  }

  const [, domain] = cleanEmail.split('@');

  // 2. Check blacklist and disposable
  if (blacklistEmails.has(cleanEmail)) {
    await logVerificationFailure(cleanEmail, 'Placeholder/template email');
    return { isValid: false, reason: 'Blacklisted placeholder/template email address' };
  }

  if (blacklistDomains.has(domain) || 
      domain.includes('wixpress.com') || 
      domain.includes('mysite.com') || 
      domain.includes('yourdomain.com') ||
      domain.includes('example.com') ||
      domain.startsWith('sentry-next')) {
    await logVerificationFailure(cleanEmail, 'Placeholder/template domain');
    return { isValid: false, reason: 'Blacklisted placeholder/template domain name' };
  }

  if (disposableDomains.has(domain)) {
    await logVerificationFailure(cleanEmail, 'Disposable email provider');
    return { isValid: false, reason: 'Disposable/Temporary email service provider' };
  }

  // 3. DNS MX Record Lookup
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      await logVerificationFailure(cleanEmail, 'No MX records');
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
    console.warn(`⚠️ DNS MX lookup failed for ${domain}: ${err.message}`);
    
    // Check if DNS query failed due to a network timeout / server query block (e.g. ECONNREFUSED)
    const isNetworkError = ['ECONNREFUSED', 'ETIMEOUT', 'EREFUSED', 'EHOSTUNREACH', 'ENETUNREACH'].includes(err.code);
    if (isNetworkError) {
      console.warn(`🟢 Bypassing DNS MX check due to local network/DNS block for domain: ${domain}`);
      return {
        isValid: true,
        reason: 'Valid email syntax (DNS verification bypassed due to network connection blocks)',
        domain,
        mxRecords: []
      };
    }
    
    await logVerificationFailure(cleanEmail, `DNS Lookup failed: ${err.code || err.message}`);
    return { isValid: false, reason: `Domain DNS lookup failed: ${err.code || err.message}` };
  }
}

module.exports = {
  verifyEmail,
  validateSyntax,
  cleanEmailAddress
};
