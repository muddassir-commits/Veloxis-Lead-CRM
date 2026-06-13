const { execSync } = require('child_process');

// Skip downloading browser if we are in Docker or explicitly requested to skip
if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true') {
  console.log('⏭️ Skipping Puppeteer browser download (PUPPETEER_SKIP_CHROMIUM_DOWNLOAD is true).');
  process.exit(0);
}

// In Render's build environment, we want to download Chrome to the cache directory
console.log('🕵️ Preparing to install Chrome for Puppeteer...');
try {
  console.log('📥 Running: npx puppeteer browsers install chrome');
  execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
  console.log('✅ Chrome browser successfully installed for Puppeteer.');
} catch (err) {
  console.warn('⚠️ Warning: Failed to run puppeteer browser install command:', err.message);
  console.log('This is normal on local development machines if Chrome is already installed or if internet is offline.');
}
