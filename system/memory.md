# Veloxis Global — Outreach Memory & Objection Playbook

This document acts as the dynamic memory core for Veloxis Global campaigns, detailing learnings, objections, response patterns, and outreach logs.

---

## 📊 Live Campaign Log (Database Sync Checklist)

| Week | Target Industry | Channel | Sends | Open Rate | Reply Rate | Clients Closed | Learnings |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **W1** | Gyms / Fitness | Instagram DM | - | - | - | - | React to story → Compliment post → Introduce ad verification checklist. |
| **W2** | Test prep / Coaching | Cold Email | - | - | - | - | Schedule at 9:30 AM local time. Focus on competitor ad strategies. |
| **W3** | Real Estate / Clinics | WhatsApp & Email | - | - | - | - | Scrape maps → Find phone & email → Verify WhatsApp → Direct mobile appointment pitch. |

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
- Focus on profile optimizations: clear headshot, agency results in cover photo, clear headline detailing Meta Ads booking results.

### Instagram DM Sequence
- **Step 1:** React/Comment on their latest post or story organically.
- **Step 2:** Wait 24 hours. Send a direct message pointing out a high-impact lead quality leak or missing retargeting pixel.
- **Step 3:** Offer a copy/targeting campaign mockup.

---

## 🛡️ Objection Handling & Response Frameworks

### 1. "We already have an agency / in-house team"
- **Hormozi Angle:** Respect their setup, stack value, and build comparison trust.
- **Outreach Response:**
  > "That's awesome! It means you understand the scale paid advertising can bring. I'm actually not looking to replace your current team. I noticed you're capturing leads via standard forms, which typically waste 40-50% of ad spend on junk numbers and unqualified inquiries. 
  >
  > I put together a quick mockup showing how we connect a 60-second WhatsApp auto-validation engine to Meta Lead Forms to filter out fake contacts before your sales team sees them. 
  >
  > Mind if I send the blueprint? You can hand it straight to your current team to install."

### 2. "How much do you charge?"
- **Hormozi Angle:** Shift focus from cost to ROI, and build value before sharing numbers.
- **Outreach Response:**
  > "We don't charge flat retainer fees. Our pricing is performance-based, meaning we only make money based on the scale of results and new customers we generate for you.
  >
  > Specifically, we set up your campaigns for free and you only pay for qualified booked meetings that actually show up to your calls. If they don't show, you pay nothing.
  >
  > Before we talk numbers, I want to prove we can deliver. Let me send you a custom Meta ad copy mockup and targeting blueprint written specifically for {{company}}. 
  >
  > Can I drop the copy link here?"

### 3. "We are not interested right now"
- **Hormozi Angle:** Preserve goodwill, leave an open door, and drop a free high-value gift.
- **Outreach Response:**
  > "No worries at all! Timing is everything in business. 
  >
  > Before I go, I want to leave you with some value. Here is the link to our DIY Meta Ads Scaling & Lead Validation Checklist: https://veloxisglobal.com/meta-playbook. You can use it to audit your ad setups when you get some downtime.
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

### 6. Free B2B Scraper Fallback & Selector Parsing (No API Key Required)
* **Problem:** Apollo API keys on the free tier get blocked on B2B searches (`mixed_people/search` returns a 403 or subscription warning).
* **Solution:** Programmed an automatic scraper fallback in `apolloService`. If the API key is invalid, empty, or returns a subscription error, the server launches Puppeteer Stealth to query standard JS-rendered DuckDuckGo pages for `site:linkedin.com/in` profiles. Built a self-healing snippet extractor that avoids randomized class dependencies to pull clean Names, Companies, and Designations.

### 7. Automated Company Website Finder on CRM Enrichment
* **Problem:** Free LinkedIn scraped profiles lack official company website URLs, which prevents the 5-layer email verification from executing its search.
* **Solution:** Enhanced the email finder service to dynamically perform a DuckDuckGo search for `${companyName} official website` when the URL is missing. It parses the top result (excluding social networks), updates the website field in the CRM database, and successfully runs the web-scraping and domain-pattern email finder.

### 8. Lead CRM Bulk Delete Functionality
* **Problem:** The Leads dashboard lacked bulk-deletion controls, forcing users to delete unwanted leads one-by-one, which was tedious for large lists.
* **Solution:** Integrated a bulk delete feature. Added a backend `/api/leads/bulk-delete` route using Supabase `.delete().in('id', ids)` for atomic deletion, linked a frontend client function in `api.js`, and mapped a `leads.bulkDelete()` controller method triggered by a red "Bulk Delete" button in the selected action checklist.

### 9. Cumulative Funnel Calculations
* **Problem:** Standard sales funnel graphs show contacted count as zero once prospects respond or move to "Followed Up" or later, making early conversion metrics invisible.
* **Solution:** Modified the `/api/analytics` analytics computation to be cumulative. Sourced leads are calculated cumulatively down the stages (`won` -> `meeting` (+won) -> `replied` (+meeting) -> `followedUp` (+replied) -> `contacted` (+followedUp) -> `researched` (+contacted) -> `new` (+researched)), ensuring contacted prospects are counted under "Contacted" even after advancing.

### 10. Gmail-Style Sent Mail split-pane log
* **Problem:** Senders cannot verify what exact text is dispatched to prospects or if dynamic template engines correctly compiled the context variables (signature, greetings, company short name).
* **Solution:** Created the `/api/email/sent` endpoint to retrieve dispatched logs and compile templates dynamically with metadata, and built a premium split-pane sent mail viewer (#screen-sent-mail) with full-text search, subject preview, and live open tracking.

### 11. 7-Day Weekly Planner layout and Timezone Shifts
* **Problem:** Standard 6-day calendar layouts lacked Sunday grids, and scheduling triggers placed Monday morning campaigns on wrong calendar boxes due to UTC timezone offsets.
* **Solution:** Expanded the calendar to a 7-day grid and wrote a timezone offset converter in `planner.js` to translate scheduled UTC timestamps to the recipient's local day-of-week index.

### 13. CRM Table Top Actions, Page Sizing & CSV Export
* **Problem:** The bulk action checklist was positioned at the bottom of the table, forcing users to scroll past dozens of rows to perform actions even when only selecting one lead. Additionally, the bulk delete button had unreadable red text on a red background, and there was no way to paginate large datasets or export them.
* **Solution:** Relocated the stats and bulk action bar to the top of the CRM table card. Fixed the delete button text color inline with high-contrast white text (`color: #ffffff !important`). Integrated page size selector dropdowns (`25`, `50`, `75`, `100`, `All`) and compiled a client-side UTF-8 CSV exporter with BOM encoding that exports filtered list contexts instantly.

### 14. 30-Second Live Polling Auto-Refresh
* **Problem:** When running campaigns, outbound statistics, open rates, and sent mail logs did not update dynamically without manual page reloads.
* **Solution:** Programmed a global 30-second interval in `app.js` that checks the active screen and performs silent background polling on the dashboard, analytics funnel charts, and sent mail list details (updating opens dynamically via `sent-detail-opens` and `sent-detail-last-opened` without disrupting current selection or scroll positions).




