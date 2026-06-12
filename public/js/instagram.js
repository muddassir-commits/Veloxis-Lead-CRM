/**
 * Veloxis Global CRM — Instagram DM CRM Screen Controller
 */

const instagramOutreach = {
  leadsList: [],
  filteredLeads: [],
  selectedLead: null,
  activeTemplates: [],

  async init() {
    console.log('🔄 Initializing Instagram DM CRM Screen...');
  },

  async loadLeads() {
    console.log('🔄 Fetching Instagram leads...');
    try {
      // Fetch all leads
      const res = await api.getLeads({ limit: 1000 });
      // Filter for leads that have an instagram handle
      this.leadsList = (res.leads || []).filter(lead => lead.instagram);
      this.filteredLeads = [...this.leadsList];
      
      this.renderLeadsList();
      
      // Auto-select first lead if available and none selected
      if (this.filteredLeads.length > 0 && !this.selectedLead) {
        this.selectLead(this.filteredLeads[0].id);
      } else if (this.selectedLead) {
        // Refresh selected lead data
        this.selectLead(this.selectedLead.id);
      } else {
        this.showEmptyState(true);
      }

      // Load Instagram templates
      await this.loadTemplates();
    } catch (err) {
      app.showToast('error', `Failed to load Instagram leads: ${err.message}`);
    }
  },

  renderLeadsList() {
    const listContainer = document.getElementById('ig-leads-list');
    listContainer.innerHTML = '';

    if (this.filteredLeads.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 30px 10px; font-size: 13px;">
          No Instagram profiles found. Sourcing them from CRM Auto-Sourcing or Edit Lead Modal.
        </div>
      `;
      return;
    }

    this.filteredLeads.forEach(lead => {
      const item = document.createElement('div');
      const isActive = this.selectedLead && this.selectedLead.id === lead.id;
      item.className = `activity-item glow ${isActive ? 'active' : ''}`;
      item.style.cursor = 'pointer';
      item.style.padding = '12px';
      item.style.borderRadius = 'var(--radius-sm)';
      item.style.background = isActive ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)';
      item.style.border = isActive ? '1px solid rgba(108, 99, 255, 0.3)' : '1px solid var(--border-color)';
      item.style.marginBottom = '8px';
      item.style.display = 'flex';
      item.style.flexDirection = 'column';
      item.style.gap = '4px';
      item.style.transition = 'all 0.2s ease';

      item.addEventListener('click', () => this.selectLead(lead.id));

      let statusColor = 'var(--text-muted)';
      if (lead.status === 'Contacted') statusColor = 'var(--cyan)';
      if (lead.status === 'Followed Up') statusColor = 'var(--indigo)';
      if (lead.status === 'Replied') statusColor = 'var(--warning)';
      if (lead.status === 'Won') statusColor = 'var(--success)';

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <strong style="color: var(--text-primary); font-size: 14px;">${lead.name}</strong>
          <span class="badge" style="font-size: 10px; border-color: ${statusColor}; color: ${statusColor}; background: none; font-weight: 700;">${lead.status}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-secondary);">
          <span style="color: var(--cyan);">@${lead.instagram.replace('@', '')}</span>
          <span>${lead.company || 'Direct'}</span>
        </div>
      `;
      listContainer.appendChild(item);
    });
  },

  async selectLead(leadId) {
    const listItems = document.querySelectorAll('#ig-leads-list .activity-item');
    listItems.forEach(el => {
      el.style.background = 'rgba(255, 255, 255, 0.02)';
      el.style.border = '1px solid var(--border-color)';
      el.classList.remove('active');
    });

    try {
      const res = await api.getLead(leadId);
      this.selectedLead = res.lead;
      
      this.showEmptyState(false);

      document.getElementById('ig-workspace-name').textContent = this.selectedLead.name;
      
      const handle = this.selectedLead.instagram.replace('@', '');
      const handleLink = document.getElementById('ig-workspace-handle-link');
      handleLink.href = `https://instagram.com/${handle}`;
      document.getElementById('ig-workspace-handle').textContent = `@${handle}`;

      const webLink = document.getElementById('ig-workspace-website-link');
      if (this.selectedLead.website) {
        webLink.href = this.selectedLead.website;
        webLink.style.display = 'inline-block';
        webLink.textContent = 'Website';
      } else {
        webLink.style.display = 'none';
      }

      document.getElementById('ig-workspace-status').value = this.selectedLead.status;

      const researchDiv = document.getElementById('ig-workspace-research');
      if (this.selectedLead.deep_research || this.selectedLead.notes) {
        researchDiv.textContent = this.selectedLead.deep_research || this.selectedLead.notes;
      } else {
        researchDiv.textContent = `🏥 Company: ${this.selectedLead.company || this.selectedLead.name}
🎯 Vision: Focus local paid traffic campaigns to scale members.
⚠️ Lacking Areas:
- Digital audit scan is offline or website is missing.
💡 Solutions Needed:
- Connect CRM Auto-Sourcing or scan domains manually.`;
      }

      this.handleTemplateChange();

      this.renderHistory(res.history || []);
      
      safeCreateIcons();
    } catch (err) {
      app.showToast('error', `Failed to load lead details: ${err.message}`);
    }
  },

  renderHistory(history) {
    const historyContainer = document.getElementById('ig-workspace-history');
    historyContainer.innerHTML = '';
    
    const igHistory = history.filter(h => h.templates?.type === 'Instagram' || (h.step && h.step.includes('[Outreach] Sent manual message via Instagram')));
    
    if (igHistory.length === 0) {
      const notes = this.selectedLead.notes || '';
      const lines = notes.split('\n').filter(line => line.includes('[Outreach] Sent manual message via Instagram'));
      if (lines.length > 0) {
        lines.forEach(line => {
          const div = document.createElement('div');
          div.style.padding = '8px';
          div.style.background = 'rgba(255,255,255,0.02)';
          div.style.borderLeft = '2px solid var(--warning)';
          div.style.borderRadius = '2px';
          div.textContent = line;
          historyContainer.appendChild(div);
        });
        return;
      }

      historyContainer.innerHTML = '<div style="color: var(--text-muted); font-size:11px;">No outreach logs logged yet for this Instagram profile.</div>';
      return;
    }

    igHistory.forEach(h => {
      const div = document.createElement('div');
      div.style.padding = '8px';
      div.style.background = 'rgba(255,255,255,0.02)';
      div.style.borderLeft = '2px solid var(--warning)';
      div.style.borderRadius = '2px';
      
      const sentTime = h.sent_at ? new Date(h.sent_at).toLocaleString() : 'Recent';
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-weight:600; margin-bottom: 2px;">
          <span>${h.templates?.name || 'IG DM'}</span>
          <span style="color: var(--text-muted); font-size:10px;">${sentTime}</span>
        </div>
        <p style="font-size:11px; margin:0; color: var(--text-secondary);">${h.templates?.principle || 'Standard Angle'}</p>
      `;
      historyContainer.appendChild(div);
    });
  },

  showEmptyState(show) {
    document.getElementById('ig-empty-state').style.display = show ? 'block' : 'none';
    document.getElementById('ig-lead-workspace').style.display = show ? 'none' : 'flex';
  },

  async loadTemplates() {
    const select = document.getElementById('ig-select-template');
    select.innerHTML = '<option value="">Loading templates...</option>';

    try {
      const res = await api.getTemplates('Instagram');
      this.activeTemplates = res.templates || [];
      select.innerHTML = '';
      
      if (this.activeTemplates.length === 0) {
        select.innerHTML = '<option value="">No Instagram templates found</option>';
        return;
      }

      this.activeTemplates.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.name} (${t.principle || 'Standard angle'})`;
        select.appendChild(opt);
      });
    } catch (err) {
      select.innerHTML = '<option value="">Error loading templates</option>';
    }
  },

  async handleTemplateChange() {
    const templateId = document.getElementById('ig-select-template').value;
    const textarea = document.getElementById('ig-workspace-body');
    
    if (!templateId || !this.selectedLead) {
      textarea.value = '';
      return;
    }

    try {
      const res = await api.renderTemplate(this.selectedLead.id, templateId);
      textarea.value = res.body;
    } catch (err) {
      app.showToast('error', `Failed to render template: ${err.message}`);
    }
  },

  filterLeads() {
    const query = document.getElementById('ig-search').value.toLowerCase().trim();
    if (!query) {
      this.filteredLeads = [...this.leadsList];
    } else {
      this.filteredLeads = this.leadsList.filter(l => 
        l.name.toLowerCase().includes(query) || 
        l.company.toLowerCase().includes(query) || 
        l.instagram.toLowerCase().includes(query)
      );
    }
    this.renderLeadsList();
  },

  async changeStatus(newStatus) {
    if (!this.selectedLead) return;
    try {
      await api.updateLead(this.selectedLead.id, { status: newStatus });
      app.showToast('success', `Lead status updated to: ${newStatus}`);
      this.loadLeads();
    } catch (err) {
      app.showToast('error', `Failed to update status: ${err.message}`);
    }
  },

  copyMessage() {
    const text = document.getElementById('ig-workspace-body').value.trim();
    if (!text) return;

    navigator.clipboard.writeText(text)
      .then(() => app.showToast('success', 'Message copied to clipboard!'))
      .catch(() => app.showToast('error', 'Failed to copy to clipboard.'));
  },

  async launchInstagramProfile() {
    if (!this.selectedLead) return;
    
    const text = document.getElementById('ig-workspace-body').value.trim();
    if (text) {
      await navigator.clipboard.writeText(text).catch(() => {});
    }

    const handle = this.selectedLead.instagram.replace('@', '');
    const url = `https://instagram.com/${handle}`;
    window.open(url, '_blank');

    setTimeout(async () => {
      if (confirm(`Did you successfully paste and send the DM to @${handle}?\n\nClick "OK" to log this outreach in CRM.`)) {
        try {
          const select = document.getElementById('ig-select-template');
          const templateText = select.options[select.selectedIndex]?.text || 'Instagram Outreach';
          
          await api.updateLead(this.selectedLead.id, {
            status: 'Contacted',
            notes: `${this.selectedLead.notes || ''}\n[Outreach] Sent manual message via Instagram (${templateText}) on ${new Date().toLocaleDateString()}`.trim()
          });

          app.showToast('success', 'Logged manual outreach event successfully.');
          this.loadLeads();
        } catch (err) {
          app.showToast('error', `Failed to log outreach event: ${err.message}`);
        }
      }
    }, 1500);
  }
};

window.instagramOutreach = instagramOutreach;
