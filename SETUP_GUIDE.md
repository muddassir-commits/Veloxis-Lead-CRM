# 🛠️ Veloxis Global — Outreach Command Center Setup Guide

Follow this step-by-step guide to configure, test, and run your outreach platform locally and deploy it to the cloud for free.

---

## 📋 Prerequisites
1. **Node.js** (v18.0.0 or higher) — Already installed on your machine!
2. **Hostinger Email Account** — You have `muddassir@veloxisglobal.com` set up.
3. **Supabase Account** — Free tier (handles up to 50,000 database rows).

---

## 🏁 Step 1: Database Setup (Supabase)

1. **Create a Free Account:** Go to [supabase.com](https://supabase.com) and sign up.
2. **Create a New Project:** 
   - Project Name: `Veloxis Leads CRM` (or any name you prefer).
   - Database Password: Create a strong password and save it somewhere secure.
   - Region: Select the region closest to you or your targets.
3. **Retrieve API Keys:**
   - Once your project is created, navigate to **Project Settings** (gear icon on the left panel) -> **API**.
   - Copy the following values:
     - `Project URL`
     - `anon / public` key
     - `service_role` key (click reveal)
4. **Create Database Tables:**
   - Click the **SQL Editor** tab (the `>_` icon in the left navigation sidebar).
   - Click **+ New Query**.
   - Open your project folder and locate the schema SQL file:
     `server/db/schema.sql`
   - Copy the entire SQL script from that file, paste it into the Supabase SQL editor, and click **Run**.
5. **Insert Defaults & Sample Leads:**
   - Click **+ New Query** again.
   - Locate the seed SQL file:
     `server/db/seed.sql`
   - Copy the contents, paste them into the SQL editor, and click **Run**.

---

## 🔑 Step 2: Configure Environment Variables (`.env`)

1. Open your project folder: `d:\01_Projects\Lead CRM\`
2. Open the `.env` file (which we created for you with placeholders).
3. Fill in your credentials:

```env
# Server Port (leave as 5000)
PORT=5000
NODE_ENV=development

# Hostinger SMTP Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=muddassir@veloxisglobal.com
SMTP_PASS=your_hostinger_email_password_here  # Put your Hostinger email account password here

# Supabase API Credentials
SUPABASE_URL=https://your-project-id.supabase.co  # Replace with Project URL
SUPABASE_ANON_KEY=your-supabase-anon-key          # Replace with anon/public key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Replace with service_role key
```

---

## ⚡ Step 3: Run Setup & Verification Scripts

Open your command prompt or terminal in the project directory and run the following commands in sequence:

### 1. Verify Supabase Database Connection
```bash
npm run setup:supabase
```
*This script tests connectivity to your online database and confirms if the tables are set up.*

### 2. Seed All 17+ Outreach Templates
```bash
npm run seed:templates
```
*This inserts the Alex Hormozi $100M Offers structures (8 emails, 5 LinkedIn, 4 Instagram templates) into your Supabase database.*

### 3. Review SMTP Instructions
```bash
npm run setup:email
```
*Prints a quick summary of how Hostinger SMTP is structured.*

### 4. Send a Test Email
```bash
npm run test:email
```
*Verifies connection to Hostinger SMTP. It will prompt/send a test email to muddassir@veloxisglobal.com to verify that Node.js can deliver mail safely through Hostinger.*

---

## 💻 Step 4: Run Locally

Start your local development server:
```bash
npm run dev
```
Open your browser and navigate to:
**[http://localhost:5000](http://localhost:5000)**

You will see your beautiful dark-mode glassmorphic Command Center! Try:
- Running a Maps Scrape query (e.g. "gyms" in "Lucknow").
- Finding missing emails on the scraped results.
- Importing them to the CRM.
- Dragging leads between status stages on the Kanban Board.

---

## ☁️ Step 5: Cloud Deployment (Works 24/7 with Laptop OFF)

To make automated sequences run round-the-clock while your computer is shut down, deploy your backend:

### 1. Host Backend on Render.com (Free)
1. Push your project code to a private GitHub repository (never push the `.env` file!).
2. Log into [render.com](https://render.com) and click **New** -> **Web Service**.
3. Connect your GitHub repository.
4. Render will auto-detect the configuration from the `render.yaml` file!
5. In the **Environment** tab on Render, add the environment variables matching your `.env` (SMTP_PASS, SUPABASE_URL, API keys, etc.).
6. Click **Deploy**. Render will build and host your API (e.g., `https://veloxis-outreach.onrender.com`).

### 2. Keep the Backend Awake (UptimeRobot)
Render's free tier sleeps after 15 minutes of inactivity. To prevent this so scheduled emails go out on time:
1. Create a free account at [uptimerobot.com](https://uptimerobot.com).
2. Add a new monitor:
   - Type: `HTTP(s)`
   - Name: `Veloxis CRM Keep-Alive`
   - URL: `https://your-render-app-url.onrender.com/api/health`
   - Interval: Every 5 minutes.
3. Done! UptimeRobot will ping your server regularly, ensuring it stays active and checks cron schedules 24/7.
