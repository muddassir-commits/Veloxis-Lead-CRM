const supabase = require('./server/services/supabaseService');

async function run() {
  try {
    const { data: tracking } = await supabase.from('email_tracking').select('*');
    console.log(`Total tracking records: ${tracking?.length || 0}`);
    if (tracking) {
      tracking.forEach(t => {
        console.log(`id: ${t.id}, email_id: ${t.email_id}, lead_id: ${t.lead_id}, opens: ${t.opens}, last_opened: ${t.last_opened_at}`);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

run();
