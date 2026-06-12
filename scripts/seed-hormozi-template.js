const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const hormoziTemplates = [
  {
    name: 'Email 1: The Diagnosis',
    type: 'Email',
    subject: 'quick question about {{company}}',
    body: `Hey {{name}},

I was looking at {{company}}'s online presence and noticed you aren't running any retargeting ads to capture local buyer traffic in {{city}}. 

Most agencies sell lead generation but deliver spreadsheets of fake phone numbers and ghosted leads. We recently set up a system for a similar business that generated 42 qualified calendar bookings in 30 days using real-time WhatsApp validation.

I put together a quick 90-second video showing the exact ad creatives and the instant qualification setup.

Would you like me to send it over? Just reply 'yes' and I will drop it in your inbox. No sales pitch or call.

Best,
{{signature}}`,
    variables: ['name', 'company', 'website', 'city', 'signature'],
    principle: 'Dream Outcome + Low CTA (Hormozi)'
  },
  {
    name: 'Email 2: The Proof',
    type: 'Email',
    subject: 'the lead quality issue in {{city}}',
    body: `Hey {{name}},

Here is the 3-part framework we use to generate high-intent appointments for {{company}}:

1. Verified Lead Forms: Meta auto-fills real phone numbers directly from their profiles.
2. 60-Second Auto-Nudges: The moment a lead is captured, our automated WhatsApp agent qualifies them and books them on your calendar.
3. Risk-Reversal Offer: You only pay for prospects who show up on the call.

We ran this setup for another client in your industry and dropped their lead-to-booking cost by 62% in under 3 weeks.

Would you like to see a free PDF of the targeting criteria we use? No pitch or sales call.

Best,
{{signature}}`,
    variables: ['name', 'company', 'website', 'city', 'signature'],
    principle: 'Perceived Likelihood (Hormozi)'
  },
  {
    name: 'Email 3: The Grand Slam',
    type: 'Email',
    subject: 'Free Meta campaign creatives, targeting filters, and funnel setup for {{company}}',
    body: `Hey {{name}},

Since I haven't heard back, I went ahead and created a complete Meta campaign package specifically for {{company}} to generate bookings in {{city}}:

1. Custom High-Converting Ad Copy & Creatives (value: $200).
2. Local Audience targeting parameters (value: $150).
3. WhatsApp qualifier workflow template (value: $100).

This is 100% free, no catches. I want to demonstrate that we can put bookings on your calendar before asking for a single dollar.

If you want me to send this package over, just reply 'yes' and it's yours.

Best,
{{signature}}`,
    variables: ['name', 'company', 'city', 'signature'],
    principle: 'Value Stack + Risk Reversal (Hormozi)'
  },
  {
    name: 'Email 4: The Breakup',
    type: 'Email',
    subject: 'moving on',
    body: `Hey {{name}},

I assume scaling booked appointments with a 100% show-up guarantee is not a priority for {{company}} right now, which is totally fine.

I won't email you again. However, I want to leave you with some value. Here is the link to our DIY Meta Ads Scaling & Validation Checklist: https://veloxisglobal.com/meta-playbook

If your goals change and you want to scale your client volume in {{city}}, you can always reach back out.

Wish you the best of luck with your business!

Best,
{{signature}}`,
    variables: ['name', 'company', 'city', 'signature'],
    principle: 'Goodwill + Long Game'
  }
];

async function seedHormozi() {
  console.log('🌱 Seeding Alex Hormozi Outreach Templates...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project-id')) {
    console.error('❌ Error: Supabase credentials missing. Run configuration first.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let updatedCount = 0;
  for (const template of hormoziTemplates) {
    try {
      // Find template by name and type
      const { data: existing } = await supabase
        .from('templates')
        .select('id')
        .eq('name', template.name)
        .eq('type', template.type)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from('templates')
          .update(template)
          .eq('id', existing.id);
        
        if (error) throw error;
        console.log(`🔄 Updated to Hormozi Style: ${template.name}`);
      } else {
        // Insert
        const { error } = await supabase
          .from('templates')
          .insert(template);

        if (error) throw error;
        console.log(`➕ Inserted Hormozi Style: ${template.name}`);
      }
      updatedCount++;
    } catch (err) {
      console.error(`❌ Failed to seed ${template.name}:`, err.message);
    }
  }

  console.log(`\n🎉 Alex Hormozi templates seeded successfully! Processed ${updatedCount} templates.`);
}

seedHormozi();
