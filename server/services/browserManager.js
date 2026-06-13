const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Apply Stealth Plugin to avoid bot-detect blocks
try {
  puppeteer.use(StealthPlugin());
} catch (e) {
  // Ignored if already registered
}

class BrowserManager {
  constructor() {
    this.browser = null;
    this.launchPromise = null;
    this.activePages = 0;
    this.closeTimer = null;
  }

  /**
   * Retrieves or initializes the singleton browser instance
   */
  async getBrowser() {
    // If browser is active and connected, return it
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    // If launch is already in progress, wait for it
    if (this.launchPromise) {
      return this.launchPromise;
    }

    console.log('🌐 Launching Singleton Puppeteer Browser Instance...');
    this.launchPromise = (async () => {
      try {
        // Detect Docker Chromium path if available
        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || null;

        this.browser = await puppeteer.launch({
          headless: true,
          executablePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--no-first-run',
            '--no-zygote',
            '--disable-features=site-per-process',
            '--window-size=1280,800'
          ]
        });

        this.browser.on('disconnected', () => {
          console.warn('⚠️ Singleton Browser disconnected.');
          this.browser = null;
          this.launchPromise = null;
        });

        console.log('✅ Singleton Browser loaded successfully.');
        return this.browser;
      } catch (err) {
        console.error('❌ Failed to launch Puppeteer browser:', err.message);
        this.browser = null;
        this.launchPromise = null;
        throw err;
      }
    })();

    return this.launchPromise;
  }

  /**
   * Creates a new page optimized for scraping (blocks css, images, fonts, media)
   */
  async newPage() {
    // Clear close timer since we are requesting a new page
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }

    const browserInstance = await this.getBrowser();
    const page = await browserInstance.newPage();
    
    this.activePages++;
    console.log(`[BrowserManager] Page opened. Active pages: ${this.activePages}`);

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Enable Request Interception to block heavy resources (images, fonts, stylesheets)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Listen to page close event to track activity and auto-close browser when inactive
    page.once('close', () => {
      this.activePages = Math.max(0, this.activePages - 1);
      console.log(`[BrowserManager] Page closed. Active pages: ${this.activePages}`);
      if (this.activePages === 0) {
        this.scheduleBrowserClose();
      }
    });

    return page;
  }

  scheduleBrowserClose() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
    }
    // Set 10 seconds timeout of inactivity before closing browser to save RAM
    this.closeTimer = setTimeout(async () => {
      if (this.activePages === 0) {
        console.log('[BrowserManager] No active pages for 10s. Shutting down browser to free memory...');
        await this.close();
      }
    }, 10000);
  }

  /**
   * Closes the active browser instance
   */
  async close() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    if (this.browser) {
      console.log('🌐 Shutting down active Singleton Browser...');
      try {
        await this.browser.close();
      } catch (err) {
        console.error('Error closing browser:', err.message);
      }
      this.browser = null;
      this.launchPromise = null;
    }
  }
}

module.exports = new BrowserManager();
