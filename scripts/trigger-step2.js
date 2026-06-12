const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const supabase = require('../server/services/supabaseService');
const sequenceService = require('../server/services/sequenceService');

async function run() {
  console.log('🚀 Updating company names and setting sequences to Step 2 for test leads...');
  
  const emails = [
    'muddassiralidude+test1@gmail.com',
    'muddassiralidude+test2@gmail.com',
    'muddassiralidude+test3@gmail.com',
    'muddassiralidude+test4@gmail.com',
    'muddassiralidude+test5@gmail.com'
  ];

  // 1. Realistic company names mapping
  const companyNames = {
    'muddassiralidude+test1@gmail.com': 'Ganga Realty',
    'muddassiralidude+test2@gmail.com': 'Experion Developers',
    'muddassiralidude+test3@gmail.com': 'Saya Homes',
    'muddassiralidude+test4@gmail.com': 'Max Estates',
    'muddassiralidude+test5@gmail.com': 'CBS Developers'
  };

  // 2. Fetch test leads
  const { data: leads, error: fetchErr } = await supabase
    .from('leads')
    .select('id, name, email')
    .in('email', emails);

  if (fetchErr || !leads || leads.length === 0) {
    console.error('Test leads not found:', fetchErr?.message || 'Empty list');
    return;
  }

  // 3. Update company names in CRM
  for (const lead of leads) {
    const company = companyNames[lead.email];
    await supabase
      .from('leads')
      .update({ company: company, updated_at: new Date().toISOString() })
      .eq('id', lead.id);
    console.log(`💼 Updated "${lead.name}" company name to: "${company}"`);
  }

  // 4. Update sequence state: Set current_step = 2, next_sent_at = now
  console.log('\n📅 Adjusting sequence states to Step 2 (Due immediately)...');
  for (const lead of leads) {
    const { data: seq } = await supabase
      .from('sequences')
      .select('id')
      .eq('lead_id', lead.id)
      .maybeSingle();

    if (seq) {
      await supabase
        .from('sequences')
        .update({
          current_step: 2,
          status: 'Running',
          next_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', seq.id);
      console.log(`➡️ Set sequence Step 2 for: "${lead.name}"`);
    } else {
      console.log(`⚠️ No active sequence found for "${lead.name}". Starting one...`);
      const res = await sequenceService.startSequenceForLead(lead.id);
      if (res.success) {
        // Now update it to Step 2
        const { data: newSeq } = await supabase.from('sequences').select('id').eq('lead_id', lead.id).single();
        await supabase
          .from('sequences')
          .update({
            current_step: 2,
            next_sent_at: new Date().toISOString()
          })
          .eq('id', newSeq.id);
      }
    }
  }

  // 5. Trigger dispatch programmatically
  console.log('\n🚀 Triggering dispatch pipeline for Step 2 emails...');
  try {
    await sequenceService.processDueSequences();
    console.log('✅ Step 2 dispatch execution complete.');
  } catch (err) {
    console.error('❌ Failed processing Step 2 sequences:', err.message);
  }
}

run().catch(console.error);
