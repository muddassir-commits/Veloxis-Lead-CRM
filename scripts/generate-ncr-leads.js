const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const supabase = require('../server/services/supabaseService');
const scraperService = require('../server/services/scraperService');
const emailFinderService = require('../server/services/emailFinderService');

async function run() {
  console.log('🚀 Starting high-ticket real estate lead generation & CRM upload...');
  
  const targetCount = 50;
  let insertedCount = 0;
  
  const targets = [
    { city: 'Gurgaon', query: 'luxury real estate developers' },
    { city: 'Noida', query: 'luxury real estate developers' },
    { city: 'Bangalore', query: 'luxury real estate developers' },
    { city: 'Pune', query: 'luxury real estate developers' },
    { city: 'Hyderabad', query: 'luxury real estate developers' }
  ];
  
  // Set to track emails processed in this execution to prevent duplicate processing
  const processedEmails = new Set();

  for (const target of targets) {
    if (insertedCount >= targetCount) break;
    
    console.log(`\n🔍 Sourcing leads from Google Maps for city: "${target.city}"...`);
    try {
      // Scrape up to 25 listings per city
      const listings = await scraperService.scrapeGoogleMaps(target.query, target.city, 25);
      console.log(`📋 Found ${listings.length} listings in ${target.city}. Starting verification and enrichment...`);
      
      for (const item of listings) {
        if (insertedCount >= targetCount) break;
        
        console.log(`\n--------------------------------------------------`);
        console.log(`Processing lead: "${item.name}"`);
        
        // Skip if website is missing (we need verified emails which come from website scrapes)
        let website = item.website || null;
        if (!website) {
          console.log(`⚠️ Website missing for "${item.name}". Skipping.`);
          continue;
        }
        
        // Find or verify email
        try {
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
            console.log(`⚠️ Email "${email}" already processed in this batch. Skipping.`);
            continue;
          }
          processedEmails.add(email.toLowerCase());
          
          // Verify with database to ensure unique key is not violated
          const { data: existingLead, error: checkError } = await supabase
            .from('leads')
            .select('id')
            .eq('email', email)
            .maybeSingle();
            
          if (checkError) {
            console.error(`Error checking duplicate for "${email}":`, checkError.message);
            continue;
          }
          
          if (existingLead) {
            console.log(`⚠️ Duplicate: Lead with email "${email}" already exists in CRM database. Skipping.`);
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
            city: target.city,
            country: 'India',
            industry: 'Real Estate Developer',
            rating: item.rating || 4.0,
            status: 'Researched',
            lead_score: 'Hot',
            notes: `Auto-sourced via NCR Lead Generator on ${new Date().toLocaleDateString()}.\n` + enrichResult.notes
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
          
        } catch (enrichErr) {
          console.error(`⚠️ Error enriching "${item.name}":`, enrichErr.message);
        }
        
        // Brief sleep to avoid hitting rate limits
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (cityErr) {
      console.error(`❌ Failed scraping listings for ${target.city}:`, cityErr.message);
    }
  }
  
  console.log(`\n🎉 Completed! Uploaded ${insertedCount} verified leads into Supabase CRM.`);
}

run().catch(console.error);
