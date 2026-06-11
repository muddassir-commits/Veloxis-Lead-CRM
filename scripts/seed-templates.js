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

I was looking at your website ({{website}}) and noticed 3 speed errors that are causing mobile visitors to leave before your page loads.

We did a quick speed optimization for a fitness brand recently that went from 0 to 340% organic traffic in 90 days.

I put together a quick screen recording showing exactly where these speed errors are and how you can fix them yourself.

Would you like me to send it over? Reply 'yes' and I will drop it in your inbox.

Best,
{{signature}}`,
    variables: ['name', 'company', 'website', 'signature'],
    principle: 'Dream Outcome + Low CTA (Hormozi)'
  },
  {
    name: 'Email 2: The Proof',
    type: 'Email',
    subject: 'the 3 speed issues on {{company}}',
    body: `Hey {{name}},

Just wanted to share the 3 issues I found on your site ({{website}}):

1. Large uncompressed images (adds 3.2 seconds to load time).
2. Unused JavaScript blocking page display.
3. Missing schema markup for SEO.

When we resolved these exact issues for a coaching client, their search traffic grew by 3.4x in under 3 months.

Would you like me to film a free 2-minute video showing your developer how to fix these? No pitch or sales call.

Best,
{{signature}}`,
    variables: ['name', 'company', 'website', 'signature'],
    principle: 'Perceived Likelihood (Hormozi)'
  },
  {
    name: 'Email 3: The Grand Slam',
    type: 'Email',
    subject: 'Free audit, calendar, and competitor report for {{company}}',
    body: `Hey {{name}},

Since I haven't heard back, I went ahead and created a complete package for {{company}} to help you rank higher on Google:

1. A full technical SEO and speed audit (value: $150).
2. A list of the top 5 keywords your competitors are ranking for that you are missing (value: $100).
3. A 30-day SEO content calendar for your blog (value: $120).

This is 100% free, no catches. I want to build trust first.

If you want me to send this package over, just reply 'yes' and it's yours.

Best,
{{signature}}`,
    variables: ['name', 'company', 'signature'],
    principle: 'Value Stack + Risk Reversal (Hormozi)'
  },
  {
    name: 'Email 4: The Breakup',
    type: 'Email',
    subject: 'moving on',
    body: `Hey {{name}},

I assume ranking higher on Google is not a priority for {{company}} right now, which is totally fine.

I won't email you again. However, I want to leave you with some value. Here is the link to the SEO checklist we use for all our audit clients: https://veloxisglobal.com/seo-checklist

If your goals change and you want to scale your organic traffic, you can always reach back out.

Wish you the best of luck with your business!

Best,
{{signature}}`,
    variables: ['name', 'company', 'signature'],
    principle: 'Goodwill + Long Game'
  },
  {
    name: 'Email 5: The Competitor (Alt Day 1)',
    type: 'Email',
    subject: 'quick note about your competitors',
    body: `Hey {{name}},

I was searching for {{industry}} in {{city}} and noticed your competitor is ranking above {{company}} for high-value searches.

Because they rank higher, they are likely picking up around 40-50% more inquiries every month.

I found the specific SEO gaps that are keeping you below them. I can send you a short report showing these gaps.

Should I send it over? Just reply 'yes'.

Best,
{{signature}}`,
    variables: ['name', 'company', 'industry', 'city', 'signature'],
    principle: 'Dream Outcome + Urgency'
  },
  {
    name: 'Email 6: The Quick Win (Alt Day 1)',
    type: 'Email',
    subject: 'one quick fix for {{company}}',
    body: `Hey {{name}},

I was reviewing your website and noticed you have a broken contact form script. This means visitors looking to book a service are seeing an error page.

It takes about 5 minutes to fix. I wrote down the step-by-step instructions on how your developer can fix this.

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

I'm so glad we were able to increase your website speed and traffic. We love working with businesses like {{company}}.

Do you know any other business owners in {{industry}} who are looking to double their Google search traffic? I'd love to offer them a free audit.

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

I was looking at {{company}} again and saw that you guys recently launched a new website section.

I put together a quick SEO plan specifically for this new launch to help you get organic traction.

Would you like me to send it over?

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
    body: `Thanks for connecting, {{name}}! I've been following {{company}} for a bit. Curious, are you guys currently focused on scaling your search traffic or paid ads this quarter?`,
    variables: ['name', 'company'],
    principle: 'Curiosity Hook'
  },
  {
    name: 'LinkedIn 3: The Value Drop',
    type: 'LinkedIn',
    subject: null,
    body: `Hey {{name}}, saw you guys are ranking #4 for {{industry}} keywords in {{city}}. I did a quick video showing 2 ways to get to #1. No pitch, just thought it'd be helpful. Can I drop the link here?`,
    variables: ['name', 'industry', 'city'],
    principle: 'Give First'
  },
  {
    name: 'LinkedIn 4: The Bridge',
    type: 'LinkedIn',
    subject: null,
    body: `Hey {{name}}, glad you liked the video. Since we resolved those issues for another brand and boosted their traffic by 3.4x, I was wondering if you'd be open to a quick 10-minute chat to see if we can do the same for {{company}}?`,
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
    body: `Great content on your page, {{name}}! I noticed you run ads but your mobile landing page loads in 5+ seconds, which means you're likely losing 50% of your click traffic. I put together a quick speed fix list. Can I send it over?`,
    variables: ['name'],
    principle: 'Diagnostic Gift'
  },
  {
    name: 'Instagram 3: Content Share',
    type: 'Instagram',
    subject: null,
    body: `Hey {{name}}, saw your post about website issues. We recently wrote a case study showing how we resolved 3,000+ speed and crawl errors for an e-commerce site. Thought it'd be helpful for you. Want me to send the link?`,
    variables: ['name'],
    principle: 'Case Study Share'
  },
  {
    name: 'Instagram 4: The Warm Ask',
    type: 'Instagram',
    subject: null,
    body: `Hey {{name}}, thanks for interacting with our speed optimization tips! Since you're running {{company}}, would you be open to a free audit of your site speed? It takes 2 minutes for us to run and we will send you the fixes. Let me know!`,
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
