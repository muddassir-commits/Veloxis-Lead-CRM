const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const supabase = require('../server/services/supabaseService');
const { scrapeGoogleMaps } = require('../server/services/scraperService');
const { scrapeWebsiteForEmails, scrapeWebsiteWithPuppeteer } = require('../server/services/emailFinderService');
const { verifyEmail } = require('../server/services/emailVerifyService');
const browserManager = require('../server/services/browserManager');

const CSV_FILE = path.join(__dirname, '../verified_1000_leads.csv');

// Niches & Target Cities
const niches = [
  'Real Estate Developer',
  'Construction Company',
  'Law Firm',
  'Dental Clinic',
  'Digital Marketing Agency',
  'Gym & Fitness',
  'Software Development',
  'Solar Energy Contractor',
  'Logistics Company',
  'Architecture Firm'
];

const cities = {
  USA: [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
    'Dallas', 'San Francisco', 'Seattle', 'Boston', 'Austin',
    'Denver', 'Miami', 'Atlanta', 'San Diego', 'Philadelphia'
  ],
  Canada: [
    'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton',
    'Ottawa', 'Winnipeg', 'Quebec City', 'Halifax', 'Victoria',
    'Hamilton', 'Kitchener', 'London', 'Windsor', 'Saskatoon'
  ],
  India: [
    'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai',
    'Pune', 'Kolkata', 'Ahmedabad', 'Gurgaon', 'Noida',
    'Chandigarh', 'Lucknow', 'Indore', 'Kochi', 'Coimbatore'
  ]
};

// Build target list (interleaving countries to keep output mixed)
const targets = [];
const maxCities = Math.min(cities.USA.length, cities.Canada.length, cities.India.length);

for (let i = 0; i < maxCities; i++) {
  for (const niche of niches) {
    targets.push({ country: 'USA', city: cities.USA[i], niche });
    targets.push({ country: 'Canada', city: cities.Canada[i], niche });
    targets.push({ country: 'India', city: cities.India[i], niche });
  }
}

// Helpers for CSV handling
function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  str = str.replace(/"/g, '""'); // Escape inner quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str}"`;
  }
  return str;
}

function appendToCSV(lead) {
  const row = [
    escapeCSV(lead.name),
    escapeCSV(lead.company),
    escapeCSV(lead.email),
    escapeCSV(lead.phone),
    escapeCSV(lead.website),
    escapeCSV(lead.city),
    escapeCSV(lead.country),
    escapeCSV(lead.industry),
    escapeCSV(lead.notes)
  ].join(',');
  
  fs.appendFileSync(CSV_FILE, row + '\n', 'utf8');
}

function loadExistingEmails() {
  const emails = new Set();
  const companies = new Set();
  
  if (fs.existsSync(CSV_FILE)) {
    console.log(`Reading existing CSV: ${CSV_FILE}`);
    const content = fs.readFileSync(CSV_FILE, 'utf8');
    const lines = content.split('\n');
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length >= 3) {
        // Regex parse to extract clean email addresses
        const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          emails.add(emailMatch[0].toLowerCase());
        }
        const company = parts[1]?.replace(/^"|"$/g, '').trim();
        if (company) {
          companies.add(company.toLowerCase());
        }
      }
    }
  } else {
    // Write header if file does not exist
    const header = 'Name,Company,Email,Phone,Website,City,Country,Industry,Notes\n';
    fs.writeFileSync(CSV_FILE, header, 'utf8');
  }
  
  return { emails, companies };
}

const PROCESSED_TARGETS_FILE = path.join(__dirname, '../processed_targets.json');

function loadProcessedTargets() {
  const processed = new Set();
  
  if (fs.existsSync(PROCESSED_TARGETS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PROCESSED_TARGETS_FILE, 'utf8'));
      data.forEach(item => processed.add(item.toLowerCase()));
      return processed;
    } catch (e) {}
  }
  
  // Infer completed targets from existing CSV if JSON does not exist
  if (fs.existsSync(CSV_FILE)) {
    try {
      console.log('Inferring completed targets from CSV...');
      const content = fs.readFileSync(CSV_FILE, 'utf8');
      const lines = content.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple double quote character parser for CSV values
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        
        const city = values[5]?.replace(/^"|"$/g, '').trim();
        const country = values[6]?.replace(/^"|"$/g, '').trim();
        const industry = values[7]?.replace(/^"|"$/g, '').trim();
        
        if (city && country && industry) {
          const key = `${country}-${city}-${industry}`.toLowerCase();
          processed.add(key);
        }
      }
      fs.writeFileSync(PROCESSED_TARGETS_FILE, JSON.stringify(Array.from(processed), null, 2), 'utf8');
      console.log(`📊 Inferred ${processed.size} completed targets from CSV.`);
    } catch (e) {
      console.log('⚠️ Error inferring processed targets from CSV:', e.message);
    }
  }
  
  return processed;
}

function saveProcessedTarget(targetKey) {
  try {
    let list = [];
    if (fs.existsSync(PROCESSED_TARGETS_FILE)) {
      list = JSON.parse(fs.readFileSync(PROCESSED_TARGETS_FILE, 'utf8'));
    }
    const set = new Set(list.map(s => s.toLowerCase()));
    set.add(targetKey.toLowerCase());
    fs.writeFileSync(PROCESSED_TARGETS_FILE, JSON.stringify(Array.from(set), null, 2), 'utf8');
  } catch (err) {
    console.log('⚠️ Failed to save processed target:', err.message);
  }
}

async function run() {
  console.log('🚀 Starting 1000 Verified Leads Compilation...');
  
  const { emails: existingEmails, companies: existingCompanies } = loadExistingEmails();
  let leadsCount = existingEmails.size;
  console.log(`📊 Loaded ${leadsCount} existing leads from CSV.`);
  
  if (leadsCount >= 1000) {
    console.log('✅ 1000 leads already compiled in CSV! Exiting.');
    return;
  }
  
  const processedTargets = loadProcessedTargets();
  
  // Graceful shutdown listener
  let isShutdown = false;
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutdown requested. Closing browser and exiting gracefully...');
    isShutdown = true;
    await browserManager.close();
    process.exit(0);
  });

  for (const target of targets) {
    if (leadsCount >= 1000 || isShutdown) break;
    
    const targetKey = `${target.country}-${target.city}-${target.niche}`.toLowerCase();
    if (processedTargets.has(targetKey)) {
      console.log(`⏭️ Skipping completed target: Niche="${target.niche}" | City="${target.city}" | Country="${target.country}"`);
      continue;
    }
    
    console.log(`\n🔍 TARGET: Niche="${target.niche}" | City="${target.city}" | Country="${target.country}" (Progress: ${leadsCount}/1000)`);
    
    try {
      // Scrape listings from Google Maps for this niche/city
      const places = await scrapeGoogleMaps(target.niche, `${target.city}, ${target.country}`, 15);
      console.log(`📍 Found ${places.length} places on Maps. Resolving websites and emails...`);
      
      for (const place of places) {
        if (leadsCount >= 1000 || isShutdown) break;
        
        const companyKey = place.name.toLowerCase();
        if (existingCompanies.has(companyKey)) {
          console.log(`  ⏭️ Skip duplicate company: "${place.name}"`);
          continue;
        }
        
        let website = place.website;
        let emailsFound = [];
        
        if (website) {
          console.log(`  🌐 Scraping website (cheerio): ${website}`);
          try {
            const scanResults = await scrapeWebsiteForEmails(website);
            emailsFound = scanResults.emails || [];
            
            if (emailsFound.length === 0) {
              console.log(`  🕵️ No emails found via cheerio. Falling back to Puppeteer: ${website}`);
              const puppeteerResults = await scrapeWebsiteWithPuppeteer(website);
              emailsFound = puppeteerResults.emails || [];
            }
          } catch (scanErr) {
            console.log(`  ⚠️ Failed to scrape website ${website}:`, scanErr.message);
          }
        }
        
        // Verify extracted emails
        const verifiedEmails = [];
        for (const rawEmail of emailsFound) {
          const email = rawEmail.toLowerCase().trim();
          if (existingEmails.has(email)) continue;
          
          console.log(`  🔍 Verifying email: ${email}`);
          const verification = await verifyEmail(email);
          if (verification.isValid) {
            verifiedEmails.push(email);
          } else {
            console.log(`  ❌ Invalid: ${email} (Reason: ${verification.reason})`);
          }
        }
        
        // Save lead if we have at least one verified email address
        if (verifiedEmails.length > 0) {
          const primaryEmail = verifiedEmails[0];
          
          existingEmails.add(primaryEmail);
          existingCompanies.add(companyKey);
          
          const lead = {
            name: `${place.name} Contact`,
            company: place.name,
            email: primaryEmail,
            phone: place.phone || null,
            website: place.website || null,
            city: place.city || target.city,
            country: target.country,
            industry: place.industry || target.niche,
            notes: `Sourced in bulk lead generation. Maps Rating: ${place.rating || 'N/A'}. Address: ${place.address || 'N/A'}`
          };
          
          appendToCSV(lead);
          
          // Insert into Supabase leads table
          try {
            await supabase.from('leads').insert({
              ...lead,
              status: 'New',
              lead_score: 'Cold'
            });
            console.log(`  ✅ Added Lead #${leadsCount + 1}: "${lead.company}" (${lead.email}) to CSV and CRM DB`);
          } catch (dbErr) {
            console.log(`  ✅ Added Lead #${leadsCount + 1} to CSV (DB insert failed: ${dbErr.message})`);
          }
          
          leadsCount++;
        }
      }
      
      // Save target as successfully processed (since we finished scraping and resolving all places in it)
      if (!isShutdown && leadsCount < 1000) {
        saveProcessedTarget(targetKey);
        console.log(`💾 Saved target key as fully completed: "${targetKey}"`);
      }
      
      // Delay between target searches to emulate organic patterns
      await new Promise(r => setTimeout(r, 3000));
      
    } catch (err) {
      console.error(`❌ Error for target niche "${target.niche}" in ${target.city}:`, err.message);
    }
  }
  
  // Shutdown browser explicitly at the end
  await browserManager.close();
  console.log(`\n🎉 Success! Completed compilation. Total leads in CSV: ${leadsCount}`);
}

run();
