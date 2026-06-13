const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function installBrowser() {
  if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true') {
    console.log('⏭️ Skipping Puppeteer browser download (PUPPETEER_SKIP_CHROMIUM_DOWNLOAD is true).');
    return;
  }

  // Detect and resolve cache directory path
  const cachePath = process.env.PUPPETEER_CACHE_DIR || path.join(__dirname, '../.cache/puppeteer');

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
    console.log('📥 Running: npx puppeteer install chrome');
    // Capture output to stream it to CRM console
    const output = execSync('npx puppeteer install chrome', { encoding: 'utf8' });
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
