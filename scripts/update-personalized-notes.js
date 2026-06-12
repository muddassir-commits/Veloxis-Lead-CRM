const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const supabase = require('../server/services/supabaseService');

async function run() {
  console.log('🚀 Fetching leads to populate personalized competitor audits...');
  
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, name, company, website, city, industry');

    if (error) throw error;

    console.log(`Found ${leads.length} leads in Supabase.`);

    let demoCount = 0;
    let enrichedCount = 0;

    // Cities to major competitor mappings for Indian Real Estate
    const competitorMap = {
      'gurgaon': ['DLF Limited', 'M3M India', 'Emaar India'],
      'noida': ['Godrej Properties', 'Eldeco Group', 'Supertech Limited'],
      'bangalore': ['Prestige Group', 'Sobha Limited', 'Brigade Group', 'Puravankara'],
      'mumbai': ['Lodha Group (Macrotech)', 'Oberoi Realty', 'Hiranandani Group'],
      'delhi': ['DLF Cybercity', 'TATA Housing', 'Godrej Properties'],
      'pune': ['Kolte-Patil Developers', 'Godrej Properties', 'Gera Developments'],
      'chennai': ['Casagrand Builder', 'Alliance Group', 'Akshaya Homes']
    };

    for (const lead of leads) {
      const isDemo = lead.name.toLowerCase().includes('test') || 
                     lead.company?.toLowerCase().includes('hormozi') || 
                     lead.name.toLowerCase().includes('demo');

      if (isDemo) {
        console.log(`- Lead "${lead.name}" is Demo -> Set to "N/A"`);
        await supabase
          .from('leads')
          .update({ notes: 'N/A', updated_at: new Date().toISOString() })
          .eq('id', lead.id);
        demoCount++;
        continue;
      }

      // Generate personalized note
      const cityLower = (lead.city || 'Delhi').toLowerCase().trim();
      const compList = competitorMap[cityLower] || ['Godrej Properties', 'TATA Housing'];
      // Deterministic selection based on lead ID
      const compIndex = lead.id.charCodeAt(0) % compList.length;
      const competitorName = compList[compIndex];

      // Company short name
      const companyShort = lead.company ? lead.company.split(' - ')[0].split(' | ')[0].trim() : 'this company';

      // Problems mapping
      const problemsList = [
        `Missing Meta (Facebook) Tracking Pixels on landing pages, causing them to bleed marketing budget without retargeting active prospects.`,
        `Slow lead callback times (exceeding 2 hours), resulting in prospects cooling off before sales contact.`,
        `High volume of fake/invalid phone number submissions on web forms due to lack of real-time mobile verification.`,
        `Landing pages are not mobile-optimized, resulting in slow load times and a drop in paid mobile traffic conversions.`
      ];
      const probIndex = lead.id.charCodeAt(1) % problemsList.length;
      const primaryProblem = problemsList[probIndex];

      // Comp strengths mapping
      const strengthsList = [
        `Running highly aggressive Meta Lead Generation campaigns with localized ad creatives, targeting high-net-worth individuals (HNIs) in the same micro-markets.`,
        `Using highly optimized landing pages with active tracking pixels and quick-response automated appointment bots.`,
        `Active video walk-through ads on Instagram/YouTube, driving highly motivated buyers to custom booking calendars.`
      ];
      const strengthIndex = lead.id.charCodeAt(2) % strengthsList.length;
      const compStrength = strengthsList[strengthIndex];

      const noteContent = 
`[COMPANY PROFILE]
${companyShort} is a real estate developer operating in ${lead.city || 'India'}. Website: ${lead.website || 'N/A'}.

[TOP COMPETITOR]
${competitorName}

[COMPETITOR ADVANTAGE]
${competitorName} is currently dominating the local market by ${compStrength}

[CRITICAL GAP / LACKING AREA]
${companyShort} is currently facing the following issue: ${primaryProblem}

[VELOXIS RECOMMENDATION]
Implement the Veloxis Zero-Spam Appointment Engine:
1. Integrate 60-Second Real-Time WhatsApp Lead validation (instantly filters fake numbers).
2. Set up automated retargeting pixels to recapture missed website traffic.
3. Transition to a risk-free Pay-Per-Showed-Up meeting performance pricing model.`;

      await supabase
        .from('leads')
        .update({ notes: noteContent, updated_at: new Date().toISOString() })
        .eq('id', lead.id);

      enrichedCount++;
      if (enrichedCount % 10 === 0) {
        console.log(`Processed ${enrichedCount} leads...`);
      }
    }

    console.log(`\n🎉 Notes update complete!`);
    console.log(`- Demo leads set to N/A: ${demoCount}`);
    console.log(`- Competitor audits generated: ${enrichedCount}`);

  } catch (err) {
    console.error('❌ Failed to generate notes:', err.message);
  }
}

run();
