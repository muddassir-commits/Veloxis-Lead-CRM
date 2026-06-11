const cheerio = require('cheerio');
const emailVerifyService = require('./emailVerifyService');
const dns = require('dns').promises;

/**
 * 5-Layer Email Finder Service
 */

/**
 * Helper to fetch HTML from a URL with timeout
 * @param {string} url 
 * @returns {Promise<string|null>} HTML content
 */
async function fetchHtml(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    return await response.text();
  } catch (err) {
    console.log(`⚠️  Could not fetch URL "${url}": ${err.message}`);
    return null;
  }
}

/**
 * Extract email addresses from a block of text using regular expressions
 * @param {string} text 
 * @returns {Array<string>} List of unique emails
 */
function extractEmails(text) {
  if (!text) return [];
  // Regex ignoring images and standard web assets ending in png/jpg
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  
  const ignoredExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.pdf'];
  const uniqueEmails = new Set();
  
  for (const email of matches) {
    const cleanEmail = email.toLowerCase().trim();
    const isAsset = ignoredExtensions.some(ext => cleanEmail.endsWith(ext));
    if (!isAsset) {
      uniqueEmails.add(cleanEmail);
    }
  }
  
  return Array.from(uniqueEmails);
}

/**
 * Normalizes URL and ensures it starts with http/https
 */
function normalizeUrl(url) {
  if (!url) return null;
  let cleanUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`;
  }
  return cleanUrl;
}

/**
 * Layer 1 & 4: Deep Web Scraper for emails and social accounts
 * @param {string} websiteUrl 
 * @returns {Promise<Object>} Emails and Social URLs found
 */
async function scrapeWebsiteForEmails(websiteUrl) {
  const normalized = normalizeUrl(websiteUrl);
  if (!normalized) return { emails: [], socials: {} };

  console.log(`🌐 Scraping website for emails: ${normalized}`);
  const emailsFound = new Set();
  const socials = { facebook: null, instagram: null, linkedin: null };

  const html = await fetchHtml(normalized);
  if (!html) return { emails: [], socials };

  const $ = cheerio.load(html);

  // 1. Scan homepage text and tags
  const pageText = $('body').text();
  extractEmails(pageText).forEach(email => emailsFound.add(email));
  extractEmails(html).forEach(email => emailsFound.add(email)); // Scan tags/attributes (e.g. href="mailto:")

  // 2. Scan social links from homepage
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (href.includes('facebook.com')) socials.facebook = href;
    if (href.includes('instagram.com')) socials.instagram = href;
    if (href.includes('linkedin.com')) socials.linkedin = href;
  });

  // 3. Scan Contact / About subpages (up to 3 links)
  const linksToVisit = [];
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().toLowerCase();
    
    if (href && (text.includes('contact') || text.includes('about') || text.includes('reach') || text.includes('us'))) {
      let absoluteUrl = href;
      if (href.startsWith('/')) {
        const urlObj = new URL(normalized);
        absoluteUrl = `${urlObj.origin}${href}`;
      } else if (!href.startsWith('http')) {
        // Relative url without slash
        const urlObj = new URL(normalized);
        absoluteUrl = `${urlObj.origin}/${href}`;
      }
      
      if (!linksToVisit.includes(absoluteUrl) && linksToVisit.length < 3) {
        linksToVisit.push(absoluteUrl);
      }
    }
  });

  for (const link of linksToVisit) {
    console.log(`🔗 Checking secondary page: ${link}`);
    const subHtml = await fetchHtml(link);
    if (subHtml) {
      const sub$ = cheerio.load(subHtml);
      extractEmails(sub$('body').text()).forEach(email => emailsFound.add(email));
      extractEmails(subHtml).forEach(email => emailsFound.add(email));
    }
  }

  return {
    emails: Array.from(emailsFound),
    socials
  };
}

/**
 * Layer 2: Common patterns generator and verifier
 * @param {string} websiteUrl 
 * @returns {Promise<Array<string>>} List of valid matching pattern emails
 */
async function generateCommonPatterns(websiteUrl) {
  try {
    const normalized = normalizeUrl(websiteUrl);
    if (!normalized) return [];
    
    const urlObj = new URL(normalized);
    const domain = urlObj.hostname.replace('www.', '');

    // Check if domain actually accepts emails first (has MX)
    const mxRecords = await dns.resolveMx(domain).catch(() => []);
    if (mxRecords.length === 0) {
      return []; // Domain does not host emails
    }

    const patterns = ['info', 'contact', 'hello', 'admin', 'sales', 'support'];
    const candidates = patterns.map(p => `${p}@${domain}`);
    
    console.log(`🎲 Generated ${candidates.length} common pattern emails for domain: ${domain}`);
    return candidates;
  } catch (err) {
    return [];
  }
}

/**
 * Master Method: Run the 5-Layer Search logic for a lead
 * @param {Object} lead 
 * @returns {Promise<Object>} - Output email, socials, and notes
 */
async function findEmailForLead(lead) {
  console.log(`🔍 Initializing Email Finder for: ${lead.name} (${lead.company})`);
  
  const result = {
    email: null,
    linkedin: lead.linkedin || null,
    instagram: lead.instagram || null,
    notes: lead.notes || ''
  };

  // Skip if lead already has a valid email
  if (lead.email && emailVerifyService.validateSyntax(lead.email)) {
    const verify = await emailVerifyService.verifyEmail(lead.email);
    if (verify.isValid) {
      result.email = lead.email;
      return result;
    }
  }

  if (!lead.website) {
    result.notes += '\n[Email Finder] No website URL provided. Skipping web-scraping layers.';
    return result;
  }

  // LAYER 1: Deep Web Scrape
  try {
    const webResult = await scrapeWebsiteForEmails(lead.website);
    
    // Update social handles if found
    if (webResult.socials.facebook) result.notes += `\n[Socials] Facebook: ${webResult.socials.facebook}`;
    if (webResult.socials.instagram && !result.instagram) result.instagram = webResult.socials.instagram;
    if (webResult.socials.linkedin && !result.linkedin) result.linkedin = webResult.socials.linkedin;

    // Validate any scraped emails
    for (const scrapedEmail of webResult.emails) {
      const verify = await emailVerifyService.verifyEmail(scrapedEmail);
      if (verify.isValid) {
        console.log(`✅ Valid Email Found via Web-Scraping: ${scrapedEmail}`);
        result.email = scrapedEmail;
        result.notes += `\n[Email Finder] Found email via website scrape: ${scrapedEmail}`;
        return result;
      }
    }
  } catch (err) {
    console.warn('⚠️ Web scraping layer error:', err.message);
  }

  // LAYER 2: Common Patterns (info@, contact@, etc.) + MX Verification
  try {
    const patternEmails = await generateCommonPatterns(lead.website);
    // Since verification makes external network requests, we test candidates in parallel
    for (const candidate of patternEmails) {
      const verify = await emailVerifyService.verifyEmail(candidate);
      if (verify.isValid) {
        console.log(`✅ Valid Email Found via Domain Patterns: ${candidate}`);
        result.email = candidate;
        result.notes += `\n[Email Finder] Generated valid domain pattern email: ${candidate}`;
        return result;
      }
    }
  } catch (err) {
    console.warn('⚠️ Pattern matching layer error:', err.message);
  }

  // LAYER 3 & 5: Owner Name Matching Fallback
  if (lead.name) {
    try {
      const normalized = normalizeUrl(lead.website);
      const urlObj = new URL(normalized);
      const domain = urlObj.hostname.replace('www.', '');

      const firstName = lead.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const nameCandidate = `${firstName}@${domain}`;

      const verify = await emailVerifyService.verifyEmail(nameCandidate);
      if (verify.isValid) {
        console.log(`✅ Valid Email Found via Name Matching: ${nameCandidate}`);
        result.email = nameCandidate;
        result.notes += `\n[Email Finder] Generated valid name candidate email: ${nameCandidate}`;
        return result;
      }
    } catch (err) {
      // Ignored
    }
  }

  result.notes += '\n[Email Finder] 5-layer search completed. No active email could be identified.';
  return result;
}

module.exports = {
  findEmailForLead,
  scrapeWebsiteForEmails,
  generateCommonPatterns
};
