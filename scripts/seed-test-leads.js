const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const supabase = require('../server/services/supabaseService');

async function seed() {
  console.log('🚀 Seeding 5 test leads with Gmail aliases for inbox: muddassiralidude@gmail.com...');
  
  const baseEmail = 'muddassiralidude';
  const domain = 'gmail.com';
  
  const testLeads = [
    {
      name: 'John Doe - Test 1',
      company: 'Hormozi Real Estate 1',
      email: `${baseEmail}+test1@${domain}`,
      website: 'https://example-realestate1.com',
      city: 'Gurgaon',
      country: 'India',
      industry: 'Real Estate Developer',
      lead_score: 'Hot',
      status: 'New',
      notes: 'Test lead 1 for sequence validation.'
    },
    {
      name: 'Jane Smith - Test 2',
      company: 'Hormozi Real Estate 2',
      email: `${baseEmail}+test2@${domain}`,
      website: 'https://example-realestate2.com',
      city: 'Noida',
      country: 'India',
      industry: 'Real Estate Developer',
      lead_score: 'Hot',
      status: 'New',
      notes: 'Test lead 2 for sequence validation.'
    },
    {
      name: 'Robert Johnson - Test 3',
      company: 'Hormozi Real Estate 3',
      email: `${baseEmail}+test3@${domain}`,
      website: 'https://example-realestate3.com',
      city: 'Bangalore',
      country: 'India',
      industry: 'Real Estate Developer',
      lead_score: 'Hot',
      status: 'New',
      notes: 'Test lead 3 for sequence validation.'
    },
    {
      name: 'Emily Davis - Test 4',
      company: 'Hormozi Real Estate 4',
      email: `${baseEmail}+test4@${domain}`,
      website: 'https://example-realestate4.com',
      city: 'Mumbai',
      country: 'India',
      industry: 'Real Estate Developer',
      lead_score: 'Hot',
      status: 'New',
      notes: 'Test lead 4 for sequence validation.'
    },
    {
      name: 'Michael Brown - Test 5',
      company: 'Hormozi Real Estate 5',
      email: `${baseEmail}+test5@${domain}`,
      website: 'https://example-realestate5.com',
      city: 'Delhi',
      country: 'India',
      industry: 'Real Estate Developer',
      lead_score: 'Hot',
      status: 'New',
      notes: 'Test lead 5 for sequence validation.'
    }
  ];

  for (const lead of testLeads) {
    try {
      // Delete existing lead with same email if present to avoid unique error
      await supabase.from('leads').delete().eq('email', lead.email);
      
      const { data, error } = await supabase.from('leads').insert(lead).select().single();
      if (error) throw error;
      console.log(`✅ Seeded lead: "${data.name}" -> ${data.email}`);
    } catch (err) {
      console.error(`❌ Failed to seed lead: ${lead.name}`, err.message);
    }
  }
  
  console.log('🎉 Completed seeding test leads.');
}

seed();
