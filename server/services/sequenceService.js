const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const supabase = require('./supabaseService');
const emailService = require('./emailService');
const templateEngine = require('../utils/templateEngine');
const timezoneHelper = require('../utils/timezoneHelper');
const nameHelper = require('../utils/nameHelper');

// Store Cron Task instance
let cronTask = null;

/**
 * Initialize and start the sequence cron scheduler
 */
function startScheduler() {
  console.log('⏰ Starting Outreach Sequence Cron Scheduler (30 Sec Interval)...');
  
  // Runs every 30 seconds to check if any emails are scheduled for sending
  cronTask = cron.schedule('*/30 * * * * *', async () => {
    console.log('⏰ Running scheduled outreach checks...');
    try {
      await processDueSequences();
    } catch (err) {
      console.error('❌ Scheduler run failed:', err.message);
    }
  });
}

/**
 * Stop the scheduler
 */
function stopScheduler() {
  if (cronTask) {
    cronTask.stop();
    console.log('⏰ Sequence Cron Scheduler stopped.');
  }
}

/**
 * Processes all running sequences that are due for their next send
 */
async function processDueSequences() {
  const now = new Date().toISOString();

  // 1. Fetch running sequences that are due for next send
  const { data: dueSequences, error } = await supabase
    .from('sequences')
    .select(`
      id,
      lead_id,
      current_step,
      status,
      next_sent_at,
      leads (
        id,
        name,
        company,
        email,
        website,
        industry,
        city,
        country
      )
    `)
    .eq('status', 'Running')
    .lte('next_sent_at', now);

  if (error) {
    console.error('Error fetching due sequences:', error.message);
    return;
  }

  if (!dueSequences || dueSequences.length === 0) {
    console.log('💤 No outreach emails due at this time.');
    return;
  }

  console.log(`🚀 Found ${dueSequences.length} due outreach sequences to process.`);

  // 2. Fetch default schedule settings and signature
  const { data: limitSettings } = await supabase.from('settings').select('value').eq('key', 'sending_schedule').maybeSingle();
  const { data: sigSettings } = await supabase.from('settings').select('value').eq('key', 'email_signature').maybeSingle();

  const scheduleConfig = limitSettings?.value || { allowed_days: [1, 2, 3, 4, 5, 6], start_hour: 9, end_hour: 18, batch_size: 10 };
  const emailSig = sigSettings?.value?.signature || '';

  // Process due sequences up to the batch limit
  const batchSize = scheduleConfig.batch_size || 10;
  const sequencesToProcess = dueSequences.slice(0, batchSize);

  for (const seq of sequencesToProcess) {
    await sendSequenceStep(seq, scheduleConfig, emailSig);
  }
}

/**
 * Sends a specific step of an outreach sequence to a lead
 */
async function sendSequenceStep(seq, scheduleConfig, emailSig) {
  const lead = seq.leads;
  const step = seq.current_step;

  console.log(`📧 Processing step ${step} for Lead: ${lead.name} (${lead.email})`);

  if (!lead.email) {
    console.error(`❌ Skip Lead ${lead.name}: Email address is missing.`);
    await supabase.from('sequences').update({ status: 'Stopped', updated_at: new Date().toISOString() }).eq('id', seq.id);
    return;
  }

  // 1. Get corresponding template for this step
  // Standard templates are named 'Email 1: The Diagnosis', 'Email 2: The Proof', etc.
  const { data: template, error: tempError } = await supabase
    .from('templates')
    .select('*')
    .eq('type', 'Email')
    .ilike('name', `Email ${step}:%`)
    .maybeSingle();

  if (tempError || !template) {
    console.error(`❌ No email template found for step ${step}. Pausing sequence.`);
    await supabase.from('sequences').update({ status: 'Paused', updated_at: new Date().toISOString() }).eq('id', seq.id);
    return;
  }

  // 2. Compile subject and body variables
  const greetingName = nameHelper.getCleanGreetingName(lead.name, lead.company);
  const companyShort = nameHelper.getCleanCompanyName(lead.company || lead.name);

  const dataContext = {
    name: greetingName, // Default name to greeting to prevent long/generic names
    greeting_name: greetingName,
    company: lead.company || 'your business',
    company_short: companyShort,
    website: lead.website || '',
    industry: lead.industry || 'your sector',
    city: lead.city || 'your city',
    deep_research: lead.deep_research || lead.notes || '',
    signature: emailSig
  };

  const compiledSubject = templateEngine.compileTemplate(template.subject, dataContext);
  const compiledBody = templateEngine.compileTemplate(template.body, dataContext);

  // Convert plain text breaks into HTML breaks for email representation, handling both literal \n and real newlines
  const htmlContent = compiledBody.replace(/\\n/g, '\n').replace(/\n/g, '<br/>');

  // 3. Create tracker ID and setup history logs
  const trackerId = uuidv4(); // Unique ID for open tracking

  // 4. Send the email via SMTP service
  const sendResult = await emailService.sendMail({
    to: lead.email,
    subject: compiledSubject,
    html: `<html><body>${htmlContent}</body></html>`,
    trackerId
  });

  if (!sendResult.success) {
    console.error(`❌ Send failed for lead ${lead.email}: ${sendResult.error}. Pausing sequence.`);
    await supabase.from('sequences').update({ status: 'Paused', updated_at: new Date().toISOString() }).eq('id', seq.id);
    return;
  }

  // 5. Successful Send: Record history & tracking logs
  // Create sequence history
  await supabase.from('sequence_history').insert({
    sequence_id: seq.id,
    lead_id: lead.id,
    step: step,
    template_id: template.id,
    email_id: trackerId,
    status: 'Sent'
  });

  // Create empty email tracking record
  await supabase.from('email_tracking').insert({
    lead_id: lead.id,
    email_id: trackerId,
    opens: 0
  });

  // Update lead status to Contacted (or Followed Up if step > 1)
  const newLeadStatus = step === 1 ? 'Contacted' : 'Followed Up';
  await supabase.from('leads').update({ status: newLeadStatus, updated_at: new Date().toISOString() }).eq('id', lead.id);

  // 6. Calculate next step and scheduled time
  // Delay rules:
  // Step 1 -> Step 2: 2 days delay
  // Step 2 -> Step 3: 4 days delay
  // Step 3 -> Step 4: 7 days delay
  // If we just sent step 4, the sequence is complete!
  if (step >= 4) {
    console.log(`✅ Sequence completed for Lead: ${lead.name}`);
    await supabase.from('sequences').update({
      current_step: step,
      status: 'Completed',
      last_sent_at: new Date().toISOString(),
      next_sent_at: null,
      updated_at: new Date().toISOString()
    }).eq('id', seq.id);
  } else {
    // Schedule next step
    const delays = { 1: 2, 2: 4, 3: 7 }; // Day delay between steps
    const daysDelay = delays[step] || 2;
    const nextSendUTC = timezoneHelper.calculateNextSendTime(scheduleConfig, lead.country || lead.city, daysDelay);

    console.log(`📅 Scheduled Step ${step + 1} for Lead: ${lead.name} at UTC ${nextSendUTC.toISOString()}`);

    await supabase.from('sequences').update({
      current_step: step + 1,
      last_sent_at: new Date().toISOString(),
      next_sent_at: nextSendUTC.toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', seq.id);
  }
}

/**
 * Initiates an outreach sequence for a single lead immediately
 * @param {string} leadId - UUID of the lead
 * @returns {Promise<Object>} - Operation result
 */
async function startSequenceForLead(leadId) {
  try {
    // Check if lead already has a running sequence
    const { data: existingSeq } = await supabase
      .from('sequences')
      .select('id, status')
      .eq('lead_id', leadId)
      .maybeSingle();

    if (existingSeq) {
      if (existingSeq.status === 'Running') {
        return { success: false, error: 'Sequence is already running for this lead.' };
      }
      // If sequence exists but is paused/stopped/completed, we can reset and start it
      const { error: resetError } = await supabase
        .from('sequences')
        .update({
          current_step: 1,
          status: 'Running',
          last_sent_at: null,
          next_sent_at: new Date().toISOString(), // Run on next cron tick (immediately)
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSeq.id);

      if (resetError) throw resetError;
      return { success: true, message: 'Sequence reset and restarted successfully.' };
    }

    // Insert new sequence starting immediately
    const { error: insertError } = await supabase
      .from('sequences')
      .insert({
        lead_id: leadId,
        current_step: 1,
        status: 'Running',
        next_sent_at: new Date().toISOString()
      });

    if (insertError) throw insertError;
    return { success: true, message: 'Sequence initiated successfully for lead.' };
  } catch (err) {
    console.error('Error starting sequence:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  processDueSequences,
  startSequenceForLead
};
