const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function cleanDatabase() {
  console.log('🧹 Starting Database Cleanup...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Supabase credentials are missing in the .env file.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🗑️ Deleting all leads from "leads" table...');
    console.log('💡 Note: Foreign key cascading will automatically clear active sequences, history, and tracking records.');
    
    const { data, error } = await supabase
      .from('leads')
      .delete()
      .not('id', 'is', null)
      .select('id');

    if (error) throw error;

    const count = data ? data.length : 0;
    console.log(`✅ Success! Deleted ${count} leads and all associated sequence history/tracking records.`);
    console.log('✨ Your CRM is now clean, fresh, and ready for real leads!');
  } catch (err) {
    console.error('❌ Cleanup Failed:', err.message);
    process.exit(1);
  }
}

cleanDatabase();
