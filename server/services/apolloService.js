const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const browserManager = require('./browserManager');

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

/**
 * Searches B2B contacts via Apollo.io API, falling back to a free DuckDuckGo LinkedIn scraper if the API key is not configured or on a free plan.
 * @param {Object} query - Search parameters
 * @param {string} query.keywords - Keywords like industry (e.g. "fitness")
 * @param {string} query.titles - Job titles (e.g. "CEO, Founder")
 * @param {string} query.locations - Location filter (e.g. "Sydney")
 * @param {number} [query.limit=10] - Limit of results
 * @returns {Promise<Array<Object>>} Standardized leads array
 */
async function searchB2BProfiles({ keywords, titles, locations, limit = 10 }) {
  if (!APOLLO_API_KEY || APOLLO_API_KEY === 'your_apollo_api_key_here' || APOLLO_API_KEY === '') {
    console.log('⚠️ Apollo API Key is not set or is default. Falling back to Free B2B Scraper...');
    return await fallbackFreeB2BSearch({ keywords, titles, locations, limit });
  }

  // Parse titles and locations from comma-separated string to arrays
  const personTitles = titles ? titles.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0) : [];
  const personLocations = locations ? locations.split(',').map(l => l.trim()).filter(l => l.length > 0) : [];

  const requestBody = {
    q_keywords: keywords || undefined,
    person_titles: personTitles.length > 0 ? personTitles : undefined,
    person_locations: personLocations.length > 0 ? personLocations : undefined,
    per_page: Math.min(limit, 100)
  };

  console.log(`📡 Sending B2B request to Apollo.io for keywords: "${keywords}", locations: "${locations}"`);

  try {
    const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': APOLLO_API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = (data.error || '').toLowerCase();
      if (errorMsg.includes('free plan') || errorMsg.includes('not accessible') || errorMsg.includes('upgrade') || response.status === 403) {
        console.log('⚠️ Apollo key is on Free plan / restricted. Falling back to Free B2B Scraper...');
        return await fallbackFreeB2BSearch({ keywords, titles, locations, limit });
      }
      throw new Error(data.error || `Apollo API returned status ${response.status}`);
    }

    const people = data.people || [];
    console.log(`✅ Apollo returned ${people.length} B2B prospects.`);

    // Map to lead B2B CRM schema
    const standardizedLeads = people.map(p => {
      const name = p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown Contact';
      const company = p.organization?.name || 'Direct';
      const website = p.organization?.website || p.organization?.primary_domain || null;
      const linkedin = p.linkedin_url || null;
      const email = p.email || null;
      
      // Extract phone number from sanitization or raw array
      let phone = p.sanitized_phone || null;
      if (!phone && p.phone_numbers && p.phone_numbers.length > 0) {
        phone = p.phone_numbers[0].raw_number || p.phone_numbers[0].sanitized_phone || null;
      }

      const city = p.city || 'Unknown';
      const country = p.country || 'India';
      const industry = p.organization?.primary_industry || 'Unknown Services';
      
      const snippet = p.headline || `Title: ${p.title || 'N/A'} @ ${company}`;

      return {
        name,
        company,
        website: website ? (website.startsWith('http') ? website : `https://${website}`) : null,
        phone,
        email,
        linkedin,
        instagram: null,
        city,
        country,
        industry,
        status: email ? 'Researched' : 'New',
        lead_score: 'Cold',
        notes: `Sourced via Apollo B2B Search. Job Title: ${p.title || 'Prospect'}. Description: ${snippet}`
      };
    });

    return standardizedLeads;
  } catch (err) {
    console.warn('❌ Apollo search API error, falling back to Free B2B Scraper:', err.message);
    try {
      return await fallbackFreeB2BSearch({ keywords, titles, locations, limit });
    } catch (fallbackErr) {
      throw new Error(`Apollo API and fallback both failed. Apollo: ${err.message}. Fallback: ${fallbackErr.message}`);
    }
  }
}

/**
 * Fallback free search when Apollo API fails or is not available.
 * Queries DuckDuckGo for LinkedIn profiles matching keywords, titles, and locations.
 */
async function fallbackFreeB2BSearch({ keywords, titles, locations, limit = 10 }) {
  console.log(`🔍 Executing Free B2B LinkedIn Scraper: Keywords="${keywords}", Titles="${titles}", Locations="${locations}"`);

  const personTitles = titles ? titles.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0) : [];
  const personLocations = locations ? locations.split(',').map(l => l.trim()).filter(l => l.length > 0) : [];

  let searchTerms = [];
  if (personTitles.length > 0) {
    searchTerms.push(personTitles[0].replace(/"/g, ''));
  }
  if (keywords) {
    searchTerms.push(keywords.replace(/"/g, ''));
  }
  if (personLocations.length > 0) {
    searchTerms.push(personLocations[0].replace(/"/g, ''));
  }

  const query = `site:linkedin.com/in ${searchTerms.join(' ')}`;
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

  let page;
  const results = [];

  try {
    page = await browserManager.newPage();
    console.log(`🌐 Loading DuckDuckGo JS search page: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for JS to render results
    await new Promise(r => setTimeout(r, 6000));

    const rawResults = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('article, [data-testid="result"]'));
      return items.map(el => {
        const titleEl = el.querySelector('a[data-testid="result-title-a"], h2 a');
        const title = titleEl ? titleEl.textContent.trim() : 'Unknown';
        const url = titleEl ? titleEl.getAttribute('href') : null;
        
        let snippet = '';
        const textContainers = Array.from(el.querySelectorAll('div, span, p'));
        for (const container of textContainers) {
          const text = container.cloneNode(true).textContent.trim();
          if (text.length > 30 && 
              !text.includes('Block this site') && 
              !text.includes('Share feedback') && 
              !title.includes(text) && 
              !text.includes('Redo search') && 
              !text.includes('Clear filter') &&
              !text.includes('http')) {
            if (text.length > snippet.length) {
              snippet = text;
            }
          }
        }
        
        return { url, title, snippet };
      });
    });

    console.log(`📋 Found ${rawResults.length} raw search results from DuckDuckGo. Filtering for LinkedIn profiles...`);

    for (const item of rawResults) {
      if (!item.url || !item.url.toLowerCase().includes('linkedin.com/in')) continue;

      // Extract details from title
      const parsed = parseLinkedInTitle(item.title);

      results.push({
        name: parsed.name,
        company: parsed.company,
        website: null, // website is missing initially but will be found by the website-search in email finder!
        phone: null,
        email: null,
        linkedin: item.url,
        instagram: null,
        city: personLocations[0] || 'Unknown',
        country: 'India',
        industry: parsed.title || keywords || 'Prospect', // store job title / niche here
        status: 'New',
        lead_score: 'Cold',
        notes: `Sourced via Free B2B LinkedIn Scraper. Title: ${parsed.title}. Bio: ${item.snippet}`
      });

      if (results.length >= limit) break;
    }

  } catch (err) {
    console.error('❌ Free B2B LinkedIn search error:', err.message);
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }

  return results;
}

function parseLinkedInTitle(titleText) {
  let cleaned = titleText.replace(/\s*[|:-]\s*LinkedIn/gi, '').trim();

  let parts = cleaned.split(/\s+-\s+/);
  if (parts.length < 2) {
    parts = cleaned.split(/\s+\|\s+/);
  }

  let name = 'Unknown Prospect';
  let title = 'Prospect';
  let company = 'Unknown Company';

  if (parts.length >= 3) {
    name = parts[0].trim();
    title = parts[1].trim();
    company = parts[2].trim();
  } else if (parts.length === 2) {
    name = parts[0].trim();
    const atMatch = parts[1].match(/\s+(?:at|@)\s+(.+)$/i);
    if (atMatch) {
      title = parts[1].substring(0, parts[1].indexOf(atMatch[0])).trim();
      company = atMatch[1].trim();
    } else {
      title = parts[1].trim();
      company = 'Direct';
    }
  } else if (parts.length === 1 && parts[0]) {
    name = parts[0].trim();
  }

  if (title.toLowerCase().includes(' at ')) {
    const titleParts = title.split(/\s+at\s+/i);
    title = titleParts[0].trim();
    company = titleParts[1].trim();
  } else if (title.includes(' @ ')) {
    const titleParts = title.split(/\s+@\s+/);
    title = titleParts[0].trim();
    company = titleParts[1].trim();
  }

  return { name, title, company };
}

module.exports = {
  searchB2BProfiles
};
