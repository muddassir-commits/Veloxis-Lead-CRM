const { execSync } = require('child_process');

function installBrowser() {
  if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true') {
    console.log('⏭️ Skipping Puppeteer browser download (PUPPETEER_SKIP_CHROMIUM_DOWNLOAD is true).');
    return;
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
