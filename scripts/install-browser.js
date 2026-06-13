const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function installBrowser() {
  console.log('--- Puppeteer Installation Environment Diagnostics ---');
  console.log('PUPPETEER_CACHE_DIR:', process.env.PUPPETEER_CACHE_DIR);
  console.log('PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:', process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('------------------------------------------------------');

  // Only skip download if we have a valid system-installed Chromium executable path specified (e.g., in Docker)
  if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true' && process.env.PUPPETEER_EXECUTABLE_PATH === '/usr/bin/chromium') {
    console.log('⏭️ Skipping Puppeteer browser download (using system pre-installed Chromium in Docker).');
    return;
  }

  if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true') {
    console.log('⚠️ PUPPETEER_SKIP_CHROMIUM_DOWNLOAD is set to true, but no system Chromium executable path is defined. Overriding to force browser download on Render native Node environment...');
  }

  // Detect and resolve cache directory path (aligned with .puppeteerrc.cjs)
  const cachePath = process.env.PUPPETEER_CACHE_DIR || path.join(__dirname, '../puppeteer-cache');

  // Clean up existing directory to prevent corrupt cache errors
  if (fs.existsSync(cachePath)) {
    console.log(`🧹 Found existing cache folder: ${cachePath}. Cleaning it up to prevent corrupt state...`);
    try {
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log('✅ Cleaned cache successfully.');
    } catch (err) {
      console.warn('⚠️ Warning: Failed to clean cache folder:', err.message);
    }
  }

  console.log('🕵️ Preparing to install Chrome for Puppeteer...');
  try {
    console.log('📥 Running: npx puppeteer browsers install chrome');
    // Capture output to stream it to CRM console
    const output = execSync('npx puppeteer browsers install chrome', { encoding: 'utf8' });
    console.log(output);
    console.log('✅ Chrome browser successfully installed for Puppeteer.');
  } catch (err) {
    console.warn('⚠️ Warning: Failed to run puppeteer browser install command:', err.message);
    console.log('This is normal on local development machines if Chrome is already installed or if internet is offline.');
  }
}

// Run directly if called from command line
if (require.main === module) {
  installBrowser();
}

module.exports = installBrowser;
