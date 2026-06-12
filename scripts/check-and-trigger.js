const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const supabase = require('../server/services/supabaseService');
const sequenceService = require('../server/services/sequenceService');

async function run() {
  console.log('🔍 Checking 5 test leads and their sequence states...');
  
  const emails = [
    'muddassiralidude+test1@gmail.com',
    'muddassiralidude+test2@gmail.com',
    'muddassiralidude+test3@gmail.com',
    'muddassiralidude+test4@gmail.com',
    'muddassiralidude+test5@gmail.com'
  ];

  // 1. Fetch leads
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select('id, name, email')
    .in('email', emails);

  if (leadsErr) {
    console.error('Error fetching leads:', leadsErr.message);
    return;
  }

  console.log(`Found ${leads.length} test leads in the database.`);

  // 2. Ensure all 5 leads exist. If one is missing, re-insert it!
  const foundEmails = leads.map(l => l.email);
  const baseEmail = 'muddassiralidude';
  const domain = 'gmail.com';
  
  const testLeadsSchema = {
    'muddassiralidude+test1@gmail.com': { name: 'John Doe - Test 1', company: 'Hormozi Real Estate 1', city: 'Gurgaon' },
    'muddassiralidude+test2@gmail.com': { name: 'Jane Smith - Test 2', company: 'Hormozi Real Estate 2', city: 'Noida' },
    'muddassiralidude+test3@gmail.com': { name: 'Robert Johnson - Test 3', company: 'Hormozi Real Estate 3', city: 'Bangalore' },
    'muddassiralidude+test4@gmail.com': { name: 'Emily Davis - Test 4', company: 'Hormozi Real Estate 4', city: 'Mumbai' },
    'muddassiralidude+test5@gmail.com': { name: 'Michael Brown - Test 5', company: 'Hormozi Real Estate 5', city: 'Delhi' }
  };

  for (const email of emails) {
    if (!foundEmails.includes(email)) {
      console.log(`➕ Re-inserting missing lead: ${email}`);
      const info = testLeadsSchema[email];
      const { data: newLead, error: insertErr } = await supabase
        .from('leads')
        .insert({
          name: info.name,
          company: info.company,
          email: email,
          website: `https://example-${info.company.replace(/\s+/g, '-').toLowerCase()}.com`,
          city: info.city,
          country: 'India',
          industry: 'Real Estate Developer',
          lead_score: 'Hot',
          status: 'New',
          notes: 'Test lead recreated for sequence testing.'
        })
        .select()
        .single();
      
      if (insertErr) {
        console.error(`Failed to insert lead ${email}:`, insertErr.message);
      } else {
        leads.push(newLead);
      }
    }
  }

  // 3. Check sequence states and ensure they are all in "Running" status
  console.log('\n🔄 Checking sequence states for the 5 test leads...');
  for (const lead of leads) {
    const { data: sequence } = await supabase
      .from('sequences')
      .select('id, status')
      .eq('lead_id', lead.id)
      .maybeSingle();

    if (!sequence) {
      console.log(`➕ Starting new sequence for "${lead.name}"...`);
      await sequenceService.startSequenceForLead(lead.id);
    } else if (sequence.status !== 'Running') {
      console.log(`🔄 Resetting and activating sequence for "${lead.name}" (currently: ${sequence.status})...`);
      await supabase
        .from('sequences')
        .update({
          status: 'Running',
          current_step: 1,
          next_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sequence.id);
    } else {
      console.log(`🟢 Sequence for "${lead.name}" is already Running and active.`);
    }
  }

  // 4. Trigger process due sequences right now to send the emails!
  console.log('\n🚀 Triggering dispatch pipeline for all due sequences...');
  try {
    await sequenceService.processDueSequences();
    console.log('✅ Dispatch execution complete.');
  } catch (err) {
    console.error('❌ Failed processing sequences:', err.message);
  }
}

run().catch(console.error);
