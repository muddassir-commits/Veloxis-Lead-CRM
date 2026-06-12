const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const supabase = require('../server/services/supabaseService');
const scraperService = require('../server/services/scraperService');
const emailFinderService = require('../server/services/emailFinderService');

async function run() {
  console.log('🚀 Starting Multi-Query Google Maps Lead Generation for Auckland, New Zealand...');
  console.log('📋 Niche: Home Remodeling & Construction | Target: 90 Verified Leads');

  const targetCount = 90;
  let insertedCount = 0;
  
  const queries = [
    'home renovations',
    'home builders',
    'home remodeling',
    'builders',
    'construction companies'
  ];
  
  const city = 'Auckland';
  const country = 'New Zealand';
  const industry = 'Home Remodeling & Construction';

  const processedEmails = new Set();

  // Load existing emails from database first to prevent duplicate processing if re-run
  try {
    const { data: existingLeads } = await supabase.from('leads').select('email');
    if (existingLeads) {
      existingLeads.forEach(l => {
        if (l.email) processedEmails.add(l.email.toLowerCase());
      });
    }
  } catch (err) {
    console.warn('⚠️ Could not load existing database emails for deduping:', err.message);
  }

  for (const query of queries) {
    if (insertedCount >= targetCount) break;

    console.log(`\n==================================================`);
    console.log(`🔍 Scraping for: "${query}" in ${city}, ${country}...`);
    console.log(`==================================================`);
    
    try {
      // Scrape up to 80 listings per query keyword
      const listings = await scraperService.scrapeGoogleMaps(query, `${city}, ${country}`, 80);
      console.log(`📋 Found ${listings.length} listings for "${query}". Starting verification and enrichment...`);

      for (const item of listings) {
        if (insertedCount >= targetCount) break;

        console.log(`\n--------------------------------------------------`);
        console.log(`Processing listing: "${item.name}"`);

        let website = item.website || null;
        if (!website) {
          // website lookup
          console.log(`⚠️ Website missing for "${item.name}". Searching domain...`);
          try {
            const searchResult = await emailFinderService.findEmailForLead({
              name: 'Founder / CEO',
              company: item.name,
              website: '',
              notes: ''
            });
            website = searchResult.website || null;
          } catch (e) {
            console.log(`⚠️ Website lookup failed: ${e.message}`);
          }
        }

        if (!website) {
          console.log(`⚠️ No website found for "${item.name}". Skipping.`);
          continue;
        }

        try {
          console.log(`🔍 Enriching emails for domain: ${website}`);
          const enrichResult = await emailFinderService.findEmailForLead({
            name: 'Founder / CEO',
            company: item.name,
            website: website,
            notes: ''
          });

          const email = enrichResult.email;
          if (!email) {
            console.log(`❌ No verified email found for "${item.name}".`);
            continue;
          }

          if (processedEmails.has(email.toLowerCase())) {
            console.log(`⚠️ Duplicate: "${email}" already processed. Skipping.`);
            continue;
          }
          processedEmails.add(email.toLowerCase());

          // Verify unique key in DB
          const { data: existingLead, error: checkError } = await supabase
            .from('leads')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (checkError) {
            console.error(`Error checking DB duplicate:`, checkError.message);
            continue;
          }

          if (existingLead) {
            console.log(`⚠️ Duplicate in DB: Lead with email "${email}" already exists. Skipping.`);
            continue;
          }

          // Clean name
          const cleanName = item.name.split(' - ')[0].split(' | ')[0].trim();

          // Insert lead to Supabase
          const leadData = {
            name: cleanName,
            company: cleanName,
            website: website,
            phone: item.phone || null,
            email: email,
            linkedin: enrichResult.linkedin || null,
            instagram: enrichResult.instagram || null,
            city: city,
            country: country,
            industry: industry,
            rating: item.rating || 4.0,
            status: 'Researched',
            lead_score: 'Hot',
            notes: `Auto-sourced via New Zealand Outreach Campaign on ${new Date().toLocaleDateString()}.\n` + (enrichResult.notes || '')
          };

          const { data: insertedLead, error: insertError } = await supabase
            .from('leads')
            .insert(leadData)
            .select()
            .single();

          if (insertError) {
            console.error(`❌ DB insert failed for "${cleanName}":`, insertError.message);
            continue;
          }

          insertedCount++;
          console.log(`✅ [${insertedCount}/${targetCount}] Successfully uploaded to CRM: "${cleanName}" (${email})`);

        } catch (err) {
          console.error(`⚠️ Error enriching "${item.name}":`, err.message);
        }

        // Brief sleep to avoid hitting rate limits
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (cityErr) {
      console.error(`❌ Failed scraping listings for "${query}" in ${city}:`, cityErr.message);
    }
  }

  console.log(`\n🎉 Completed NZ Lead Sourcing! Successfully uploaded ${insertedCount} verified leads into Supabase CRM.`);
}

run().catch(console.error);
