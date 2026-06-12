# 🚀 Veloxis Global — Lead Generation & Outreach Command Center

A premium, ROI-focused CRM and automated outreach dashboard built for **Muddassir Ali, Founder & CEO of Veloxis Global**. This platform leverages the psychological principles of **Alex Hormozi's $100M Offers** to automate high-value cold outreach that drives appointments, retainers, and sales.

---

## 🌟 Key Features

1. **☁️ Cloud-Native Auto Outreach:** Runs 24/7 in the cloud (Render) even when your laptop is turned OFF.
2. **📧 Direct Hostinger SMTP Integration:** Sends professional outreach emails directly from `muddassir@veloxisglobal.com` (completely bypassing complex Google Cloud OAuth setups).
3. **🔍 1-Click Maps Scraper:** Scrapes local directories directly via Puppeteer, extracting names, categories, ratings, and websites.
4. **🕵️ 5-Layer Email Finder (Cheerio + Puppeteer Fallback):** Scrapes websites with Cheerio and automatically falls back to headless Chrome (Puppeteer Stealth) to bypass Cloudflare and scrape dynamic Single Page Application (SPA) platforms.
5. **⏰ Timezone-Aware Scheduler:** Automatically schedules email sequences to land in your prospect's inbox at their optimal local morning hours (EST/PST/GMT/AEST).
6. **👥 Drag-and-Drop Kanban CRM & Data Editor:** Manage pipelines interactively. Edit fields (phone, email, socials, region) via inline modals, updating the database in real-time.
7. **🟢 WhatsApp Availability Checker:** Click-to-chat verification button links directly to WhatsApp Web. Log active/inactive status and render interactive badges in the CRM instantly.
8. **📊 Analytics & SVG Charts:** Direct tracking of open rates and send counts using custom lightweight SVG charts (no heavy libraries).
9. **🎨 Premium Dark Glassmorphism UI:** Outfit & Inter fonts, blur panels, clean accents, and micro-interactions.

---

## 📂 Project Structure

```
d:\01_Projects\Lead CRM\
├── 📂 system/                 # 🧠 Hormozi guides, agents rules, and memory logs
├── 📂 server/                 # ☁️ Backend Express, cron schedulers, and route APIs
│   ├── 📂 db/                 # Database schema.sql and seed configurations
│   ├── 📂 routes/             # REST API controllers
│   └── 📂 services/           # Nodemailer SMTP, Puppeteer scraper, and DNS verify
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
* **Step 1 (The Diagnosis):** Low-friction value gift (identifying website load speed errors for free).
* **Step 2 (The Proof):** Demonstrating perceived likelihood (showing how we resolved similar errors for traffic growth).
* **Step 3 (The Grand Slam Offer):** Stacking value with audit reports, content calendars, and keyword maps.
* **Step 4 (The Breakup):** Leaving goodwill and resources, building long-term authority.
