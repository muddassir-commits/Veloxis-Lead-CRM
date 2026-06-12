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
    const browserInstance = await this.getBrowser();
    const page = await browserInstance.newPage();
    
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

    return page;
  }

  /**
   * Closes the active browser instance
   */
  async close() {
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
