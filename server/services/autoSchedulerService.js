const cron = require('node-cron');
const path = require('path');
const supabase = require('./supabaseService');
const scraperService = require('./scraperService');
const emailFinderService = require('./emailFinderService');
const sequenceService = require('./sequenceService');
const whatsappService = require('./whatsappService');
const telegramService = require('./telegramService');
const emailService = require('./emailService');

// Scheduler tasks
let dailyScrapeTask = null;
let dailyOutreachTask = null;
let dailyReportTask = null;

// Track state between cron triggers
let lastLeadsFoundCount = 0;

/**
 * Start the daily Lead Generation and Outreach automation scheduler
 */
function startAutoScheduler() {
  console.log('⏰ Starting Daily Lead Gen, Outreach & Report Auto Scheduler (9:00 AM, 10:00 AM & 7:00 PM IST)...');

  // 1. Scrape and find 100 verified emails daily at 9:00 AM IST
  dailyScrapeTask = cron.schedule('0 9 * * *', async () => {
    console.log('🌅 [Automation] Morning Lead Generation starting (9:00 AM IST)...');
    try {
      lastLeadsFoundCount = await runDailyLeadGeneration(100);
    } catch (err) {
      console.error('❌ Daily lead generation automation failed:', err.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  // 2. Kickoff daily outreach email dispatch at 10:00 AM IST
  dailyOutreachTask = cron.schedule('0 10 * * *', async () => {
    console.log('🚀 [Automation] Daily Outreach Emails Dispatch starting (10:00 AM IST)...');
    try {
      await sequenceService.processDueSequences();
    } catch (err) {
      console.error('❌ Daily outreach dispatch automation failed:', err.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  // 3. Send WhatsApp, Telegram, and Email report daily at 7:00 PM IST (End of Day summary)
  dailyReportTask = cron.schedule('0 19 * * *', async () => {
    console.log('📊 [Automation] Daily End-of-Day Summary Report starting (7:00 PM IST)...');
    try {
      await sendDailyReport();
    } catch (err) {
      console.error('❌ Daily report automation failed:', err.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });
}

/**
 * Stop the automation scheduler
 */
function stopAutoScheduler() {
  if (dailyScrapeTask) dailyScrapeTask.stop();
  if (dailyOutreachTask) dailyOutreachTask.stop();
  if (dailyReportTask) dailyReportTask.stop();
  console.log('⏰ Daily Lead Gen, Outreach, & Report Auto Scheduler stopped.');
}

/**
 * Automated pipeline to find verified leads and enqueue them into sequences
 * @param {number} targetCount - Number of verified leads to find
 * @returns {Promise<number>} - Actual number of leads enqueued
 */
// Global progress tracker
const leadGenProgress = {
  running: false,
  insertedCount: 0,
  targetCount: 0,
  currentQuery: '',
  currentCity: '',
  statusText: 'Idle'
};

/**
 * Automated pipeline to find verified leads and enqueue them into sequences
 * @param {number} targetCount - Number of verified leads to find
 * @param {Array<string>} [customIndustries] - Custom industries to scan
 * @param {Array<string>} [customRegions] - Custom cities to scan
 * @returns {Promise<number>} - Actual number of leads enqueued
 */
async function runDailyLeadGeneration(targetCount = 100, customIndustries = null, customRegions = null, mode = 'email') {
  leadGenProgress.running = true;
  leadGenProgress.insertedCount = 0;
  leadGenProgress.targetCount = targetCount;
  leadGenProgress.statusText = 'Starting lead generation process...';

  try {
    let insertedCount = 0;

    // Fetch active Ideal Customer Profile filters if not customized
    let industries = customIndustries;
    let regions = customRegions;

    if (!industries || !regions) {
      const { data: icp } = await supabase.from('icps').select('*').limit(1).maybeSingle();
      if (!industries) industries = icp?.industries || ['Real Estate Developer', 'Gyms', 'Dentist', 'MedSpa', 'E-commerce Store', 'Software Agency', 'Coaches & Consultants', 'Education / Coaching'];
      if (!regions) regions = icp?.regions || ['New York', 'Los Angeles', 'London', 'Berlin', 'Paris', 'Madrid', 'Gurgaon', 'Dubai', 'Sydney', 'Auckland', 'Sao Paulo', 'Johannesburg'];
    }

    console.log(`🤖 Daily Lead Gen: targetting ${targetCount} leads. Mode: ${mode}. Verticals: [${industries.join(', ')}] Locations: [${regions.join(', ')}]`);

    const processedEmails = new Set();

    for (const industry of industries) {
      if (insertedCount >= targetCount) break;

      for (const city of regions) {
        if (insertedCount >= targetCount) break;

        if (mode === 'instagram') {
          console.log(`🔍 Automation Instagram Social Search: "${industry}" in "${city}"...`);
          leadGenProgress.currentQuery = industry;
          leadGenProgress.currentCity = city;
          leadGenProgress.statusText = `Searching Instagram for "${industry}" in "${city}"...`;

          try {
            const listings = await scraperService.scrapeSocialProfiles('Instagram', industry, city, 20);
            console.log(`📋 Sourced ${listings.length} Instagram listings.`);
            leadGenProgress.statusText = `Found ${listings.length} Instagram profiles. Starting research...`;

            for (const item of listings) {
              if (insertedCount >= targetCount) break;

              const handle = item.instagram;
              if (!handle) continue;

              // Deduplicate against database
              const { data: existingLead } = await supabase
                .from('leads')
                .select('id')
                .eq('instagram', handle)
                .maybeSingle();

              if (existingLead) continue;

              leadGenProgress.statusText = `Researching digital presence for @${handle}...`;

              // Look up website if company name is available
              const searchWebsite = await emailFinderService.searchCompanyWebsite(item.name);
              const gaps = await emailFinderService.analyzeWebsiteGaps(searchWebsite);
              const reportText = emailFinderService.generateDeepResearchReport(item.name, industry, searchWebsite, gaps);

              const leadData = {
                name: item.name,
                company: item.company,
                website: searchWebsite || item.website || null,
                phone: null,
                email: null,
                linkedin: null,
                instagram: handle,
                city: city,
                country: 'India',
                industry: industry,
                rating: 4.0,
                status: 'Researched',
                lead_score: 'Hot',
                notes: reportText,
                deep_research: reportText
              };

              const { data: insertedLead, error: insertError } = await supabase
                .from('leads')
                .insert(leadData)
                .select()
                .single();

              if (insertError) {
                console.error('❌ Insert error for Instagram lead:', insertError.message);
                continue;
              }

              insertedCount++;
              leadGenProgress.insertedCount = insertedCount;
              leadGenProgress.statusText = `[${insertedCount}/${targetCount}] Sourced Instagram profile: @${handle}`;
              console.log(`✅ [${insertedCount}/${targetCount}] Sourced Instagram profile: @${handle}`);

              await new Promise(r => setTimeout(r, 1500));
            }
          } catch (err) {
            console.error(`❌ Instagram automation fetch failed for "${industry}" in "${city}":`, err.message);
          }
          continue; // Go to next city/industry
        }

        const query = `luxury ${industry.toLowerCase()}`;
        console.log(`🔍 Automation Google Maps Search: "${query}" in "${city}"...`);
        leadGenProgress.currentQuery = query;
        leadGenProgress.currentCity = city;
        leadGenProgress.statusText = `Searching Google Maps for "${query}" in "${city}"...`;

        try {
          const listings = await scraperService.scrapeGoogleMaps(query, city, 40);
          console.log(`📋 Sourced ${listings.length} listings from Maps.`);
          leadGenProgress.statusText = `Found ${listings.length} listings from Maps. Starting enrichment...`;

          for (const item of listings) {
            if (insertedCount >= targetCount) break;

            const website = item.website || null;
            if (!website) continue; // Requires website for email finding

            try {
              const cleanName = item.name.split(' - ')[0].split(' | ')[0].trim();
              leadGenProgress.statusText = `Searching emails & socials for "${cleanName}"...`;

              const enrichResult = await emailFinderService.findEmailForLead({
                name: 'Founder / CEO',
                company: item.name,
                website: website,
                notes: ''
              });

              const email = enrichResult.email;
              if (!email) continue;

              if (processedEmails.has(email.toLowerCase())) continue;
              processedEmails.add(email.toLowerCase());

              // Deduplicate against database
              const { data: existingLead } = await supabase
                .from('leads')
                .select('id')
                .eq('email', email)
                .maybeSingle();

              if (existingLead) continue;

              const leadData = {
                name: cleanName,
                company: cleanName,
                website: website,
                phone: item.phone || null,
                email: email,
                linkedin: enrichResult.linkedin || null,
                instagram: enrichResult.instagram || null,
                city: city,
                country: 'India',
                industry: industry,
                rating: item.rating || 4.0,
                status: 'Researched',
                lead_score: 'Hot',
                notes: `Auto-sourced via CRM Lead Generation Trigger on ${new Date().toLocaleDateString()}.\n` + enrichResult.notes
              };

              const { data: insertedLead, error: insertError } = await supabase
                .from('leads')
                .insert(leadData)
                .select()
                .single();

              if (insertError) continue;

              insertedCount++;
              leadGenProgress.insertedCount = insertedCount;
              leadGenProgress.statusText = `[${insertedCount}/${targetCount}] Sourced verified lead: "${cleanName}" (${email})`;
              console.log(`✅ [${insertedCount}/${targetCount}] Sourced verified lead: "${cleanName}" (${email})`);

              // Bulk start outreach sequence for the new lead
              await sequenceService.startSequenceForLead(insertedLead.id);
              console.log(`🚀 Automated Outreach campaign enqueued for lead: ${cleanName}`);

            } catch (enrichErr) {
              console.error(`⚠️ Automation enrichment error for "${item.name}":`, enrichErr.message);
            }

            await new Promise(r => setTimeout(r, 1500));
          }
        } catch (err) {
          console.error(`❌ Google Maps automation fetch failed for "${industry}" in "${city}":`, err.message);
        }
      }
    }

    console.log(`🎉 Daily Lead Gen Completed. Found and enqueued ${insertedCount} new verified leads.`);
    leadGenProgress.running = false;
    leadGenProgress.statusText = `Completed! Sourced and enqueued ${insertedCount} new verified leads.`;
    return insertedCount;
  } catch (err) {
    leadGenProgress.running = false;
    leadGenProgress.statusText = `Error: ${err.message}`;
    throw err;
  }
}

/**
 * Gather CRM statistics and dispatch summary reports via WhatsApp, Telegram, and Email
 */
async function sendDailyReport() {
  console.log('📊 Gathering daily CRM statistics for summary report...');

  // 1. Count active campaigns
  const { data: runningSequences } = await supabase.from('sequences').select('id').eq('status', 'Running');
  const totalActive = runningSequences?.length || 0;

  // 2. Gather CRM summary details
  const { data: leads } = await supabase.from('leads').select('status');
  const totalLeads = leads?.length || 0;

  const leadsByStatus = {};
  leads.forEach(l => {
    leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1;
  });

  const { data: history } = await supabase.from('sequence_history').select('id, sent_at');
  const totalSent = history?.length || 0;

  let emailsSentToday = 0;
  history.forEach(h => {
    const isSentToday = h.sent_at && (new Date(h.sent_at).toDateString() === new Date().toDateString());
    if (isSentToday) {
      emailsSentToday++;
    }
  });

  const { data: tracking } = await supabase.from('email_tracking').select('opens');
  const uniqueOpened = tracking?.filter(t => t.opens > 0).length || 0;
  const openRate = totalSent > 0 ? Math.round((uniqueOpened / totalSent) * 100) : 0;

  const dateStr = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  // 3. Construct summary message
  const reportText =
    `📊 *Veloxis CRM Outreach Daily Report*
📅 Date: ${dateStr}

✅ *Lead Gen Summary (9:00 AM IST)*
- Daily verified leads enqueued: ${lastLeadsFoundCount}

🚀 *Outreach Summary (End-of-Day)*
- Outreach emails sent today: ${emailsSentToday}
- Total sent to date: ${totalSent}
- Active running campaigns: ${totalActive}

📈 *CRM Funnel Metrics*
- Leads Tracked: ${totalLeads}
- Researched: ${leadsByStatus['Researched'] || 0}
- Contacted: ${leadsByStatus['Contacted'] || 0}
- Followed Up: ${leadsByStatus['Followed Up'] || 0}
- Replied: ${leadsByStatus['Replied'] || 0}
- Open Rate: ${openRate}%
- Replies Received: ${leadsByStatus['Replied'] || 0}`;

  console.log('📱 Outbound Report Text:\n', reportText);

  // 4. Send WhatsApp notification (Wrapped in try-catch so it won't crash scheduler)
  try {
    await whatsappService.sendWhatsAppMessage(reportText);
  } catch (waErr) {
    console.error('⚠️ Failed to dispatch WhatsApp message:', waErr.message);
  }

  // 5. Send Telegram notification
  try {
    await telegramService.sendTelegramMessage(reportText);
  } catch (tgErr) {
    console.error('⚠️ Failed to dispatch Telegram message:', tgErr.message);
  }

  // 6. Send Email summary report (100% reliable backup!)
  try {
    const reportHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">📊 Veloxis CRM Outreach Daily Report</h2>
          <p>📅 <strong>Date:</strong> ${dateStr}</p>
          
          <h3 style="color: #2196F3; margin-top: 20px;">✅ Lead Gen Summary (9:00 AM IST)</h3>
          <ul>
            <li><strong>Daily verified leads enqueued:</strong> ${lastLeadsFoundCount}</li>
          </ul>
          
          <h3 style="color: #2196F3; margin-top: 20px;">🚀 Outreach Summary (End-of-Day)</h3>
          <ul>
            <li><strong>Outreach emails sent today:</strong> ${emailsSentToday}</li>
            <li><strong>Total sent to date:</strong> ${totalSent}</li>
            <li><strong>Active running campaigns:</strong> ${totalActive}</li>
          </ul>
          
          <h3 style="color: #2196F3; margin-top: 20px;">📈 CRM Funnel Metrics</h3>
          <ul>
            <li><strong>Leads Tracked:</strong> ${totalLeads}</li>
            <li><strong>Researched:</strong> ${leadsByStatus['Researched'] || 0}</li>
            <li><strong>Contacted:</strong> ${leadsByStatus['Contacted'] || 0}</li>
            <li><strong>Followed Up:</strong> ${leadsByStatus['Followed Up'] || 0}</li>
            <li><strong>Replied:</strong> ${leadsByStatus['Replied'] || 0}</li>
            <li><strong>Open Rate:</strong> ${openRate}%</li>
            <li><strong>Replies Received:</strong> ${leadsByStatus['Replied'] || 0}</li>
          </ul>
          <p style="font-size: 12px; color: #777; margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
            Sent automatically by Veloxis Command Center scheduler.
          </p>
        </body>
      </html>
    `;

    const recipient = process.env.REPORT_EMAIL || 'muddassiralidude@gmail.com';
    await emailService.sendMail({
      to: recipient,
      subject: `📊 Veloxis CRM Daily Report — ${dateStr}`,
      html: reportHtml
    });
    console.log(`✉️ Daily Report Email dispatched successfully to ${recipient}.`);
  } catch (emailErr) {
    console.error('⚠️ Failed to send Daily Report Email:', emailErr.message);
  }
}

module.exports = {
  startAutoScheduler,
  stopAutoScheduler,
  runDailyLeadGeneration,
  sendDailyReport,
  leadGenProgress
};
