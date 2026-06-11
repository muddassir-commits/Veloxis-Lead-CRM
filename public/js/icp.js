/**
 * Veloxis Global CRM — ICP Builder Screen Controller
 */

const icp = {
  activeICP: null,

  async init() {
    console.log('🔄 Initializing ICP Builder Screen...');
    await this.loadICP();
  },

  async loadICP() {
    try {
      const response = await api.getICPs();
      const icps = response.icps || [];

      if (icps.length > 0) {
        this.activeICP = icps[0]; // grab primary ICP
        this.populateForm();
        this.renderICPMarkerCard();
      } else {
        // Render defaults
        this.renderICPMarkerCard({
          name: 'Veloxis High-Ticket ICP',
          industries: ['Education / Coaching', 'Real Estate', 'E-commerce', 'Gyms / Fitness'],
          regions: ['India', 'USA', 'UK'],
          decision_makers: ['Founder', 'CEO', 'Owner']
        });
      }
    } catch (err) {
      console.error('Failed to load ICP details:', err.message);
    }
  },

  populateForm() {
    if (!this.activeICP) return;

    document.getElementById('icp-id').value = this.activeICP.id;
    
    // Checkboxes helper
    const checkBoxes = (name, valuesArray) => {
      const inputs = document.querySelectorAll(`input[name="${name}"]`);
      inputs.forEach(input => {
        input.checked = valuesArray.includes(input.value);
      });
    };

    checkBoxes('icp-industries', this.activeICP.industries || []);
    checkBoxes('icp-regions', this.activeICP.regions || []);
    checkBoxes('icp-roles', this.activeICP.decision_makers || []);
  },

  async saveICP(e) {
    e.preventDefault();

    const getCheckedValues = (name) => {
      const checked = document.querySelectorAll(`input[name="${name}"]:checked`);
      return Array.from(checked).map(c => c.value);
    };

    const id = document.getElementById('icp-id').value || null;
    
    const icpData = {
      name: 'Veloxis High-Ticket ICP',
      industries: getCheckedValues('icp-industries'),
      regions: getCheckedValues('icp-regions'),
      decision_makers: getCheckedValues('icp-roles'),
      company_sizes: ['Solo', '1-10', '10-50'], // defaults
      pain_points: ['Slow website', 'Poor Google rankings']
    };

    if (id) icpData.id = id;

    try {
      const response = await api.saveICP(icpData);
      this.activeICP = response.icp;
      
      this.renderICPMarkerCard();
      app.showToast('success', 'Ideal Customer Profile targets updated successfully.');
    } catch (err) {
      app.showToast('error', `Failed to update ICP: ${err.message}`);
    }
  },

  renderICPMarkerCard(fallbackData = null) {
    const data = fallbackData || this.activeICP;
    if (!data) return;

    document.getElementById('icp-card-name').textContent = data.name || 'Veloxis High-Ticket ICP';

    const renderTags = (containerId, tagsArray, colorClass = 'badge-researched') => {
      const el = document.getElementById(containerId);
      el.innerHTML = '';
      if (!tagsArray || tagsArray.length === 0) {
        el.innerHTML = '<span style="font-size:11px;color:var(--text-muted);">None Selected</span>';
        return;
      }
      tagsArray.forEach(tag => {
        const span = document.createElement('span');
        span.className = `badge ${colorClass}`;
        span.style.fontSize = '9px';
        span.textContent = tag;
        el.appendChild(span);
      });
    };

    renderTags('icp-view-industries', data.industries, 'badge-researched');
    renderTags('icp-view-regions', data.regions, 'badge-contacted');
    renderTags('icp-view-roles', data.decision_makers || data.roles, 'badge-new');
  }
};

window.icp = icp;
