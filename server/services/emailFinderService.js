const cheerio = require('cheerio');
const emailVerifyService = require('./emailVerifyService');
const dns = require('dns').promises;
const browserManager = require('./browserManager');
const nameHelper = require('../utils/nameHelper');

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
    const cleaned = emailVerifyService.cleanEmailAddress(email);
    if (!cleaned) continue;
    
    const isAsset = ignoredExtensions.some(ext => cleaned.endsWith(ext));
    if (!isAsset) {
      uniqueEmails.add(cleaned);
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
 * Advanced Layer 4 Website Scraper using Headless Chrome (Puppeteer)
 * Executes javascript, bypasses security checkpoints, and extracts dynamic links/text
 */
async function scrapeWebsiteWithPuppeteer(websiteUrl) {
  const normalized = normalizeUrl(websiteUrl);
  if (!normalized) return { emails: [], socials: {} };

  console.log(`🕵️ Requesting Puppeteer page from Singleton to scan: ${normalized}`);
  const emailsFound = new Set();
  const socials = { facebook: null, instagram: null, linkedin: null };
  
  let page;
  try {
    page = await browserManager.newPage();
    
    // Set timeout to 25s
    await page.goto(normalized, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000)); // wait for transitions
    
    // 1. Scan homepage HTML (tag boundaries prevent text squashing)
    const bodyHtml = await page.evaluate(() => document.documentElement.innerHTML);
    extractEmails(bodyHtml).forEach(e => emailsFound.add(e));
    
    // 2. Scan social links
    const socialLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const found = { facebook: null, instagram: null, linkedin: null };
      links.forEach(a => {
        const href = a.href;
        if (href.includes('facebook.com')) found.facebook = href;
        if (href.includes('instagram.com')) found.instagram = href;
        if (href.includes('linkedin.com')) found.linkedin = href;
      });
      return found;
    });
    Object.assign(socials, socialLinks);
    
    // 3. Scan Contact / About subpages (visit up to 2 contact links)
    const subpages = await page.evaluate((baseUrl) => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const targets = [];
      links.forEach(a => {
        const href = a.href;
        const text = a.textContent.toLowerCase();
        if (href && (text.includes('contact') || text.includes('about') || text.includes('reach') || text.includes('us'))) {
          try {
            const baseHost = new URL(baseUrl).hostname.toLowerCase().replace('www.', '');
            const absoluteUrl = new URL(href, baseUrl);
            const absoluteHost = absoluteUrl.hostname.toLowerCase().replace('www.', '');
            
            // Only follow links belonging to the same root domain
            if (absoluteHost === baseHost) {
              const absolute = absoluteUrl.href;
              if (!targets.includes(absolute) && targets.length < 2 && absolute.startsWith('http')) {
                targets.push(absolute);
              }
            }
          } catch (e) {
            // Ignored
          }
        }
      });
      return targets;
    }, normalized);
    
    for (const link of subpages) {
      console.log(`🔗 Puppeteer scanning secondary link: ${link}`);
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 1000));
        
        const subHtml = await page.evaluate(() => document.documentElement.innerHTML);
        extractEmails(subHtml).forEach(e => emailsFound.add(e));
      } catch (subErr) {
        console.log(`⚠️ Puppeteer failed to scan subpage: ${link}`);
      }
    }
    
  } catch (err) {
    console.error('❌ Puppeteer scraper error:', err.message);
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (closeErr) {
        // Ignored
      }
    }
  }
  
  return {
    emails: Array.from(emailsFound),
    socials
  };
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

  // 1. Scan homepage HTML (tag boundaries prevent text squashing)
  extractEmails(html).forEach(email => emailsFound.add(email));

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
      try {
        const baseHost = new URL(normalized).hostname.toLowerCase().replace('www.', '');
        const hrefUrl = new URL(href, normalized);
        const hrefHost = hrefUrl.hostname.toLowerCase().replace('www.', '');
        
        // Only follow links belonging to the same root domain
        if (hrefHost === baseHost) {
          const absoluteUrl = hrefUrl.href;
          if (!linksToVisit.includes(absoluteUrl) && linksToVisit.length < 3) {
            linksToVisit.push(absoluteUrl);
          }
        }
      } catch (err) {
        // Ignore invalid URLs
      }
    }
  });

  for (const link of linksToVisit) {
    console.log(`🔗 Checking secondary page: ${link}`);
    const subHtml = await fetchHtml(link);
    if (subHtml) {
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
 * Search DuckDuckGo for the company's official website URL
 * @param {string} companyName 
 * @returns {Promise<string|null>} Official website URL
 */
async function searchCompanyWebsite(companyName) {
  if (!companyName || companyName.toLowerCase() === 'direct' || companyName.toLowerCase().includes('unknown')) {
    return null;
  }
  
  console.log(`🔍 Searching company website for: "${companyName}"`);
  let page;
  try {
    page = await browserManager.newPage();
    const query = `"${companyName}" official website`;
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    const firstUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.web-result .result__title a'));
      for (const link of links) {
        const url = link.href;
        if (!url) continue;
        const lowUrl = url.toLowerCase();
        
        // Skip social media, directories and general search/ad sites
        if (lowUrl.includes('linkedin.com') || 
            lowUrl.includes('facebook.com') || 
            lowUrl.includes('instagram.com') || 
            lowUrl.includes('twitter.com') || 
            lowUrl.includes('x.com') ||
            lowUrl.includes('youtube.com') || 
            lowUrl.includes('wikipedia.org') || 
            lowUrl.includes('yelp.com') || 
            lowUrl.includes('glassdoor.com') || 
            lowUrl.includes('indeed.com') ||
            lowUrl.includes('crunchbase.com') ||
            lowUrl.includes('duckduckgo.com')) {
          continue;
        }
        
        return url;
      }
      return null;
    });

    if (firstUrl) {
      console.log(`🎯 Found website for ${companyName}: ${firstUrl}`);
      return firstUrl;
    }
  } catch (err) {
    console.warn(`⚠️ Error searching website for "${companyName}":`, err.message);
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
  return null;
}

/**
 * Master Method: Run the 5-Layer Search logic for a lead
 * @param {Object} lead 
 * @returns {Promise<Object>} - Output email, website, socials, and notes
 */
async function findEmailForLead(lead) {
  console.log(`🔍 Initializing Email Finder for: ${lead.name} (${lead.company})`);
  
  // Strip previous [Email Finder] and [Socials] lines from notes to prevent duplicate logs
  const sanitizedNotes = (lead.notes || '')
    .replace(/^\[Email Finder\].*$/gm, '')
    .replace(/^\[Socials\].*$/gm, '')
    .replace(/^\s*[\r\n]/gm, '')
    .trim();

  const result = {
    email: null,
    website: lead.website || null,
    linkedin: lead.linkedin || null,
    instagram: lead.instagram || null,
    notes: sanitizedNotes
  };

  // Skip if lead already has a valid email
  if (lead.email) {
    const cleaned = emailVerifyService.cleanEmailAddress(lead.email);
    if (cleaned && emailVerifyService.validateSyntax(cleaned)) {
      const verify = await emailVerifyService.verifyEmail(cleaned);
      if (verify.isValid) {
        result.email = cleaned;
        return result;
      }
    }
  }

  let website = lead.website || null;
  if (!website && lead.company) {
    result.notes += `\n[Email Finder] Website missing. Searching web for "${lead.company}" website...`;
    website = await searchCompanyWebsite(lead.company);
    if (website) {
      result.website = website;
      result.notes += `\n[Email Finder] Found website: ${website}`;
    } else {
      result.notes += '\n[Email Finder] Website could not be found. Skipping web-scraping layers.';
    }
  }

  if (!website) {
    return result;
  }

  // LAYER 1: Deep Web Scrape (Cheerio & Fetch)
  try {
    let webResult = await scrapeWebsiteForEmails(website);
    
    // ADVANCED LAYER 4 FALLBACK: If standard cheerio scraping finds no emails, trigger Puppeteer!
    if (webResult.emails.length === 0) {
      console.log(`💡 Cheerio scraper yielded 0 emails. Launching Advanced Puppeteer Scraper...`);
      const puppeteerResult = await scrapeWebsiteWithPuppeteer(website);
      webResult.emails = [...webResult.emails, ...puppeteerResult.emails];
      Object.assign(webResult.socials, puppeteerResult.socials);
    }
    
    // Update social handles if found
    if (webResult.socials.facebook) result.notes += `\n[Socials] Facebook: ${webResult.socials.facebook}`;
    if (webResult.socials.instagram && !result.instagram) result.instagram = webResult.socials.instagram;
    if (webResult.socials.linkedin && !result.linkedin) result.linkedin = webResult.socials.linkedin;

    // Validate any scraped emails
    for (const scrapedEmail of webResult.emails) {
      const cleaned = emailVerifyService.cleanEmailAddress(scrapedEmail);
      if (cleaned) {
        const verify = await emailVerifyService.verifyEmail(cleaned);
        if (verify.isValid) {
          console.log(`✅ Valid Email Found via Web-Scraping: ${cleaned}`);
          result.email = cleaned;
          result.notes += `\n[Email Finder] Found email via website scrape: ${cleaned}`;
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Web scraping layer error:', err.message);
  }

  // LAYER 2: Common Patterns (info@, contact@, etc.) + MX Verification
  try {
    const patternEmails = await generateCommonPatterns(website);
    // Since verification makes external network requests, we test candidates in parallel
    for (const candidate of patternEmails) {
      const cleaned = emailVerifyService.cleanEmailAddress(candidate);
      if (cleaned) {
        const verify = await emailVerifyService.verifyEmail(cleaned);
        if (verify.isValid) {
          console.log(`✅ Valid Email Found via Domain Patterns: ${cleaned}`);
          result.email = cleaned;
          result.notes += `\n[Email Finder] Generated valid domain pattern email: ${cleaned}`;
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Pattern matching layer error:', err.message);
  }

  // LAYER 3 & 5: Owner Name Matching Fallback
  if (lead.name && !nameHelper.isLikelyBusiness(lead.name, lead.company)) {
    try {
      const normalized = normalizeUrl(website);
      const urlObj = new URL(normalized);
      const domain = urlObj.hostname.replace('www.', '');

      const firstName = lead.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Blacklist of generic placeholder first names to avoid guessing false emails (e.g. founder@domain)
      const genericPlaceholders = new Set([
        'founder', 'ceo', 'owner', 'manager', 'admin', 'contact', 'info', 
        'support', 'sales', 'office', 'enquiries', 'inquiry', 'team', 'director', 
        'partner', 'head', 'hello', 'staff', 'careers', 'jobs', 'service', 
        'reception', 'accounts', 'billing'
      ]);

      if (!genericPlaceholders.has(firstName)) {
        const nameCandidate = `${firstName}@${domain}`;
        const cleaned = emailVerifyService.cleanEmailAddress(nameCandidate);
        if (cleaned) {
          const verify = await emailVerifyService.verifyEmail(cleaned);
          if (verify.isValid) {
            console.log(`✅ Valid Email Found via Name Matching: ${cleaned}`);
            result.email = cleaned;
            result.notes += `\n[Email Finder] Generated valid name candidate email: ${cleaned}`;
            return result;
          }
        }
      } else {
        console.log(`⚠️ Skipping name-based candidate generation for generic name placeholder: "${lead.name}"`);
      }
    } catch (err) {
      // Ignored
    }
  } else if (lead.name) {
    console.log(`⚠️ Skipping name-based candidate generation because name is classified as a business: "${lead.name}"`);
  }

  result.notes += '\n[Email Finder] 5-layer search completed. No active email could be identified.';
  return result;
}

/**
 * Analyzes website URL for Meta Pixel and WhatsApp widgets
 * @param {string} websiteUrl 
 * @returns {Promise<Object>} gaps analysis flags
 */
async function analyzeWebsiteGaps(websiteUrl) {
  const normalized = normalizeUrl(websiteUrl);
  if (!normalized) return { hasPixel: false, hasWhatsApp: false, hasBooking: false };

  try {
    const html = await fetchHtml(normalized);
    if (!html) return { hasPixel: false, hasWhatsApp: false, hasBooking: false };

    const lowHtml = html.toLowerCase();
    
    // Check for Meta Pixel
    const hasPixel = lowHtml.includes('connect.facebook.net') || 
                      lowHtml.includes('fbq(') || 
                      lowHtml.includes('fbevents.js') ||
                      lowHtml.includes('tr?id=');

    // Check for WhatsApp
    const hasWhatsApp = lowHtml.includes('wa.me') || 
                         lowHtml.includes('api.whatsapp.com') || 
                         lowHtml.includes('whatsapp.com/send') || 
                         lowHtml.includes('whatsapp-widget');

    // Check for booking links (calendly, acuity, etc.)
    const hasBooking = lowHtml.includes('calendly.com') || 
                        lowHtml.includes('acuityscheduling.com') || 
                        lowHtml.includes('bookafy.com') || 
                        lowHtml.includes('tidycal.com') ||
                        lowHtml.includes('booking');

    return { hasPixel, hasWhatsApp, hasBooking };
  } catch (err) {
    console.warn(`⚠️ Error analyzing website gaps for ${websiteUrl}:`, err.message);
    return { hasPixel: false, hasWhatsApp: false, hasBooking: false };
  }
}

/**
 * Compiles a Hormozi-aligned 4-part Deep Research Report
 */
function generateDeepResearchReport(companyName, industry, website, gaps) {
  let lacking = [];
  let solutions = [];
  
  if (!website) {
    lacking.push('- Lacks a dedicated, conversion-focused landing page (unable to capture local intent traffic).');
    solutions.push('- Design & launch a custom high-ticket landing page tailored for local customer acquisition.');
    lacking.push('- Lacks a Meta Pixel to target visitors and build lookalike audiences.');
    solutions.push('- Setup & integrate Meta Pixel code on the landing page for complete conversion tracking.');
    lacking.push('- Missing WhatsApp instant lead-verification system (at risk of fake number spam).');
    solutions.push('- Embed the Veloxis 60-Second WhatsApp Verification Widget to filter fake leads.');
  } else {
    if (!gaps.hasPixel) {
      lacking.push('- No Meta Pixel detected (unable to run retargeting ads or track paid campaigns).');
      solutions.push('- Install and configure Meta Pixel tracking for retargeting and custom conversion events.');
    }
    if (!gaps.hasWhatsApp) {
      lacking.push('- Missing 60-second real-time WhatsApp verification widget (fake lead verification is offline).');
      solutions.push('- Deploy a 1-click WhatsApp messaging and number-validation widget to boost response rates.');
    }
    if (!gaps.hasBooking) {
      lacking.push('- Lacks a direct booking widget (requires manual emailing or calling back to secure appointments).');
      solutions.push('- Integrate a calendar scheduling engine (e.g., Calendly/Acuity) to automate booking flow.');
    }
  }

  if (lacking.length === 0) {
    lacking.push('- Lacks an active, high-volume paid Meta Ads client acquisition funnel.');
    lacking.push('- Retargeting is active but cold ad flows are sub-optimal.');
    solutions.push('- Launch a risk-free Pay-Per-Showed-Up-Meeting Meta Ads campaign.');
    solutions.push('- Introduce multi-variant creative testing to scale weekly bookings.');
  }

  // Generate Hormozi-aligned vision based on industry
  let vision = `Scale operations and acquire high-value clients in the local market using premium paid social funnels.`;
  const indLower = industry.toLowerCase();
  if (indLower.includes('gym')) {
    vision = `Capture local recurring membership sign-ups and scale high-ticket personal training packages.`;
  } else if (indLower.includes('dental') || indLower.includes('dentist')) {
    vision = `Fill high-value cosmetic, dental implant, and orthodontic booking slots with local patients.`;
  } else if (indLower.includes('spa') || indLower.includes('medspa')) {
    vision = `Maximize bookings for premium aesthetic procedures (coolsculpting, fillers, lasers) with local clients.`;
  } else if (indLower.includes('real estate') || indLower.includes('developer')) {
    vision = `Acquire qualified home buyers and premium investor leads for upcoming residential developments.`;
  } else if (indLower.includes('roof') || indLower.includes('contractor') || indLower.includes('hvac')) {
    vision = `Generate high-ticket replacement and repair installation bookings within target service postcodes.`;
  } else if (indLower.includes('solar')) {
    vision = `Identify homeowners interested in solar transitions and book qualified site assessment audits.`;
  } else if (indLower.includes('ecommerce') || indLower.includes('store')) {
    vision = `Increase Shopify checkout completions and boost customer lifetime value (LTV) through paid conversion scaling.`;
  }

  return `🏥 Company: ${companyName}
🎯 Vision: ${vision}
⚠️ Lacking Areas:
${lacking.join('\n')}
💡 Solutions Needed:
${solutions.join('\n')}`;
}

module.exports = {
  findEmailForLead,
  scrapeWebsiteForEmails,
  generateCommonPatterns,
  searchCompanyWebsite,
  analyzeWebsiteGaps,
  generateDeepResearchReport
};
