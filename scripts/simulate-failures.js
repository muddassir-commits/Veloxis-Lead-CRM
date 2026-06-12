const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials are missing in the .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const isCleanup = process.argv.includes('--cleanup');

  if (isCleanup) {
    console.log('🧹 Cleaning up simulated failures...');
    try {
      // Restore verification failures key by removing mock failures
      const { data: verif } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'verification_failures')
        .maybeSingle();

      if (verif && verif.value && verif.value.failures) {
        const remainingFailures = verif.value.failures.filter(
          f => !f.email.includes('mocktest') && f.email !== 'info@mysite.com'
        );
        
        await supabase.from('settings').upsert({
          key: 'verification_failures',
          value: { failures: remainingFailures },
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
        console.log('✅ Cleaned up mock verification failures.');
      }

      // Delete simulated delivery failures
      const { data: testLeads } = await supabase
        .from('leads')
        .select('id')
        .ilike('email', '%mocktest%');

      if (testLeads && testLeads.length > 0) {
        const leadIds = testLeads.map(l => l.id);
        
        // Deleting the leads will cascade-delete the sequences and sequence_history
        const { error: deleteError } = await supabase
          .from('leads')
          .delete()
          .in('id', leadIds);

        if (deleteError) throw deleteError;
        console.log(`✅ Deleted ${testLeads.length} mock leads & their associated sequence history.`);
      }

      console.log('✨ Cleanup complete!');
    } catch (err) {
      console.error('❌ Cleanup failed:', err.message);
    }
    return;
  }

  console.log('🌱 Seeding mock failures for reporting test...');

  try {
    // 1. Seed verification failures
    const { data: verif } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'verification_failures')
      .maybeSingle();

    let failuresList = verif?.value?.failures || [];
    
    // Add mock failures
    const mockVerificationFailures = [
      { email: 'info@mysite.com', reason: 'Placeholder/template email', timestamp: new Date().toISOString() },
      { email: 'john.doe@mocktest.comfirst', reason: 'Invalid syntax', timestamp: new Date().toISOString() },
      { email: 'errors@sentry-next.wixpress.com', reason: 'Placeholder/template domain', timestamp: new Date().toISOString() },
      { email: 'buyer@burnermail.io', reason: 'Disposable email provider', timestamp: new Date().toISOString() },
      { email: 'contact@mocktest-no-mx.nz', reason: 'No MX records', timestamp: new Date().toISOString() }
    ];

    failuresList.push(...mockVerificationFailures);

    await supabase.from('settings').upsert({
      key: 'verification_failures',
      value: { failures: failuresList },
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    console.log('✅ Mock verification failures written to settings.');

    // 2. Create mock lead and sequence history for outreach failures
    // First insert a temporary lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        name: 'Mock Test Lead 1',
        company: 'Mock Business 1',
        email: 'sales@mocktest1.co.nz',
        status: 'Researched',
        country: 'New Zealand',
        city: 'Auckland',
        industry: 'Home Remodeling & Construction',
        notes: 'Simulated failure lead'
      })
      .select()
      .single();

    if (leadError) throw leadError;

    // Create a mock sequence
    const { data: seq, error: seqError } = await supabase
      .from('sequences')
      .insert({
        lead_id: lead.id,
        current_step: 1,
        status: 'Paused',
        next_sent_at: null
      })
      .select()
      .single();

    if (seqError) throw seqError;

    // Create sequence history record with status Failed
    const { error: histError } = await supabase
      .from('sequence_history')
      .insert({
        sequence_id: seq.id,
        lead_id: lead.id,
        step: 1,
        status: 'Failed: Inbox is full'
      });

    if (histError) throw histError;

    // Insert another mock failed lead
    const { data: lead2, error: leadError2 } = await supabase
      .from('leads')
      .insert({
        name: 'Mock Test Lead 2',
        company: 'Mock Business 2',
        email: 'contact@mocktest2.com',
        status: 'Researched',
        country: 'India',
        city: 'Delhi',
        industry: 'Gyms',
        notes: 'Simulated failure lead 2'
      })
      .select()
      .single();

    if (leadError2) throw leadError2;

    const { data: seq2, error: seqError2 } = await supabase
      .from('sequences')
      .insert({
        lead_id: lead2.id,
        current_step: 2,
        status: 'Paused',
        next_sent_at: null
      })
      .select()
      .single();

    if (seqError2) throw seqError2;

    const { error: histError2 } = await supabase
      .from('sequence_history')
      .insert({
        sequence_id: seq2.id,
        lead_id: lead2.id,
        step: 2,
        status: 'Failed: SMTP connection timed out'
      });

    if (histError2) throw histError2;

    console.log('✅ Mock outreach delivery failures written to sequence_history.');
    console.log('\n🎉 Mock failures successfully seeded!');
    console.log('👉 Now you can run the report using:');
    console.log('   node scripts/send-live-report.js');
    console.log('\n👉 After verifying the report, clean up with:');
    console.log('   node scripts/simulate-failures.js --cleanup');

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  }
}

run();
