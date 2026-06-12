# Veloxis Global — Outreach Memory & Objection Playbook

This document acts as the dynamic memory core for Veloxis Global campaigns, detailing learnings, objections, response patterns, and outreach logs.

---

## 📊 Live Campaign Log (Database Sync Checklist)

| Week | Target Industry | Channel | Sends | Open Rate | Reply Rate | Clients Closed | Learnings |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **W1** | Gyms / Fitness | Instagram DM | - | - | - | - | React to story → Compliment post → Introduce mobile speed diagnosis. |
| **W2** | Test prep / Coaching | Cold Email | - | - | - | - | Schedule at 9:30 AM local time. Focus on competitor keyword gaps. |
| **W3** | Real Estate / Clinics | WhatsApp & Email | - | - | - | - | Scrape maps → Find phone & email → Verify WhatsApp → Direct mobile follow-up. |

---

## 💡 Key Channel Insights & Warm-Up Schedule

### Cold Email (Domain Reputation Security)
To ensure `muddassir@veloxisglobal.com` stays out of the spam box, follow this strict email volume warm-up schedule:

- **Week 1:** 10–15 emails/day (Only to highly targeted leads, reply to all responses).
- **Week 2:** 25–30 emails/day (Monitor bounce rates, ensure MX/SPF/DKIM records are valid).
- **Week 3:** 50–60 emails/day (Review opens, double check spam folder placement).
- **Week 4+:** **100 emails/day** (Maximum outreach volume capacity).

### LinkedIn Connection Guidelines
- Keep notes brief (under 150 characters) and highly personal.
- Never pitch on the connection request.
- Focus on profile optimizations: clear headshot, agency results in cover photo, clear headline detailing SEO results.

### Instagram DM Sequence
- **Step 1:** React/Comment on their latest post or story organically.
- **Step 2:** Wait 24 hours. Send a direct message pointing out a high-impact mobile speed bug on their landing page.
- **Step 3:** Offer a screen recording of the fix.

---

## 🛡️ Objection Handling & Response Frameworks

### 1. "We already have an agency / in-house team"
- **Hormozi Angle:** Respect their setup, stack value, and build comparison trust.
- **Outreach Response:**
  > "That's awesome! It means you understand the value of SEO. I'm actually not looking to replace your team. I ran a quick speed and indexation scan on your landing page and noticed 3 hidden errors that are causing mobile visitors to bounce before they inquire. 
  >
  > I filmed a free 2-minute video showing exactly where these errors are so you can hand it directly to your current team to fix. 
  >
  > Mind if I send the link?"

### 2. "How much do you charge?"
- **Hormozi Angle:** Shift focus from cost to ROI, and build value before sharing numbers.
- **Outreach Response:**
  > "We don't charge flat retainer fees. Our pricing is performance-based, meaning we only make money based on the scale of results and new customers we generate for you.
  >
  > However, before we discuss numbers, I want to prove I can bring you results first. Let me send you a free competitor gap report showing the top 5 high-converting keywords your competitors are ranking for that you are missing out on. 
  >
  > Can I drop the report link here?"

### 3. "We are not interested right now"
- **Hormozi Angle:** Preserve goodwill, leave an open door, and drop a free high-value gift.
- **Outreach Response:**
  > "No worries at all! Timing is everything in business. 
  >
  > Before I go, I want to leave you with some value. Here is the link to our DIY Speed Optimization Checklist that we use for all our e-commerce audits: https://veloxisglobal.com/seo-checklist. You can run it on your site when you get some downtime.
  >
  > Wish you the absolute best of luck this quarter!"

---

## 🛠️ System Development Memory Logs

### 1. Advanced Website Email Scraper (Puppeteer Fallback)
* **Problem:** Cheerio-based fetch fetches raw HTML and misses dynamic text on Single Page Applications (SPAs) or gets blocked by Cloudflare security gates.
* **Solution:** Configured `puppeteer-extra` with `puppeteer-extra-plugin-stealth` to emulate genuine user interaction. If Cheerio yields 0 emails, the scraper automatically falls back to headless Chrome, waits for the DOM to settle (`networkidle2`), parses dynamic nodes, and queries secondary contact pages.

### 2. Manual Profile Editing & DB Synchronization
* **Problem:** AI-scraped names, emails, and phone numbers can contain extra characters, prefixes, or missing local fields that need manual cleanup before triggering automation sequences.
* **Solution:** Extended the CRM Lead Form Modal with inputs for Phone, LinkedIn, Instagram, City, Country, Industry, and Notes. Configured Express controllers to sanitize inputs, mapping empty strings to `null` database objects to avoid violating unique constraints on Supabase (such as duplicate emails).

### 3. Interactive WhatsApp Availability Verification
* **Problem:** Direct server-side account validation is restricted by Meta's API without active user session cookies.
* **Solution:** Implemented a CRM side-panel trigger. Clicking the WhatsApp button opens `https://wa.me/<number>` in a new tab and prompts a browser confirm modal. Upon user confirmation, it automatically logs `[WhatsApp: Active]` (or `Inactive`) in the lead notes, updating a styled badge in the CRM dashboard dynamically.

### 4. Apollo B2B Search & Social SERP Integration
* **Problem:** Google Maps scraping fails to capture contact emails, job titles, and LinkedIn profiles for decision-makers.
* **Solution:** Integrated Apollo.io's `mixed_people/search` endpoint alongside a DuckDuckGo social SERP directory scraper. Structured front-end toggles inside the Lead Generator screen and unified the bulk import pipeline to map B2B attributes (LinkedIn, Email, Company Name, and job titles) directly to Supabase CRM tables.

### 5. Local DNS MX Resolution Failure Fallback
* **Problem:** SMTP connection queries fail with `queryMx ECONNREFUSED` or `ETIMEOUT` on local development environments behind restrictive network firewalls, leading to valid emails being dropped.
* **Solution:** Configured the backend verification service to handle DNS network anomalies gracefully, falling back to syntax-based verification to preserve valid leads on local runs.

