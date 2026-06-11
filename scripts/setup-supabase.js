const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function setupSupabase() {
  console.log('⚡ Starting Supabase Configuration Verification...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || supabaseUrl.includes('your-project-id')) {
    console.error('❌ Error: SUPABASE_URL is not set or contains default placeholder.');
    console.log('👉 Please edit the .env file in the project root and add your Supabase credentials.');
    process.exit(1);
  }

  if (!supabaseKey || supabaseKey.includes('anon-key') || supabaseKey.includes('service-role-key')) {
    console.error('❌ Error: SUPABASE API keys are not set.');
    console.log('👉 Please edit the .env file in the project root and add your Supabase Anon/Service keys.');
    process.exit(1);
  }

  console.log(`📡 Connecting to Supabase at: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check if leads table exists
    console.log('🔍 Checking database tables...');
    const { data, error } = await supabase.from('leads').select('id').limit(1);

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('\n⚠️  Database tables do not exist yet.');
        printSetupInstructions();
      } else {
        throw error;
      }
    } else {
      console.log('✅ Connection Successful! Leads table verified.');
      console.log('🎉 Database is already initialized and ready to go!');
    }
  } catch (err) {
    console.error('❌ Connection Failed:', err.message);
    console.log('\n🔍 Troubleshoot steps:');
    console.log('1. Make sure your internet connection is active.');
    console.log('2. Check if your database IP restrictions are disabled on Supabase.');
    console.log('3. Double check the keys in your .env file.');
  }
}

function printSetupInstructions() {
  console.log('================================================================');
  console.log('📋 HOW TO INITIALIZE YOUR SUPABASE SCHEMA (FREE & FAST)');
  console.log('================================================================');
  console.log('1. Log into your Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project: "Veloxis Leads CRM"');
  console.log('3. Click on the "SQL Editor" tab (in the left sidebar, looks like ">_")');
  console.log('4. Click "+ New Query"');
  console.log('5. Open the schema file in this project:');
  console.log(`   [schema.sql](file:///${path.resolve(__dirname, '../server/db/schema.sql').replace(/\\/g, '/')})`);
  console.log('6. Copy the entire contents of schema.sql, paste it in the SQL Editor, and click "Run" (or Ctrl+Enter)');
  console.log('7. Open the seed file:');
  console.log(`   [seed.sql](file:///${path.resolve(__dirname, '../server/db/seed.sql').replace(/\\/g, '/')})`);
  console.log('8. Copy and paste seed.sql contents into a new query in the SQL Editor and click "Run".');
  console.log('9. Re-run this script to verify:');
  console.log('   npm run setup:supabase');
  console.log('================================================================\n');
}

setupSupabase();
