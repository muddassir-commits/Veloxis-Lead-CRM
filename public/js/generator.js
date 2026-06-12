/**
 * Veloxis Global CRM — Lead Generator Screen Controller
 */

const generator = {
  scrapedLeads: [],
  activeSource: 'maps',

  init() {
    console.log('🔄 Initializing Lead Generator Screen...');
    const form = document.getElementById('scraper-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleScrapeSubmit(e));
    }

    const socialForm = document.getElementById('social-scraper-form');
    if (socialForm) {
      socialForm.addEventListener('submit', (e) => this.handleSocialScrapeSubmit(e));
    }

    const apolloForm = document.getElementById('apollo-scraper-form');
    if (apolloForm) {
      apolloForm.addEventListener('submit', (e) => this.handleApolloScrapeSubmit(e));
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

  setSource(source) {
    this.activeSource = source;
    const btnMaps = document.getElementById('tab-btn-maps');
    const btnSocial = document.getElementById('tab-btn-social');
    const btnApollo = document.getElementById('tab-btn-apollo');
    const cardMaps = document.getElementById('card-maps-form');
    const cardSocial = document.getElementById('card-social-form');
    const cardApollo = document.getElementById('card-apollo-form');
    
    // Reset all buttons to secondary
    btnMaps.className = 'btn btn-secondary';
    btnMaps.style.background = 'none';
    btnSocial.className = 'btn btn-secondary';
    btnSocial.style.background = 'none';
    if (btnApollo) {
      btnApollo.className = 'btn btn-secondary';
      btnApollo.style.background = 'none';
    }

    // Hide all forms
    cardMaps.style.display = 'none';
    cardSocial.style.display = 'none';
    if (cardApollo) cardApollo.style.display = 'none';

    // Show selected
    if (source === 'maps') {
      btnMaps.className = 'btn btn-primary';
      btnMaps.style.background = '';
      cardMaps.style.display = 'block';
    } else if (source === 'social') {
      btnSocial.className = 'btn btn-primary';
      btnSocial.style.background = '';
      cardSocial.style.display = 'block';
    } else if (source === 'apollo') {
      if (btnApollo) {
        btnApollo.className = 'btn btn-primary';
        btnApollo.style.background = '';
      }
      if (cardApollo) cardApollo.style.display = 'block';
    }
  },

  async handleSocialScrapeSubmit(e) {
    e.preventDefault();
    const platform = document.getElementById('social-platform').value;
    const query = document.getElementById('social-query').value.trim();
    const region = document.getElementById('social-region').value.trim();
    const limit = parseInt(document.getElementById('social-limit').value);

    if (!query || !region) {
      app.showToast('error', 'Keywords and Location are required.');
      return;
    }

    // Show Loading
    document.getElementById('scraper-loading').style.display = 'flex';
    document.getElementById('scraper-results-card').style.display = 'none';
    
    const loadingText = document.getElementById('scraper-loading-text');
    loadingText.textContent = `Scraping DuckDuckGo for ${platform} profiles matching "${query}" in ${region}...`;

    try {
      const response = await api.scrapeSocial(platform, query, region, limit);
      this.scrapedLeads = response.results || [];
      
      this.renderScrapeResults();
      app.showToast('success', `Found ${this.scrapedLeads.length} ${platform} profiles successfully.`);
    } catch (err) {
      app.showToast('error', `Social search failed: ${err.message}`);
    } finally {
      document.getElementById('scraper-loading').style.display = 'none';
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

  async handleApolloScrapeSubmit(e) {
    e.preventDefault();
    const keywords = document.getElementById('apollo-keywords').value.trim();
    const titles = document.getElementById('apollo-titles').value.trim();
    const locations = document.getElementById('apollo-regions').value.trim();
    const limit = parseInt(document.getElementById('apollo-limit').value);

    if (!keywords && !titles && !locations) {
      app.showToast('error', 'Please provide at least one search parameter (Keywords, Job Titles, or Location).');
      return;
    }

    // Show Loading
    document.getElementById('scraper-loading').style.display = 'flex';
    document.getElementById('scraper-results-card').style.display = 'none';
    
    const loadingText = document.getElementById('scraper-loading-text');
    loadingText.textContent = `Searching Apollo.io API for B2B profiles matching "${keywords || titles || locations}"...`;

    try {
      const response = await api.searchApollo(keywords, titles, locations, limit);
      this.scrapedLeads = response.results || [];
      
      this.renderScrapeResults();
      app.showToast('success', `Found ${this.scrapedLeads.length} B2B prospects successfully.`);
    } catch (err) {
      app.showToast('error', `Apollo B2B search failed: ${err.message}`);
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

    // Dynamically adjust headers based on active source
    const headersTr = document.getElementById('scraper-results-headers');
    if (headersTr) {
      if (this.activeSource === 'apollo') {
        headersTr.innerHTML = `
          <th width="40"><input type="checkbox" id="scrape-select-all" checked></th>
          <th>Full Name</th>
          <th>Company</th>
          <th>Website</th>
          <th>Email / Phone</th>
          <th>Location</th>
          <th>Title / Industry</th>
        `;
      } else if (this.activeSource === 'social') {
        headersTr.innerHTML = `
          <th width="40"><input type="checkbox" id="scrape-select-all" checked></th>
          <th>Profile Name</th>
          <th>Platform Link</th>
          <th>Social Details</th>
          <th>Location</th>
          <th>Niche Keywords</th>
        `;
      } else {
        headersTr.innerHTML = `
          <th width="40"><input type="checkbox" id="scrape-select-all" checked></th>
          <th>Business Name</th>
          <th>Website</th>
          <th>Phone</th>
          <th>Rating</th>
          <th>Location</th>
          <th>Industry</th>
        `;
      }

      // Re-bind the Select All checkbox because we replaced the HTML
      const selectAllCheck = document.getElementById('scrape-select-all');
      if (selectAllCheck) {
        selectAllCheck.addEventListener('change', (e) => {
          const checks = document.querySelectorAll('.scrape-item-check');
          checks.forEach(c => c.checked = e.target.checked);
        });
      }
    }

    this.scrapedLeads.forEach((lead, index) => {
      const tr = document.createElement('tr');
      
      if (this.activeSource === 'apollo') {
        let contactInfo = '';
        if (lead.email) {
          contactInfo += `<div><i data-lucide="mail" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> ${lead.email}</div>`;
        }
        if (lead.phone) {
          contactInfo += `<div><i data-lucide="phone" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> ${lead.phone}</div>`;
        }
        if (!contactInfo) {
          contactInfo = '<span style="color:var(--text-muted);">None</span>';
        }

        let websiteLink = lead.website ? 
          `<a href="${lead.website}" target="_blank" style="color:var(--cyan);text-decoration:none;"><i data-lucide="link-2" style="width:14px;height:14px;vertical-align:middle;"></i> ${lead.website.replace(/^https?:\/\/(www\.)?/, '').slice(0, 25)}...</a>` : 
          '<span style="color:var(--text-muted);">None</span>';

        if (lead.linkedin) {
          websiteLink += ` <a href="${lead.linkedin}" target="_blank" style="color:#0077b5;text-decoration:none;margin-left:8px;" title="LinkedIn Profile"><i data-lucide="linkedin" style="width:14px;height:14px;vertical-align:middle;"></i></a>`;
        }

        tr.innerHTML = `
          <td><input type="checkbox" class="scrape-item-check" data-index="${index}" checked></td>
          <td style="font-weight: 600;">${lead.name}</td>
          <td>${lead.company}</td>
          <td>${websiteLink}</td>
          <td>${contactInfo}</td>
          <td>${lead.city}, ${lead.country}</td>
          <td><span class="badge badge-new" style="font-size:10px;">${lead.industry}</span></td>
        `;
      } else if (this.activeSource === 'social') {
        let platformLink = lead.website ? 
          `<a href="${lead.website}" target="_blank" style="color:var(--cyan);text-decoration:none;"><i data-lucide="link-2" style="width:14px;height:14px;vertical-align:middle;"></i> Profile Link</a>` : 
          '<span style="color:var(--text-muted);">None</span>';

        let socialDetails = '';
        if (lead.instagram) {
          socialDetails = `<span style="color:#e1306c;"><i data-lucide="instagram" style="width:12px;height:12px;vertical-align:middle;margin-right:4px;"></i>@${lead.instagram}</span>`;
        } else if (lead.linkedin) {
          socialDetails = `<span style="color:#0077b5;"><i data-lucide="linkedin" style="width:12px;height:12px;vertical-align:middle;margin-right:4px;"></i>LinkedIn</span>`;
        } else {
          socialDetails = '<span style="color:var(--text-muted);">N/A</span>';
        }

        tr.innerHTML = `
          <td><input type="checkbox" class="scrape-item-check" data-index="${index}" checked></td>
          <td style="font-weight: 600;">${lead.name}</td>
          <td>${platformLink}</td>
          <td>${socialDetails}</td>
          <td>${lead.city}, ${lead.country}</td>
          <td><span class="badge badge-new" style="font-size:10px;">${lead.industry}</span></td>
        `;
      } else {
        tr.innerHTML = `
          <td><input type="checkbox" class="scrape-item-check" data-index="${index}" checked></td>
          <td style="font-weight: 600;">${lead.name}</td>
          <td>${lead.website ? `<a href="${lead.website}" target="_blank" style="color:var(--cyan);text-decoration:none;"><i data-lucide="link-2" style="width:14px;height:14px;vertical-align:middle;"></i> ${lead.website.replace(/^https?:\/\/(www\.)?/, '').slice(0, 25)}...</a>` : '<span style="color:var(--text-muted);">None</span>'}</td>
          <td>${lead.phone || '<span style="color:var(--text-muted);">None</span>'}</td>
          <td><span style="color:var(--warning);font-weight:600;"><i data-lucide="star" style="width:12px;height:12px;fill:var(--warning);display:inline-block;vertical-align:middle;margin-right:2px;"></i> ${lead.rating || '4.0'}</span></td>
          <td>${lead.city}, ${lead.country}</td>
          <td><span class="badge badge-new" style="font-size:10px;">${lead.industry}</span></td>
        `;
      }
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
      
      let importNotes = '';
      if (this.activeSource === 'apollo') {
        importNotes = sl.notes || `Imported via Apollo B2B Search on ${new Date().toLocaleDateString()}.`;
      } else if (this.activeSource === 'social') {
        importNotes = sl.notes || `Imported via Social Prospector on ${new Date().toLocaleDateString()}.`;
      } else {
        importNotes = `Imported via Google Maps Scraper on ${new Date().toLocaleDateString()}. rating: ${sl.rating || 'N/A'}`;
      }

      leadsToImport.push({
        name: sl.name,
        company: sl.company || sl.name,
        website: sl.website || null,
        phone: sl.phone || null,
        email: sl.email || null,
        linkedin: sl.linkedin || null,
        instagram: sl.instagram || null,
        rating: sl.rating || null,
        city: sl.city || 'Unknown',
        country: sl.country || 'India',
        industry: sl.industry || 'Unknown',
        status: sl.status || (sl.email ? 'Researched' : 'New'),
        lead_score: sl.lead_score || 'Cold',
        notes: importNotes
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

    // Robust RFC-compliant CSV line parser handling double-quotes, commas inside quotes, and empty cells
    const splitCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      
      // Clean leading/trailing quotes and return
      return result.map(val => val.replace(/^"|"$/g, '').trim());
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
