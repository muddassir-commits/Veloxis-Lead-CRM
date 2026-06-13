# Puppeteer Browser Resolution Document (Render Production Fix)

This document records the exact error, root cause analysis, and structural fixes implemented to run Google Maps lead scraping (Puppeteer Stealth headless Chrome) on Render production environments.

---

## 🚨 The Error
```
❌ Failed to launch Puppeteer browser: Could not find Chrome (ver. 131.0.6778.204). This can occur if either
     1. you did not perform an installation before running the script (e.g. `npx puppeteer browsers install chrome`) or
     2. your cache path is incorrectly configured (which is: /opt/render/project/src/puppeteer-cache).
```

---

## 🔍 Root Cause Analysis
1. **Render Filesystem Constraints:** Render web services run on containerized environments where the filesystem at `/opt/render/project/src` is writable *only* during the build phase (`npm install` / `postinstall`). At runtime, it becomes **read-only**. Any attempt to install the browser dynamically during startup or scraper execution will fail.
2. **CLI Mismatch (Invalid Subcommand):** The script previously ran `npx puppeteer install chrome`. This is an invalid subcommand in Puppeteer v20+ (the correct CLI subcommand is `puppeteer browsers install chrome`). This caused the download script to exit silently without actually downloading any browser files.
3. **Cache Path Misalignment:** Puppeteer looks for browser binaries inside `PUPPETEER_CACHE_DIR` or defaults to the home folder (`~/.cache/puppeteer`). Because Render's build container home folder is *not* packaged into the runtime container, the downloaded browser was lost unless installed directly inside the project root workspace (`/opt/render/project/src/puppeteer-cache`).
4. **Environment Settings Blocking Download:** Render settings often declare `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` in the dashboard to speed up install times or for Docker runs. However, on the native Node.js environment, this environment variable caused our `install-browser.js` installer to skip the browser download entirely, leaving the runtime folder empty.

---

## 🛠️ Implemented Fixes

### 1. Standardized Local Config ([`.puppeteerrc.cjs`](file:///d:/01_Projects/Lead%20CRM/.puppeteerrc.cjs))
Created a standard Puppeteer configuration file in the project root to automatically enforce local browser downloading and runtime resolution inside the project folder:
```javascript
const { join } = require('path');

module.exports = {
  cacheDirectory: join(__dirname, 'puppeteer-cache'),
};
```
This guarantees that both `npm install` (via dependency postinstall scripts) and the runtime launch command point to the exact same relative directory (`/opt/render/project/src/puppeteer-cache`), removing the need for fragile path overrides.

### 2. Corrected Install Command ([`scripts/install-browser.js`](file:///d:/01_Projects/Lead%20CRM/scripts/install-browser.js))
Corrected the script to run `npx puppeteer browsers install chrome`. This command correctly downloads Chrome `131.0.6778.204` into the config-specified `puppeteer-cache` folder.

### 3. Native Environment Skip-Bypass ([`scripts/install-browser.js`](file:///d:/01_Projects/Lead%20CRM/scripts/install-browser.js#L12-L21))
Modified the script skip condition. It now ignores `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` if it is running on a native Render Node environment (detected by checking if `PUPPETEER_EXECUTABLE_PATH !== '/usr/bin/chromium'`). It will print a warning but proceed to download the browser, making sure Chrome is packaged.

### 4. Git Ignore Updated ([`.gitignore`](file:///d:/01_Projects/Lead%20CRM/.gitignore#L54-L56))
Added `puppeteer-cache/` to `.gitignore` to prevent committing heavy binary files (hundreds of megabytes) into the Git repository history.

---

## 🚀 Deployment Instructions
To apply these changes on Render, you must run a clean deploy to rebuild the cache:
1. Go to your **Render Dashboard** and select your Web Service.
2. Click **Manual Deploy** in the top right.
3. Select **Clear Build Cache & Deploy**.
4. Monitor the build logs. You will see:
   - Environment variables diagnostics.
   - If `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` is set to `true`, the override warning will print.
   - `📥 Running: npx puppeteer browsers install chrome` will execute and download Chrome.
   - `✅ Chrome browser successfully installed for Puppeteer.` will confirm success.
