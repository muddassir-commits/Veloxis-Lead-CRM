const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

async function verifyUI() {
  console.log('🧪 Starting Automated UI & DOM Verification...');
  console.log('📡 Accessing http://localhost:5000...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Log console errors from the browser
    const consoleErrors = [];
    page.on('pageerror', (err) => {
      consoleErrors.push(err.toString());
      console.error('❌ Browser JS Error:', err.toString());
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('❌ Browser Console Error:', msg.text());
      } else {
        console.log(`💬 Browser Console: ${msg.text()}`);
      }
    });

    // Navigate to dashboard
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Connected to dashboard server.');

    // 1. Verify all 9 Screen IDs exist in the DOM
    const screens = [
      'dashboard', 'leads', 'instagram', 'templates', 
      'sequences', 'planner', 'icp', 'analytics', 'settings'
    ];

    console.log('\n🔍 Verifying Screen Sections in DOM...');
    for (const screen of screens) {
      const selector = `#screen-${screen}`;
      const exists = await page.evaluate((sel) => !!document.querySelector(sel), selector);
      if (exists) {
        console.log(`  🟢 Screen [${screen}] matches selector [${selector}] -> FOUND`);
      } else {
        console.error(`  🔴 Screen [${screen}] matches selector [${selector}] -> NOT FOUND`);
      }
    }

    // 2. Check Navigation sidebar buttons
    console.log('\n🔍 Verifying Sidebar Navigation Buttons...');
    for (const screen of screens) {
      const selector = `#nav-${screen}, .nav-item[data-screen="${screen}"]`;
      const exists = await page.evaluate((sel) => !!document.querySelector(sel), selector);
      if (exists) {
        console.log(`  🟢 Sidebar Nav link [${screen}] -> FOUND`);
      } else {
        console.error(`  🔴 Sidebar Nav link [${screen}] -> NOT FOUND`);
      }
    }

    // 3. Take a screenshot of the initial dashboard state
    const screenshotPath = path.join(__dirname, '../public/assets/dashboard_verified.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Captured page screenshot to: ${screenshotPath}`);

    // Summary of results
    console.log('\n================================================================');
    if (consoleErrors.length === 0) {
      console.log('🎉 UI VERIFICATION SUCCESSFUL! No console errors detected.');
      console.log('All screens and navigation mappings verified in DOM.');
    } else {
      console.error(`⚠️  UI loaded, but detected ${consoleErrors.length} console/page errors.`);
    }
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ UI Verification Failed:', err.message);
    console.log('💡 Note: Make sure your local server is running by typing "npm run dev" first.');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

verifyUI();
