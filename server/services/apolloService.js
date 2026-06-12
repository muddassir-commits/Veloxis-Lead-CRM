const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

/**
 * Searches B2B contacts via Apollo.io API
 * @param {Object} query - Search parameters
 * @param {string} query.keywords - Keywords like industry (e.g. "fitness")
 * @param {string} query.titles - Job titles (e.g. "CEO, Founder")
 * @param {string} query.locations - Location filter (e.g. "Sydney")
 * @param {number} [query.limit=10] - Limit of results
 * @returns {Promise<Array<Object>>} Standardized leads array
 */
async function searchB2BProfiles({ keywords, titles, locations, limit = 10 }) {
  if (!APOLLO_API_KEY || APOLLO_API_KEY === 'your_apollo_api_key_here' || APOLLO_API_KEY === '') {
    throw new Error('Apollo API Key is not set in environment variables. Please configure APOLLO_API_KEY in your .env file.');
  }

  // Parse titles and locations from comma-separated string to arrays
  const personTitles = titles ? titles.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0) : [];
  const personLocations = locations ? locations.split(',').map(l => l.trim()).filter(l => l.length > 0) : [];

  const requestBody = {
    api_key: APOLLO_API_KEY,
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
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
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
    console.error('❌ Apollo search API error:', err.message);
    throw new Error(`Apollo API query failed: ${err.message}`);
  }
}

module.exports = {
  searchB2BProfiles
};
