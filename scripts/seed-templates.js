const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const templatesData = [
  // COLD EMAIL SEQUENCE (8 Templates)
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
  },
  {
    name: 'Email 5: The Competitor (Alt Day 1)',
    type: 'Email',
    subject: 'quick note about your competitors\' ads',
    body: `Hey {{name}},

I was checking local advertising in {{city}} and noticed your direct competitors are running high-volume Meta campaigns to capture {{industry}} clients.

Because they have active ads running, they are likely vacuuming up 30-40 leads a week that should be coming to {{company}}.

I ran a quick analysis on the specific ad copy and creative formats they are running and found 2 major gaps in their strategy you can exploit.

Should I send over this competitor ad intelligence report? Just reply 'yes'.

Best,
{{signature}}`,
    variables: ['name', 'company', 'industry', 'city', 'signature'],
    principle: 'Dream Outcome + Urgency'
  },
  {
    name: 'Email 6: The Quick Win (Alt Day 1)',
    type: 'Email',
    subject: 'one quick fix for {{company}}\'s pixel',
    body: `Hey {{name}},

I was reviewing your site and noticed {{company}} has a missing or misconfigured Meta Pixel tracking tag. This means you are losing 100% of the retargeting data for visitors who view your page.

It takes about 5 minutes to fix and verify. I wrote down the step-by-step setup guide on how your developer can plug this leak immediately.

Would you like me to send the instructions over? Just reply 'yes'.

Best,
{{signature}}`,
    variables: ['name', 'company', 'signature'],
    principle: 'Low Time Delay + Low Effort'
  },
  {
    name: 'Email 7: The Referral',
    type: 'Email',
    subject: 'referral request',
    body: `Hey {{name}},

I'm so glad we were able to scale your lead generation volume and booking flow. We love working with teams like {{company}}.

Do you know any other business owners in {{industry}} who are looking to double their client acquisition using verified Meta Ads funnels? I'd love to set up a free custom campaign mockup for them.

Appreciate your help!

Best,
{{signature}}`,
    variables: ['name', 'company', 'industry', 'signature'],
    principle: 'Social Proof'
  },
  {
    name: 'Email 8: The Re-Engage',
    type: 'Email',
    subject: 'checking back in',
    body: `Hey {{name}},

I was reviewing {{company}}'s social presence again and saw you launched a new campaign or vertical recently.

I put together a custom Meta retargeting strategy specifically tailored for this expansion to help you capture hot leads without high budget waste.

Would you like me to send the blueprint over?

Best,
{{signature}}`,
    variables: ['name', 'company', 'signature'],
    principle: 'Fresh Value'
  },

  // LINKEDIN MESSAGES (5 Templates)
  {
    name: 'LinkedIn 1: The Connect',
    type: 'LinkedIn',
    subject: null,
    body: `Hey {{name}}, saw your work in {{industry}} in {{city}}. Love the project you guys did recently. Let's connect!`,
    variables: ['name', 'industry', 'city'],
    principle: 'Networking Opener'
  },
  {
    name: 'LinkedIn 2: The Opener',
    type: 'LinkedIn',
    subject: null,
    body: `Thanks for connecting, {{name}}! I've been following {{company}} for a bit. Curious, are you guys currently focused on increasing your booked appointment pipeline or organic channels this quarter?`,
    variables: ['name', 'company'],
    principle: 'Curiosity Hook'
  },
  {
    name: 'LinkedIn 3: The Value Drop',
    type: 'LinkedIn',
    subject: null,
    body: `Hey {{name}}, I ran a quick check on {{company}}'s ad assets in {{city}} and noticed you are missing out on retargeting local buyers. I did a quick video showing how to set up a zero-spam lead verification funnel. Can I drop the link here?`,
    variables: ['name', 'company', 'city'],
    principle: 'Give First'
  },
  {
    name: 'LinkedIn 4: The Bridge',
    type: 'LinkedIn',
    subject: null,
    body: `Hey {{name}}, glad you liked the ad strategy. Since we resolved these issues for another client and generated 42 booked appointments in 30 days under our pay-per-show guarantee, I was wondering if you'd be open to a quick 10-minute call to see if we can set up the same engine for {{company}}?`,
    variables: ['name', 'company'],
    principle: 'Low Friction Pitch'
  },
  {
    name: 'LinkedIn 5: The Nudge',
    type: 'LinkedIn',
    subject: null,
    body: `Hey {{name}}, no worries if you're busy! Just wanted to nudge this in case it got buried. Have a great week!`,
    variables: ['name'],
    principle: 'Gentle Nudge'
  },

  // INSTAGRAM DMs (4 Templates)
  {
    name: 'Instagram 1: Story React',
    type: 'Instagram',
    subject: null,
    body: `Love this post, {{name}}! How long did it take to set up this system at {{company}}?`,
    variables: ['name', 'company'],
    principle: 'Casual Conversation'
  },
  {
    name: 'Instagram 2: Compliment + Insight',
    type: 'Instagram',
    subject: null,
    body: `Great content on your page, {{name}}! I noticed you run Instagram ads but aren't using a lead verification check to filter out spam numbers, meaning you waste 50% of ad spend. I put together a quick setup checklist to fix this. Can I send it over?`,
    variables: ['name'],
    principle: 'Diagnostic Gift'
  },
  {
    name: 'Instagram 3: Content Share',
    type: 'Instagram',
    subject: null,
    body: `Hey {{name}}, saw your post about lead quality. We recently wrote a case study showing how we built a zero-spam WhatsApp validation flow that lowered appointment costs by 62%. Thought it'd be helpful for {{company}}. Want me to send the link?`,
    variables: ['name', 'company'],
    principle: 'Case Study Share'
  },
  {
    name: 'Instagram 4: The Warm Ask',
    type: 'Instagram',
    subject: null,
    body: `Hey {{name}}, thanks for interacting with our ad targeting tips! Since you're running {{company}}, would you be open to a free custom Meta campaign mockup? It takes 10 minutes for us to build, and we'll send it over for free under our show-up guarantee. Let me know!`,
    variables: ['name', 'company'],
    principle: 'Warm Pitch'
  }
];

async function seedTemplates() {
  console.log('🌱 Seeding Outreach Templates...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project-id')) {
    console.error('❌ Error: Supabase credentials missing. Run configuration first.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let insertedCount = 0;
  for (const template of templatesData) {
    try {
      // Check if template already exists
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
        console.log(`🔄 Updated: ${template.name} (${template.type})`);
      } else {
        // Insert
        const { error } = await supabase
          .from('templates')
          .insert(template);

        if (error) throw error;
        console.log(`➕ Inserted: ${template.name} (${template.type})`);
      }
      insertedCount++;
    } catch (err) {
      console.error(`❌ Failed to seed ${template.name}:`, err.message);
    }
  }

  console.log(`\n🎉 Templates seeding completed! Successfully processed ${insertedCount} templates.`);
}

seedTemplates();
