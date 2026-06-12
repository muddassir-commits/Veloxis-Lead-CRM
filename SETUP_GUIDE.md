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

# WhatsApp Notification API (CallMeBot)
CALLMEBOT_API_KEY=your_apikey_here                # Your CallMeBot API key
WHATSAPP_PHONE=+918887620727                      # Your phone number with country code
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

### 5. Send a Test WhatsApp Notification
```bash
npm run test:whatsapp
```
*Verifies connection to the CallMeBot API. It will send a confirmation message to +918887620727 to verify your WhatsApp notification pipeline.*

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

> [!IMPORTANT]
> **Why UptimeRobot is critical for Email Open Tracking:**
> Open tracking uses an invisible 1x1 image pixel pointing to your `BACKEND_URL`. When a recipient opens your email, Gmail's proxy server attempts to fetch the pixel. If your Render instance is asleep, the spin-up delay (~50 seconds) will exceed Gmail's strict proxy timeout (2–5 seconds), causing the open tracking to fail. Keeping the server awake with UptimeRobot ensures that all email opens register in Supabase instantly.

---

## 📱 Step 6: Setting up WhatsApp Notifications (CallMeBot)

To receive your daily outreach and lead generation summary reports directly on Email, Telegram, and WhatsApp at **7:00 PM IST (End-of-Day)**, set up CallMeBot:

1. **Add CallMeBot Contact:** Add the CallMeBot phone number to your contacts:
   - CallMeBot WhatsApp Number: **`+34 644 81 58 78`** (or click [wa.me/34644815878](https://wa.me/34644815878)).

2. **Request API Key:** Send the following text message to this contact via WhatsApp:
   - Message: `I allow callmebot to send me messages`
3. **Receive API Key:** The bot will reply in a few seconds with your API Key (e.g., `123456`).
4. **Update `.env`:** Copy this key and paste it as `CALLMEBOT_API_KEY` in your `.env` file. Keep `WHATSAPP_PHONE` as `+918887620727`.
5. **Test the Setup:** Start your server and trigger a manual WhatsApp broadcast or wait for the scheduler tick to verify the message is delivered.

---

## ✈️ Step 7: Setting up Telegram Notifications (Alternative & 100% Reliable)

If WhatsApp is delayed or offline, you can receive your daily reports on Telegram. The CallMeBot Telegram API is highly reliable and does **not** require any API key for personal text messages!

1. **Start the Telegram Bot:**
   - Search for **`@CallMeBot_txtbot`** on Telegram (or click [t.me/CallMeBot_txtbot](https://t.me/CallMeBot_txtbot)).
   - Click **Start** or send the command: `/start`
2. **Configure Your Username:**
   - Open your [`.env` file](file:///d:/01_Projects/Lead%20CRM/.env).
   - Set `TELEGRAM_USERNAME` to your Telegram username (including `@`):
     ```ini
     TELEGRAM_USERNAME=@your_username
     ```
3. **Test the Setup:**
   - Run the validation script in your terminal:
     ```bash
     npm run test:telegram
     ```
   - Check your Telegram to verify the alert is received instantly!


