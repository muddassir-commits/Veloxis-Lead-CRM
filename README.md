# 🚀 Veloxis Global — Lead Generation & Outreach Command Center

A premium, ROI-focused CRM and automated outreach dashboard built for **Muddassir Ali, Founder & CEO of Veloxis Global**. This platform leverages the psychological principles of **Alex Hormozi's $100M Offers** to automate high-value cold outreach that drives appointments, retainers, and sales.

---

## 🌟 Key Features

1. **☁️ Cloud-Native Auto Outreach:** Runs 24/7 in the cloud (Render) even when your laptop is turned OFF.
2. **📧 Direct Hostinger SMTP Integration:** Sends professional outreach emails directly from `muddassir@veloxisglobal.com` (completely bypassing complex Google Cloud OAuth setups).
3. **⏰ Daily Auto-Scheduler & Triple-Backup Reports:** Automated crons scrape 100 verified leads at 9:00 AM IST, kickoff email campaigns at 10:00 AM IST, and broadcast a daily summary report directly to your Email, Telegram, and WhatsApp at 7:00 PM IST (End-of-Day).
4. **📨 Gmail-Style Sent Mail Log:** Built-in split-pane explorer to inspect dispatched email templates, compiled with variables, along with their open tracking telemetry.
5. **⚡ B2B Apollo Search Engine (with Free Scraper Fallback):** Connects to the Apollo.io API, or automatically triggers a Puppeteer-based DuckDuckGo LinkedIn scraper with self-healing selector parsing when keys are missing or on a free/unpaid plan.
6. **🔗 Social Search Prospector:** DuckDuckGo SERPs scraper to locate Instagram and LinkedIn decision-maker profiles using target niches.
7. **🔍 1-Click Maps Scraper:** Scrapes local business directories via Puppeteer, capturing metadata like ratings, phone numbers, and websites.
8. **🕵️ 5-Layer Email Finder (with Auto Website Finder):** Scrapes websites for verified emails, falling back to Puppeteer Stealth. Automatically searches for company website URLs on the fly if they are missing from imported leads.
9. **🔒 DNS/MX verification Fail-safe:** Fallbacks to syntax validation if firewalls block SMTP socket verification queries locally.
10. **👥 Drag-and-Drop Kanban CRM, Data Editor & Bulk Deletes:** Manage pipelines interactively. Allows inline updates for lead data, check-to-select bulk enrichment, bulk outreach triggers, and atomic batch deletions (placed at the top of the table for easy access, with the bulk delete button styled with high-contrast white text on a red background).
11. **🟢 WhatsApp Availability Checker:** Click-to-chat verification button links directly to WhatsApp Web. Log active/inactive status and render interactive badges in the CRM instantly.
12. **📊 Analytics & SVG Charts:** Direct tracking of open rates and cumulative pipeline conversions down the funnel using custom lightweight SVG charts (no heavy libraries).
13. **📅 7-Day Weekly Planner & Timezone Helper:** Visual scheduling calendar supporting weekend outreach. Automatically translates UTC scheduled dates into the recipient's local timezone.
14. **🎨 Premium Dark Glassmorphism UI:** Outfit & Inter fonts, blur panels, clean accents, and micro-interactions.
15. **📈 Client-Side Pagination & Sheets Export:** Filter and paginate CRM list output to 25, 50, 75, 100, or All leads. Instantly export active filtered search prospects to a UTF-8 CSV file (with BOM formatting to preserve special characters in Excel and Google Sheets).
16. **⏱️ 30-Second Live Polling Auto-Refresh:** Background cron loop automatically refreshes stats, email delivery logs, and open tracking stats every 30 seconds on live dashboard pages without page reloads or layout disruptions.

---

## 📂 Project Structure

```
d:\01_Projects\Lead CRM\
├── 📂 system/                 # 🧠 Hormozi guides, agents rules, and memory logs
├── 📂 server/                 # ☁️ Backend Express, cron schedulers, and route APIs
│   ├── 📂 db/                 # Database schema.sql and seed configurations
│   ├── 📂 routes/             # REST API controllers
│   └── 📂 services/           # SMTP, Puppeteer Scrapers, Auto-Scheduler & WhatsApp Services
├── 📂 public/                 # 🎨 SPA Frontend dashboard (HTML/CSS/JS)
│   ├── 📂 css/                # Dark Glassmorphic styling system
│   └── 📂 js/                 # API client, SVG charts, and screen handlers
├── 📂 scripts/                # 🔧 CLI database checkers, seeders, and SMTP testers
├── 📄 package.json            # Node dependencies and scripts
└── 📄 SETUP_GUIDE.md          # Step-by-step installation instructions
```

---

## 🚀 Quick Start

1. Open your terminal in the directory:
   ```bash
   npm install
   ```
2. Configure your credentials inside the `.env` file (see [SETUP_GUIDE.md](file:///d:/01_Projects/DM%20Masterclass%20saas/SETUP_GUIDE.md) for details).
3. Verify your database and SMTP connection:
   ```bash
   npm run setup:supabase
   npm run seed:templates
   npm run test:email
   ```
4. Start local development:
   ```bash
   npm run dev
   ```
5. View in browser: **[http://localhost:5000](http://localhost:5000)**

---

## 🧠 Core Strategy: Alex Hormozi Value Equation

$$Value = \frac{Dream\ Outcome \times Perceived\ Likelihood\ of\ Achievement}{Time\ Delay \times Effort\ \&\ Sacrifice}$$

Every email sequence initialized by this CRM follows this exact formula:
* **Step 1 (The Diagnosis):** Low-friction value gift (sharing a 90-second ad strategy and retargeting leak diagnosis).
* **Step 2 (The Proof):** Demonstrating perceived likelihood (detailing our 3-part framework: Meta forms, 60s validation, and show-up pricing).
* **Step 3 (The Grand Slam Offer):** Stacking value with custom ad copies, local audience target Blueprints, and booking funnels.
* **Step 4 (The Breakup):** Leaving goodwill and free scaling checklists, building long-term authority.
