/**
 * Veloxis Global CRM — Outreach Templates Screen Controller
 */

const templates = {
  activeType: 'Email', // 'Email', 'LinkedIn', 'Instagram'
  templatesList: [],

  init() {
    console.log('🔄 Initializing Outreach Templates Screen...');
    this.loadTemplates();
  },

  setType(type) {
    this.activeType = type;
    document.getElementById('btn-temp-email').classList.toggle('active', type === 'Email');
    document.getElementById('btn-temp-linkedin').classList.toggle('active', type === 'LinkedIn');
    document.getElementById('btn-temp-instagram').classList.toggle('active', type === 'Instagram');
    
    this.renderTemplates();
  },

  async loadTemplates() {
    try {
      const res = await api.getTemplates();
      this.templatesList = res.templates || [];
      this.renderTemplates();
    } catch (err) {
      console.error('Failed to load templates:', err.message);
    }
  },

  renderTemplates() {
    const container = document.getElementById('templates-container');
    container.innerHTML = '';

    const filtered = this.templatesList.filter(t => t.type === this.activeType);

    if (filtered.length === 0) {
      container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">No templates created for this channel.</div>';
      return;
    }

    filtered.forEach(temp => {
      const card = document.createElement('div');
      card.className = 'card template-card glow';
      
      // Highlight variables in cyan
      const highlightedBody = temp.body.replace(/(\{\{\s*(\w+)\s*\}\})/g, '<span class="variable">$1</span>');

      card.innerHTML = `
        <div class="template-badge-row">
          <span class="badge badge-researched" style="font-size:10px;">${temp.principle || 'Standard'}</span>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary btn-icon" style="width:26px;height:26px;" onclick="templates.openEditModal('${temp.id}')"><i data-lucide="edit-3" style="width:12px;height:12px;"></i></button>
            <button class="btn btn-danger btn-icon" style="width:26px;height:26px;" onclick="templates.deleteTemplate('${temp.id}')"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>
          </div>
        </div>
        
        <h3 style="font-size: 16px; font-weight:700;">${temp.name}</h3>
        ${temp.subject ? `<div style="font-size:13px; color:var(--text-secondary);"><span style="color:var(--text-muted);">Subject:</span> <strong>${temp.subject}</strong></div>` : ''}
        
        <div class="template-body-preview">${highlightedBody}</div>
        
        <button class="btn btn-secondary" style="width:100%; margin-top:auto;" onclick="templates.copyToClipboard('${temp.id}')">
          <i data-lucide="copy"></i> Copy Template Body
        </button>
      `;
      container.appendChild(card);
    });

    lucide.createIcons();
  },

  copyToClipboard(id) {
    const temp = this.templatesList.find(t => t.id === id);
    if (!temp) return;

    navigator.clipboard.writeText(temp.body)
      .then(() => {
        app.showToast('success', 'Template copied to clipboard.');
      })
      .catch(err => {
        app.showToast('error', `Copy failed: ${err.message}`);
      });
  },

  openCreateModal() {
    document.getElementById('modal-temp-title').textContent = 'Add New Template';
    document.getElementById('modal-temp-id').value = '';
    document.getElementById('modal-temp-form').reset();
    
    // Set default selected type
    document.getElementById('temp-input-type').value = this.activeType;
    this.toggleSubjectField(this.activeType);

    document.getElementById('modal-template').classList.add('open');
  },

  async openEditModal(id) {
    document.getElementById('modal-temp-title').textContent = 'Edit Template';
    const form = document.getElementById('modal-temp-form');
    form.reset();

    const temp = this.templatesList.find(t => t.id === id);
    if (!temp) return;

    document.getElementById('modal-temp-id').value = temp.id;
    document.getElementById('temp-input-name').value = temp.name;
    document.getElementById('temp-input-type').value = temp.type;
    document.getElementById('temp-input-principle').value = temp.principle || '';
    document.getElementById('temp-input-subject').value = temp.subject || '';
    document.getElementById('temp-input-body').value = temp.body;

    this.toggleSubjectField(temp.type);
    document.getElementById('modal-template').classList.add('open');
  },

  closeModal() {
    document.getElementById('modal-template').classList.remove('open');
  },

  toggleSubjectField(type) {
    const group = document.getElementById('temp-subject-group');
    const input = document.getElementById('temp-input-subject');
    if (type === 'Email') {
      group.style.display = 'flex';
      input.required = true;
    } else {
      group.style.display = 'none';
      input.required = false;
      input.value = '';
    }
  },

  async saveTemplate(e) {
    e.preventDefault();
    const id = document.getElementById('modal-temp-id').value;
    
    const type = document.getElementById('temp-input-type').value;
    const data = {
      name: document.getElementById('temp-input-name').value.trim(),
      type,
      principle: document.getElementById('temp-input-principle').value.trim() || null,
      subject: type === 'Email' ? document.getElementById('temp-input-subject').value.trim() : null,
      body: document.getElementById('temp-input-body').value.trim()
    };

    // Calculate variables list automatically
    const varMatches = data.body.match(/\{\{\s*(\w+)\s*\}\}/g) || [];
    data.variables = Array.from(new Set(varMatches.map(m => m.replace(/\{\{\s*|\s*\}\}/g, ''))));

    try {
      if (id) {
        await api.updateTemplate(id, data);
        app.showToast('success', 'Template updated successfully.');
      } else {
        await api.createTemplate(data);
        app.showToast('success', 'Template created successfully.');
      }
      this.closeModal();
      this.loadTemplates();
    } catch (err) {
      app.showToast('error', `Failed to save template: ${err.message}`);
    }
  },

  async deleteTemplate(id) {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.deleteTemplate(id);
      app.showToast('success', 'Template deleted successfully.');
      this.loadTemplates();
    } catch (err) {
      app.showToast('error', `Failed to delete template: ${err.message}`);
    }
  }
};

window.templates = templates;
