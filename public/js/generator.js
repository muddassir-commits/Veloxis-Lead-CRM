/**
 * Veloxis Global CRM — Lead Generator Screen Controller
 */

const generator = {
  scrapedLeads: [],

  init() {
    console.log('🔄 Initializing Lead Generator Screen...');
    const form = document.getElementById('scraper-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleScrapeSubmit(e));
    }

    // Bind Select All Checkbox
    const selectAllCheck = document.getElementById('scrape-select-all');
    if (selectAllCheck) {
      selectAllCheck.addEventListener('change', (e) => {
        const checks = document.querySelectorAll('.scrape-item-check');
        checks.forEach(c => c.checked = e.target.checked);
      });
    }

    // Bind CSV File selector
    const csvInput = document.getElementById('csv-file-input');
    if (csvInput) {
      csvInput.addEventListener('change', (e) => this.handleCSVFileSelected(e));
    }
  },

  async handleScrapeSubmit(e) {
    e.preventDefault();
    const query = document.getElementById('scrape-query').value.trim();
    const region = document.getElementById('scrape-region').value.trim();
    const limit = parseInt(document.getElementById('scrape-limit').value);

    if (!query || !region) return;

    // Show Loading
    document.getElementById('scraper-loading').style.display = 'flex';
    document.getElementById('scraper-results-card').style.display = 'none';
    
    const loadingText = document.getElementById('scraper-loading-text');
    loadingText.textContent = `Searching Google Maps for "${query}" in ${region}...`;

    try {
      const response = await api.scrapeMaps(query, region, limit);
      this.scrapedLeads = response.results || [];
      
      this.renderScrapeResults();
      app.showToast('success', `Scraped ${this.scrapedLeads.length} leads successfully.`);
    } catch (err) {
      app.showToast('error', `Scraper failed: ${err.message}`);
    } finally {
      document.getElementById('scraper-loading').style.display = 'none';
    }
  },

  renderScrapeResults() {
    const resultsCard = document.getElementById('scraper-results-card');
    const tbody = document.getElementById('scraper-results-body');
    const countSpan = document.getElementById('scraped-count');

    tbody.innerHTML = '';
    countSpan.textContent = this.scrapedLeads.length;

    if (this.scrapedLeads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No listings found matching your keywords.</td></tr>';
      resultsCard.style.display = 'block';
      return;
    }

    this.scrapedLeads.forEach((lead, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="scrape-item-check" data-index="${index}" checked></td>
        <td style="font-weight: 600;">${lead.name}</td>
        <td>${lead.website ? `<a href="${lead.website}" target="_blank" style="color:var(--cyan);text-decoration:none;"><i data-lucide="link-2" style="width:14px;height:14px;vertical-align:middle;"></i> ${lead.website.replace(/^https?:\/\/(www\.)?/, '').slice(0, 25)}...</a>` : '<span style="color:var(--text-muted);">None</span>'}</td>
        <td>${lead.phone || '<span style="color:var(--text-muted);">None</span>'}</td>
        <td><span style="color:var(--warning);font-weight:600;"><i data-lucide="star" style="width:12px;height:12px;fill:var(--warning);display:inline-block;vertical-align:middle;margin-right:2px;"></i> ${lead.rating || '4.0'}</span></td>
        <td>${lead.city}, ${lead.country}</td>
        <td><span class="badge badge-new" style="font-size:10px;">${lead.industry}</span></td>
      `;
      tbody.appendChild(tr);
    });

    // Refresh icons
    lucide.createIcons();
    resultsCard.style.display = 'block';
  },

  async importSelectedLeads() {
    const checkedBoxes = document.querySelectorAll('.scrape-item-check:checked');
    if (checkedBoxes.length === 0) {
      app.showToast('error', 'Select at least one lead to import.');
      return;
    }

    const leadsToImport = [];
    checkedBoxes.forEach(box => {
      const idx = parseInt(box.getAttribute('data-index'));
      const sl = this.scrapedLeads[idx];
      
      leadsToImport.push({
        name: sl.name,
        company: sl.name,
        website: sl.website || null,
        phone: sl.phone || null,
        rating: sl.rating || 4.0,
        city: sl.city || 'Unknown',
        country: sl.country || 'India',
        industry: sl.industry || 'Unknown',
        status: 'New',
        lead_score: 'Cold',
        notes: `Imported via Google Maps Scraper on ${new Date().toLocaleDateString()}. rating: ${sl.rating || 'N/A'}`
      });
    });

    try {
      await api.bulkInsertLeads(leadsToImport);
      app.showToast('success', `Imported ${leadsToImport.length} leads into the CRM.`);
      
      // Navigate to Leads Screen
      app.showScreen('leads');
      leads.loadLeads();
    } catch (err) {
      app.showToast('error', `Import failed: ${err.message}`);
    }
  },

  triggerCSVImport() {
    document.getElementById('csv-file-input').click();
  },

  handleCSVFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    console.log(`📂 Reading CSV File: ${file.name}`);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const leads = this.parseCSVText(text);
        
        if (leads.length === 0) {
          throw new Error('No valid leads parsed from CSV. Check column headers.');
        }

        await api.bulkInsertLeads(leads);
        app.showToast('success', `Parsed and imported ${leads.length} leads from CSV file.`);
        
        app.showScreen('leads');
        leads.loadLeads();
      } catch (err) {
        app.showToast('error', `CSV Import Error: ${err.message}`);
      }
    };
    reader.readAsText(file);
    // Clear value to allow selecting same file again
    e.target.value = '';
  },

  parseCSVText(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    // Simple CSV splitter handling quoted values
    const splitCSVLine = (line) => {
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      return matches.map(val => val.replace(/^"|"$/g, '').trim());
    };

    const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase());
    const parsedLeads = [];

    // Find Header Column Indexes
    const idxName = headers.findIndex(h => h.includes('name'));
    const idxCompany = headers.findIndex(h => h.includes('company') || h.includes('business'));
    const idxEmail = headers.findIndex(h => h.includes('email') || h.includes('mail'));
    const idxPhone = headers.findIndex(h => h.includes('phone') || h.includes('tel'));
    const idxWebsite = headers.findIndex(h => h.includes('website') || h.includes('url') || h.includes('site'));
    const idxLinkedin = headers.findIndex(h => h.includes('linkedin'));
    const idxInstagram = headers.findIndex(h => h.includes('instagram') || h.includes('ig'));
    const idxCity = headers.findIndex(h => h.includes('city') || h.includes('town'));
    const idxCountry = headers.findIndex(h => h.includes('country'));
    const idxIndustry = headers.findIndex(h => h.includes('industry') || h.includes('category') || h.includes('type'));

    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      if (cols.length === 0) continue;

      // Extract Name (Required, fallback to company name)
      const name = cols[idxName] || cols[idxCompany] || 'Unknown Prospect';
      
      const lead = {
        name,
        company: cols[idxCompany] || cols[idxName] || 'Unknown Company',
        email: cols[idxEmail] || null,
        phone: cols[idxPhone] || null,
        website: cols[idxWebsite] || null,
        linkedin: cols[idxLinkedin] || null,
        instagram: cols[idxInstagram] || null,
        city: cols[idxCity] || 'Unknown',
        country: cols[idxCountry] || 'India',
        industry: cols[idxIndustry] || 'Unknown Services',
        status: 'New',
        lead_score: 'Cold',
        notes: `Imported via CSV file on ${new Date().toLocaleDateString()}`
      };

      // Ensure proper website format
      if (lead.website && !/^https?:\/\//i.test(lead.website)) {
        lead.website = `https://${lead.website}`;
      }

      parsedLeads.push(lead);
    }

    return parsedLeads;
  }
};

window.generator = generator;
