const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function installBrowser() {
  console.log('--- Puppeteer Installation Environment Diagnostics ---');
  console.log('PUPPETEER_CACHE_DIR:', process.env.PUPPETEER_CACHE_DIR);
  console.log('PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:', process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('------------------------------------------------------');

  if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true') {
    console.log('⏭️ Skipping Puppeteer browser download (PUPPETEER_SKIP_CHROMIUM_DOWNLOAD is true).');
    return;
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
