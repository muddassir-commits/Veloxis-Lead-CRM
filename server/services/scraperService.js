const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const emailVerifyService = require('./emailVerifyService');
const emailFinderService = require('./emailFinderService');
const supabase = require('./supabaseService');

// Add stealth plugin to avoid Google bot blockages
puppeteer.use(StealthPlugin());

/**
 * Scrapes Google Maps for business listings based on search query
 * @param {string} query - The search query (e.g. "gyms in Lucknow")
 * @param {string} region - Filter region/country
 * @param {number} [maxResults=20] - Max listings to fetch
 * @returns {Promise<Array<Object>>} - Array of scraped businesses
 */
async function scrapeGoogleMaps(query, region = 'India', maxResults = 20) {
  console.log(`🔍 Scraping Google Maps for: "${query}" in region: ${region}`);
  
  let browser;
  const results = [];
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1280,800'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Construct search URL
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}+${encodeURIComponent(region)}`;
    console.log(`🌐 Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for the results pane to load or timeout
    try {
      await page.waitForSelector('a[href*="/maps/place/"]', { timeout: 15000 });
    } catch (e) {
      console.log('⚠️ No place listings found or page loading took too long.');
      await browser.close();
      return [];
    }

    // Scroll results sidebar to load more items
    console.log('📜 Scrolling results list to load items...');
    let totalItems = 0;
    let scrollCount = 0;
    
    while (totalItems < maxResults && scrollCount < 10) {
      // Find the scrollable feed container (usually role="feed")
      const scrollableDiv = await page.$('div[role="feed"]');
      if (!scrollableDiv) {
        break;
      }
      
      // Scroll down
      await page.evaluate((el) => {
        el.scrollBy(0, 1500);
      }, scrollableDiv);
      
      await new Promise(r => setTimeout(r, 2000));
      
      const itemCount = await page.$$eval('a[href*="/maps/place/"]', links => links.length);
      if (itemCount === totalItems) {
        // No new items loaded, break
        break;
      }
      totalItems = itemCount;
      scrollCount++;
      console.log(`  Loaded ~${totalItems} items...`);
    }

    // Extract basic listings
    const listings = await page.evaluate((limit) => {
      const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
      return links.slice(0, limit).map(link => {
        const parent = link.closest('.Nv2PK') || link.parentElement;
        
        // Extract Title
        const titleEl = parent ? parent.querySelector('.qbfCgd, .fontHeadlineSmall') : null;
        const name = titleEl ? titleEl.textContent.trim() : 'Unknown Business';
        
        // Extract Rating
        const ratingEl = parent ? parent.querySelector('.MW4etd, .fontBodyMedium span') : null;
        let rating = 4.0;
        if (ratingEl) {
          const match = ratingEl.textContent.match(/([0-9.]+)/);
          if (match) rating = parseFloat(match[1]);
        }

        // Extract Industry/Category
        let category = 'Business Services';
        const metaTexts = parent ? Array.from(parent.querySelectorAll('.W4EwHf, .fontBodyMedium')) : [];
        for (const meta of metaTexts) {
          const text = meta.textContent;
          // Clean category text
          if (text && !text.includes('·') && text.length > 2 && text.length < 30) {
            category = text.trim();
            break;
          }
        }

        return {
          name,
          rating,
          industry: category,
          url: link.href
        };
      });
    }, maxResults);

    console.log(`📋 Found ${listings.length} places. Detailed scraping...`);

    // Scrape details for each place
    for (let i = 0; i < listings.length; i++) {
      const item = listings[i];
      console.log(`➡️  Detail scraping place ${i + 1}/${listings.length}: ${item.name}`);
      
      try {
        await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const details = await page.evaluate(() => {
          // Select buttons with text patterns, aria-labels, or icons
          const buttons = Array.from(document.querySelectorAll('button[data-item-id], a[data-item-id]'));
          
          let phone = null;
          let website = null;
          let address = null;
          
          // Locate by data-item-id attributes
          const phoneBtn = document.querySelector('button[data-item-id^="phone:tel:"]');
          if (phoneBtn) {
            phone = phoneBtn.getAttribute('data-item-id').replace('phone:tel:', '').trim();
          }

          const webBtn = document.querySelector('a[data-item-id="authority"]');
          if (webBtn) {
            website = webBtn.href;
          }

          const addrBtn = document.querySelector('button[data-item-id="address"]');
          if (addrBtn) {
            address = addrBtn.textContent.trim();
          }

          // Fallbacks using text parsing if attributes missing
          if (!phone || !website) {
            buttons.forEach(btn => {
              const text = btn.textContent.trim();
              const id = btn.getAttribute('data-item-id') || '';
              
              if (!phone && (id.includes('phone') || text.match(/^\+?[0-9\s-]{8,20}$/))) {
                phone = text;
              }
              if (!website && (id === 'authority' || btn.tagName === 'A' && btn.href && btn.href.startsWith('http') && !btn.href.includes('google.com'))) {
                website = btn.href;
              }
            });
          }

          return { phone, website, address };
        });

        // Parse City/Country from address
        let city = 'Unknown';
        let country = region;
        
        if (details.address) {
          const parts = details.address.split(',');
          if (parts.length > 2) {
            city = parts[parts.length - 3].trim();
            // Clean up zip codes from city names
            city = city.replace(/[0-9\s-]/g, '');
          }
        }

        results.push({
          name: item.name,
          rating: item.rating,
          industry: item.industry,
          phone: details.phone,
          website: details.website,
          address: details.address,
          city: city,
          country: country
        });
        
        // Brief gap to emulate organic navigation
        await new Promise(r => setTimeout(r, 1000));
        
      } catch (err) {
        console.warn(`⚠️ Error detail-scraping listing "${item.name}":`, err.message);
        // Add basic details as fallback
        results.push({
          name: item.name,
          rating: item.rating,
          industry: item.industry,
          phone: null,
          website: null,
          address: null,
          city: 'Unknown',
          country: region
        });
      }
    }
    
  } catch (err) {
    console.error('❌ Google Maps Puppeteer error:', err.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return results;
}

module.exports = {
  scrapeGoogleMaps
};
