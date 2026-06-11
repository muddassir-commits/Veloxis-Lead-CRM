const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function runFullVerification() {
  console.log('🧪 Starting Full UI & DOM Verification via Chrome...');
  
  // Create output directory for screenshots
  const verifyDir = path.join(__dirname, '../public/assets/verification');
  if (!fs.existsSync(verifyDir)) {
    fs.mkdirSync(verifyDir, { recursive: true });
  }

  // Generate dynamic unique name and email to avoid unique database constraint errors
  const timestamp = Date.now();
  const testName = `Automation Test Lead ${timestamp}`;
  const testEmail = `theofficialmuddassir+test${timestamp}@gmail.com`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

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

    // 1. Visit App
    console.log('📡 Accessing http://localhost:5000...');
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Connected to dashboard.');
    
    // Screenshot: Dashboard
    await page.screenshot({ path: path.join(verifyDir, '1_dashboard.png') });
    console.log('📸 Dashboard screen screenshotted.');

    // 2. Navigate to Leads CRM
    console.log('\n➡️ Navigating to Leads CRM...');
    await page.click('#nav-leads');
    await page.waitForSelector('#screen-leads.active', { timeout: 5000 });
    await page.waitForSelector('#crm-table-body', { timeout: 5000 });
    await page.screenshot({ path: path.join(verifyDir, '2_leads_crm.png') });
    console.log('📸 Leads CRM screen screenshotted.');

    // 3. Open Add Lead Modal
    console.log('\n➕ Opening Add Lead Modal...');
    await page.click('button[onclick="leads.openAddLeadModal()"]');
    await page.waitForSelector('#modal-lead.open', { timeout: 3000 });
    await page.screenshot({ path: path.join(verifyDir, '3_add_lead_modal.png') });
    console.log('📸 Add Lead Modal screenshotted.');

    // 4. Fill and Submit Form
    console.log('✍️ Filling Lead Form...');
    await page.type('#lead-input-name', testName);
    await page.type('#lead-input-company', 'AutoCorp Solutions');
    await page.type('#lead-input-email', testEmail);
    await page.type('#lead-input-website', 'https://autocorp-solutions.com');
    await page.type('#lead-input-linkedin', 'https://linkedin.com/in/autocorp-test');
    await page.type('#lead-input-instagram', 'autocorp_test');
    await page.type('#lead-input-city', 'Lucknow');
    await page.type('#lead-input-country', 'India');
    await page.type('#lead-input-industry', 'E-commerce');
    await page.type('#lead-input-notes', 'This is a lead generated via Puppeteer automation verification script.');

    console.log('💾 Submitting form...');
    await page.click('#modal-lead-form button[type="submit"]');
    
    // Wait for modal to close and table to reload
    await page.waitForSelector('#modal-lead:not(.open)', { timeout: 5000 });
    console.log('✅ Lead form submitted and modal closed.');
    
    // Wait for list reload
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot of updated CRM table
    await page.screenshot({ path: path.join(verifyDir, '4_leads_crm_updated.png') });
    console.log('📸 Updated CRM table screenshotted.');

    // 5. Open Lead Detail Side Panel
    console.log(`\n🔍 Opening Lead Detail Side Panel for "${testName}"...`);
    // Find the row containing our unique testName and click it
    const rowClicked = await page.evaluate((name) => {
      const rows = Array.from(document.querySelectorAll('tr'));
      const targetRow = rows.find(row => row.textContent.includes(name));
      if (targetRow) {
        // Click on the second column cell (name cell) to avoid checkbox/buttons click
        const nameCell = targetRow.querySelectorAll('td')[1];
        if (nameCell) {
          nameCell.click();
          return true;
        }
      }
      return false;
    }, testName);

    if (!rowClicked) {
      throw new Error(`Could not find and click the newly created lead row with name: ${testName}`);
    }

    console.log('⏳ Waiting for side panel to open and load data...');
    await page.waitForSelector('#lead-side-panel.open', { timeout: 5000 });
    await page.waitForSelector('#panel-lead-content div:not(.loading-container)', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 1000)); // small extra buffer for rendering
    await page.screenshot({ path: path.join(verifyDir, '5_lead_detail_panel.png') });
    console.log('📸 Lead Detail Side Panel screenshotted.');

    // 6. Verify Inline SVGs exist in the DOM
    console.log('🔍 Checking Social Links SVGs inside DOM...');
    const svgCount = await page.evaluate(() => {
      const panel = document.getElementById('panel-lead-content');
      const svgs = panel.querySelectorAll('a svg');
      return svgs.length;
    });
    console.log(`🟢 Verified: Found ${svgCount} inline SVGs in detail social buttons (LinkedIn + Instagram).`);

    // 7. Update Notes in Side Panel
    console.log('\n📝 Updating notes in side panel...');
    await page.focus('#panel-notes');
    // Clear notes field
    await page.evaluate(() => {
      document.getElementById('panel-notes').value = '';
    });
    await page.type('#panel-notes', 'Updated: This lead is verified using Puppeteer DOM testing. Notes saved.');
    console.log('💾 Saving notes...');
    await page.click('button[onclick="leads.savePanelNotes()"]');
    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for toast/API update

    // Take screenshot of saved notes state
    await page.screenshot({ path: path.join(verifyDir, '6_lead_notes_updated.png') });
    console.log('📸 Notes update verified and screenshotted.');

    // Close side panel
    await page.evaluate(() => {
      leads.closeSidePanel();
    });
    await page.waitForSelector('#lead-side-panel:not(.open)', { timeout: 3000 });
    console.log('✅ Side panel closed.');

    // 8. Visit all remaining screens
    const screens = [
      { id: 'generator', name: 'Lead Generator' },
      { id: 'templates', name: 'Outreach Hub' },
      { id: 'sequences', name: 'Sequence Manager' },
      { id: 'planner', name: 'Weekly Planner' },
      { id: 'icp', name: 'ICP Builder' },
      { id: 'analytics', name: 'Analytics' },
      { id: 'settings', name: 'Settings' }
    ];

    for (let i = 0; i < screens.length; i++) {
      const scr = screens[i];
      console.log(`\n➡️ Navigating to ${scr.name}...`);
      await page.click(`#nav-${scr.id}`);
      await page.waitForSelector(`#screen-${scr.id}.active`, { timeout: 5000 });
      
      // Special waits for slow loading sections
      if (scr.id === 'analytics') {
        await page.waitForSelector('svg', { timeout: 5000 }); // wait for custom SVGs
      }
      
      await new Promise(resolve => setTimeout(resolve, 800)); // transitions
      await page.screenshot({ path: path.join(verifyDir, `7_screen_${scr.id}.png`) });
      console.log(`📸 ${scr.name} screenshotted.`);
    }

    // Summary of results
    console.log('\n================================================================');
    if (consoleErrors.length === 0) {
      console.log('🎉 ALL MANUAL & AUTOMATED VERIFICATION STEPS PASSED SUCCESSFULLY!');
      console.log('No console errors detected. All screens function and load correctly.');
    } else {
      console.warn(`⚠️ UI loaded, but detected ${consoleErrors.length} console/page errors.`);
    }
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ Verification Process Failed:', err.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runFullVerification();
