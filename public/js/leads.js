/**
 * Veloxis Global CRM — Leads CRM Screen Controller
 */

const leads = {
  viewMode: 'table', // 'table' or 'kanban'
  leadsList: [],
  selectedLeadIds: new Set(),
  activeLeadId: null,

  init() {
    console.log('🔄 Initializing Leads CRM Screen...');
    
    // Bind table select all checkbox
    const selectAllCheck = document.getElementById('crm-select-all');
    if (selectAllCheck) {
      selectAllCheck.addEventListener('change', (e) => {
        const checks = document.querySelectorAll('.crm-item-check');
        this.selectedLeadIds.clear();
        checks.forEach(c => {
          c.checked = e.target.checked;
          const id = c.getAttribute('data-id');
          if (e.target.checked && id) this.selectedLeadIds.add(id);
        });
        this.updateBulkActionsBar();
      });
    }

    this.loadLeads();
  },

  async loadLeads() {
    document.getElementById('crm-loading').style.display = 'flex';
    document.getElementById('crm-table-card').style.display = 'none';
    document.getElementById('crm-kanban-card').style.display = 'none';

    try {
      const response = await api.getLeads();
      this.leadsList = response.leads || [];
      this.selectedLeadIds.clear();
      
      const selectAll = document.getElementById('crm-select-all');
      if (selectAll) selectAll.checked = false;
      this.updateBulkActionsBar();

      if (this.viewMode === 'table') {
        this.renderTable();
      } else {
        this.renderKanban();
      }
    } catch (err) {
      app.showToast('error', `Failed to load CRM leads: ${err.message}`);
    } finally {
      document.getElementById('crm-loading').style.display = 'none';
    }
  },

  setView(mode) {
    this.viewMode = mode;
    document.getElementById('btn-view-table').classList.toggle('active', mode === 'table');
    document.getElementById('btn-view-kanban').classList.toggle('active', mode === 'kanban');
    
    if (mode === 'table') {
      document.getElementById('crm-table-card').style.display = 'block';
      document.getElementById('crm-kanban-card').style.display = 'none';
      this.renderTable();
    } else {
      document.getElementById('crm-table-card').style.display = 'none';
      document.getElementById('crm-kanban-card').style.display = 'flex';
      this.renderKanban();
    }
  },

  filterLeads() {
    const search = document.getElementById('crm-search').value.toLowerCase();
    const status = document.getElementById('crm-filter-status').value;
    
    const filtered = this.leadsList.filter(lead => {
      const matchSearch = !search || 
        lead.name.toLowerCase().includes(search) || 
        (lead.company && lead.company.toLowerCase().includes(search)) || 
        (lead.email && lead.email.toLowerCase().includes(search));
        
      const matchStatus = !status || lead.status === status;
      return matchSearch && matchStatus;
    });

    if (this.viewMode === 'table') {
      this.renderTable(filtered);
    } else {
      this.renderKanban(filtered);
    }
  },

  renderTable(customList = null) {
    const list = customList || this.leadsList;
    const tbody = document.getElementById('crm-table-body');
    tbody.innerHTML = '';
    
    document.getElementById('crm-showing-count').textContent = list.length;

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No leads in CRM. Run Lead Generator to scrape new leads.</td></tr>';
      return;
    }

    list.forEach(lead => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', (e) => {
        // Prevent opening side panel when clicking check or buttons
        if (e.target.tagName === 'INPUT' || e.target.closest('.btn') || e.target.closest('a')) return;
        this.openSidePanel(lead.id);
      });

      const isChecked = this.selectedLeadIds.has(lead.id);

      tr.innerHTML = `
        <td><input type="checkbox" class="crm-item-check" data-id="${lead.id}" ${isChecked ? 'checked' : ''} onclick="leads.handleRowCheck(event, '${lead.id}')"></td>
        <td style="font-weight: 600;">${lead.name}</td>
        <td>${lead.company || '<span style="color:var(--text-muted);">None</span>'}</td>
        <td>${lead.email || '<span style="color:var(--text-muted);font-style:italic;">No Email</span>'}</td>
        <td>${lead.website ? `<a href="${lead.website}" target="_blank" style="color:var(--cyan);text-decoration:none;"><i data-lucide="link-2" style="width:12px;height:12px;display:inline-block;vertical-align:middle;"></i> Website</a>` : '<span style="color:var(--text-muted);">None</span>'}</td>
        <td><span class="badge badge-${lead.status.toLowerCase().replace(' ', '')}">${lead.status}</span></td>
        <td><span class="score-badge score-${lead.lead_score.toLowerCase()}">${lead.lead_score}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary btn-icon" style="width:28px;height:28px;" onclick="leads.openEditLeadModal('${lead.id}')" title="Edit"><i data-lucide="edit-3" style="width:14px;height:14px;"></i></button>
            <button class="btn btn-danger btn-icon" style="width:28px;height:28px;" onclick="leads.deleteLead('${lead.id}')" title="Delete"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    lucide.createIcons();
    document.getElementById('crm-table-card').style.display = 'block';
  },

  handleRowCheck(e, id) {
    if (e.target.checked) {
      this.selectedLeadIds.add(id);
    } else {
      this.selectedLeadIds.delete(id);
    }
    this.updateBulkActionsBar();
  },

  updateBulkActionsBar() {
    const bar = document.getElementById('crm-bulk-actions');
    if (this.selectedLeadIds.size > 0) {
      bar.style.display = 'flex';
    } else {
      bar.style.display = 'none';
    }
  },

  renderKanban(customList = null) {
    const list = customList || this.leadsList;
    const board = document.getElementById('crm-kanban-card');
    board.innerHTML = '';

    const stages = ['New', 'Researched', 'Contacted', 'Followed Up', 'Replied', 'Meeting', 'Won', 'Lost'];

    stages.forEach(stage => {
      const stageLeads = list.filter(l => l.status === stage);
      
      const col = document.createElement('div');
      col.className = 'kanban-col';
      col.setAttribute('data-stage', stage);
      col.addEventListener('dragover', (e) => e.preventDefault());
      col.addEventListener('drop', (e) => this.handleKanbanDrop(e, stage));

      col.innerHTML = `
        <div class="kanban-col-header">
          <span class="kanban-col-title"><i data-lucide="folder" style="width:14px;height:14px;"></i> ${stage}</span>
          <span class="kanban-col-count">${stageLeads.length}</span>
        </div>
        <div class="kanban-cards"></div>
      `;

      const cardsContainer = col.querySelector('.kanban-cards');
      
      if (stageLeads.length === 0) {
        cardsContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:11px; padding:15px;">Empty Column</div>';
      }

      stageLeads.forEach(lead => {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', lead.id);
        });
        card.addEventListener('click', () => this.openSidePanel(lead.id));

        card.innerHTML = `
          <div class="kanban-card-title">${lead.name}</div>
          <div class="kanban-card-company">${lead.company || 'Direct'}</div>
          <div class="kanban-card-footer">
            <span class="score-badge score-${lead.lead_score.toLowerCase()}">${lead.lead_score}</span>
            <span style="font-size:10px; color:var(--text-muted);">${lead.city || 'India'}</span>
          </div>
        `;
        cardsContainer.appendChild(card);
      });

      board.appendChild(col);
    });

    lucide.createIcons();
    board.style.display = 'flex';
  },

  async handleKanbanDrop(e, targetStage) {
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    try {
      await api.updateLead(leadId, { status: targetStage });
      app.showToast('success', `Lead status updated to ${targetStage}`);
      this.loadLeads();
    } catch (err) {
      app.showToast('error', `Failed to update status: ${err.message}`);
    }
  },

  // Split Panel slide controller
  async openSidePanel(leadId) {
    this.activeLeadId = leadId;
    const panel = document.getElementById('lead-side-panel');
    const content = document.getElementById('panel-lead-content');
    
    panel.classList.add('open');
    content.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>';

    try {
      const response = await api.getLead(leadId);
      const lead = response.lead;
      const history = response.history;
      const tracking = response.tracking;
      const sequence = response.sequence;

      document.getElementById('panel-lead-name').textContent = lead.name;

      // Check current sequence status
      let sequenceStatus = '<span style="color:var(--text-muted);">Not Started</span>';
      let seqActions = `<button class="btn btn-primary" style="width:100%;" onclick="leads.startLeadSequence('${lead.id}')"><i data-lucide="play"></i> Trigger Hormozi Sequence</button>`;
      
      if (sequence) {
        if (sequence.status === 'Running') {
          sequenceStatus = `<span style="color:var(--primary); font-weight:600;">Step ${sequence.current_step} / 4 Running</span>`;
          seqActions = `
            <button class="btn btn-secondary" style="width:100%;" onclick="leads.pauseLeadSequence('${lead.id}')"><i data-lucide="pause"></i> Pause Sequence</button>
            <button class="btn btn-danger" style="width:100%;" onclick="leads.stopLeadSequence('${lead.id}')"><i data-lucide="square"></i> Stop Sequence</button>
          `;
        } else if (sequence.status === 'Paused') {
          sequenceStatus = `<span style="color:var(--warning); font-weight:600;">Paused (Step ${sequence.current_step})</span>`;
          seqActions = `
            <button class="btn btn-primary" style="width:100%;" onclick="leads.resumeLeadSequence('${lead.id}')"><i data-lucide="play"></i> Resume Sequence</button>
            <button class="btn btn-danger" style="width:100%;" onclick="leads.stopLeadSequence('${lead.id}')"><i data-lucide="square"></i> Stop Sequence</button>
          `;
        } else if (sequence.status === 'Stopped') {
          sequenceStatus = '<span style="color:var(--danger); font-weight:600;">Stopped</span>';
          seqActions = `<button class="btn btn-primary" style="width:100%;" onclick="leads.startLeadSequence('${lead.id}')"><i data-lucide="play"></i> Restart Sequence</button>`;
        } else if (sequence.status === 'Completed') {
          sequenceStatus = '<span style="color:var(--success); font-weight:600;">Completed ✅</span>';
          seqActions = `<button class="btn btn-primary" style="width:100%;" onclick="leads.startLeadSequence('${lead.id}')"><i data-lucide="play"></i> Restart Sequence</button>`;
        } else if (sequence.status === 'Replied') {
          sequenceStatus = '<span style="color:var(--success); font-weight:600;">Replied 💬</span>';
          seqActions = `<span style="color:var(--success); font-weight:500; font-size:12px; display:block; text-align:center; padding: 6px; border: 1px dashed var(--success); border-radius: 4px; background: rgba(16, 185, 129, 0.05);">Campaign ended: Lead Replied!</span>`;
        }
      }

      // Inject detail elements
      content.innerHTML = `
        <!-- Contact Block -->
        <div>
          <h4 style="font-size:12px; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">Contact Details</h4>
          <div style="display:flex; flex-direction:column; gap:8px; background:rgba(0,0,0,0.15); padding:14px; border-radius:8px; border:1px solid var(--border-color);">
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);font-size:13px;">Email:</span> <span style="font-weight:500;">${lead.email || 'None'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);font-size:13px;">Phone:</span> <span style="font-weight:500;">${lead.phone || 'None'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);font-size:13px;">Website:</span> <span style="font-weight:500;">${lead.website ? `<a href="${lead.website}" target="_blank" style="color:var(--cyan);text-decoration:none;">Link</a>` : 'None'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);font-size:13px;">Industry:</span> <span style="font-weight:500;">${lead.industry || 'Unknown'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);font-size:13px;">Location:</span> <span style="font-weight:500;">${lead.city || 'Unknown'}, ${lead.country || 'India'}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);font-size:13px;">Sequence Status:</span> <span style="font-weight:500;">${sequenceStatus}</span></div>
          </div>
        </div>

        <!-- Social Media Buttons -->
        <div style="display:flex; gap:10px;">
          ${lead.linkedin ? `<a href="${lead.linkedin}" target="_blank" class="btn btn-secondary" style="flex:1;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>LinkedIn</a>` : ''}
          ${lead.instagram ? `<a href="https://instagram.com/${lead.instagram.replace('@','')}" target="_blank" class="btn btn-secondary" style="flex:1;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>Instagram</a>` : ''}
        </div>

        <!-- Actions -->
        <div>
          <h4 style="font-size:12px; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">Actions</h4>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <button class="btn btn-secondary" style="width:100%;" onclick="leads.openSendManualModal('${lead.email}')"><i data-lucide="send"></i> Send Single Email</button>
            ${seqActions}
            <button class="btn btn-secondary" style="width:100%;" onclick="leads.enrichSingleLead('${lead.id}')"><i data-lucide="sparkles"></i> Find Missing Emails</button>
          </div>
        </div>

        <!-- Notes Field -->
        <div class="form-group">
          <label>Lead Notes / Logs</label>
          <textarea id="panel-notes" class="form-control" rows="4" style="font-size:13px;">${lead.notes || ''}</textarea>
          <button class="btn btn-secondary" style="align-self:flex-end; padding:6px 12px; font-size:12px; margin-top:6px;" onclick="leads.savePanelNotes()"><i data-lucide="save"></i> Save Notes</button>
        </div>

        <!-- Tracking Timeline -->
        <div>
          <h4 style="font-size:12px; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">Email Tracking & History</h4>
          <div style="display:flex; flex-direction:column; gap:10px; max-height:200px; overflow-y:auto;" id="panel-history-timeline">
            <!-- Render timeline list -->
          </div>
        </div>
      `;

      // Render timeline list
      const timelineContainer = document.getElementById('panel-history-timeline');
      if (history.length === 0) {
        timelineContainer.innerHTML = '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px;">No email history recorded.</div>';
      } else {
        history.forEach(hist => {
          const trackLog = tracking.find(t => t.email_id === hist.email_id) || { opens: 0 };
          const div = document.createElement('div');
          div.style.background = 'rgba(255, 255, 255, 0.02)';
          div.style.padding = '8px 12px';
          div.style.borderRadius = '6px';
          div.style.fontSize = '12px';
          div.style.borderLeft = '3px solid var(--primary)';
          
          div.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-weight:600;">
              <span>Step ${hist.step}: ${hist.templates?.name || 'Cold Email'}</span>
              <span style="color:var(--text-muted);">${new Date(hist.sent_at).toLocaleDateString()}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:11px; color:var(--text-secondary);">
              <span>Status: <strong style="color:var(--success);">${hist.status}</strong></span>
              <span>Opens: <strong style="color:var(--cyan);">${trackLog.opens}</strong></span>
            </div>
          `;
          timelineContainer.appendChild(div);
        });
      }

      lucide.createIcons();

    } catch (err) {
      console.error('Error loading side panel details:', err);
      content.innerHTML = `<div style="color:var(--danger); padding:20px;">Error loading details: ${err.message}</div>`;
    }
  },

  closeSidePanel() {
    document.getElementById('lead-side-panel').classList.remove('open');
    this.activeLeadId = null;
  },

  async savePanelNotes() {
    const notes = document.getElementById('panel-notes').value.trim();
    if (!this.activeLeadId) return;

    try {
      await api.updateLead(this.activeLeadId, { notes });
      app.showToast('success', 'Notes saved successfully.');
      this.loadLeads(); // refresh crm list
    } catch (err) {
      app.showToast('error', `Failed to save notes: ${err.message}`);
    }
  },

  // Single Actions
  async startLeadSequence(leadId) {
    try {
      const res = await api.startSequence(leadId);
      app.showToast('success', res.message || 'Outreach sequence started.');
      this.loadLeads();
      this.openSidePanel(leadId);
    } catch (err) {
      app.showToast('error', `Could not initiate sequence: ${err.message}`);
    }
  },

  async pauseLeadSequence(leadId) {
    try {
      await api.pauseSequence(leadId);
      app.showToast('success', 'Outreach sequence paused.');
      this.loadLeads();
      this.openSidePanel(leadId);
    } catch (err) {
      app.showToast('error', `Could not pause sequence: ${err.message}`);
    }
  },

  async resumeLeadSequence(leadId) {
    try {
      await api.resumeSequence(leadId);
      app.showToast('success', 'Outreach sequence resumed.');
      this.loadLeads();
      this.openSidePanel(leadId);
    } catch (err) {
      app.showToast('error', `Could not resume sequence: ${err.message}`);
    }
  },

  async stopLeadSequence(leadId) {
    try {
      await api.stopSequence(leadId);
      app.showToast('success', 'Outreach sequence stopped.');
      this.loadLeads();
      this.openSidePanel(leadId);
    } catch (err) {
      app.showToast('error', `Could not stop sequence: ${err.message}`);
    }
  },

  async enrichSingleLead(leadId) {
    app.showToast('info', 'Searching website contact coordinates...');
    try {
      const res = await api.enrichLead(leadId);
      if (res.lead?.email) {
        app.showToast('success', `Found genuine email: ${res.lead.email}`);
      } else {
        app.showToast('warning', 'No active email found. Try manual LinkedIn instead.');
      }
      this.loadLeads();
      this.openSidePanel(leadId);
    } catch (err) {
      app.showToast('error', `Enrichment failed: ${err.message}`);
    }
  },

  // Bulk Actions
  async bulkEnrich() {
    if (this.selectedLeadIds.size === 0) return;
    app.showToast('info', `Finding email patterns for ${this.selectedLeadIds.size} leads...`);
    
    try {
      const res = await api.bulkEnrichLeads(Array.from(this.selectedLeadIds));
      app.showToast('success', `Enriched ${res.count} leads successfully.`);
      this.loadLeads();
    } catch (err) {
      app.showToast('error', `Bulk enrichment failed: ${err.message}`);
    }
  },

  async bulkStartSequence() {
    if (this.selectedLeadIds.size === 0) return;
    try {
      const res = await api.bulkStartSequence(Array.from(this.selectedLeadIds));
      app.showToast('success', `Initiated sequences for ${res.results.succeeded.length} leads.`);
      this.loadLeads();
    } catch (err) {
      app.showToast('error', `Bulk sequence trigger failed: ${err.message}`);
    }
  },

  // Modal handlers
  openAddLeadModal() {
    document.getElementById('modal-lead-title').textContent = 'Add New Lead';
    document.getElementById('modal-lead-id').value = '';
    document.getElementById('modal-lead-form').reset();
    document.getElementById('modal-lead').classList.add('open');
  },

  async openEditLeadModal(id) {
    document.getElementById('modal-lead-title').textContent = 'Edit Lead';
    const form = document.getElementById('modal-lead-form');
    form.reset();

    try {
      const res = await api.getLead(id);
      const lead = res.lead;
      
      document.getElementById('modal-lead-id').value = lead.id;
      document.getElementById('lead-input-name').value = lead.name;
      document.getElementById('lead-input-company').value = lead.company || '';
      document.getElementById('lead-input-email').value = lead.email || '';
      document.getElementById('lead-input-website').value = lead.website || '';
      document.getElementById('lead-input-linkedin').value = lead.linkedin || '';
      document.getElementById('lead-input-instagram').value = lead.instagram || '';
      document.getElementById('lead-input-city').value = lead.city || '';
      document.getElementById('lead-input-country').value = lead.country || 'India';
      document.getElementById('lead-input-industry').value = lead.industry || '';
      document.getElementById('lead-input-notes').value = lead.notes || '';

      document.getElementById('modal-lead').classList.add('open');
    } catch (err) {
      app.showToast('error', `Could not fetch lead details: ${err.message}`);
    }
  },

  closeLeadModal() {
    document.getElementById('modal-lead').classList.remove('open');
  },

  async saveLead(e) {
    e.preventDefault();
    const id = document.getElementById('modal-lead-id').value;
    
    const leadData = {
      name: document.getElementById('lead-input-name').value.trim(),
      company: document.getElementById('lead-input-company').value.trim() || null,
      email: document.getElementById('lead-input-email').value.trim() || null,
      website: document.getElementById('lead-input-website').value.trim() || null,
      linkedin: document.getElementById('lead-input-linkedin').value.trim() || null,
      instagram: document.getElementById('lead-input-instagram').value.trim() || null,
      city: document.getElementById('lead-input-city').value.trim() || 'Unknown',
      country: document.getElementById('lead-input-country').value.trim() || 'India',
      industry: document.getElementById('lead-input-industry').value.trim() || 'Unknown',
      notes: document.getElementById('lead-input-notes').value.trim() || ''
    };

    if (leadData.website && !/^https?:\/\//i.test(leadData.website)) {
      leadData.website = `https://${leadData.website}`;
    }

    try {
      if (id) {
        await api.updateLead(id, leadData);
        app.showToast('success', 'Lead profile updated.');
      } else {
        await api.createLead(leadData);
        app.showToast('success', 'Lead created successfully.');
      }
      this.closeLeadModal();
      this.loadLeads();
    } catch (err) {
      app.showToast('error', `Failed to save lead: ${err.message}`);
    }
  },

  async deleteLead(id) {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.deleteLead(id);
      app.showToast('success', 'Lead removed from CRM.');
      this.loadLeads();
      if (this.activeLeadId === id) this.closeSidePanel();
    } catch (err) {
      app.showToast('error', `Failed to delete lead: ${err.message}`);
    }
  },

  // Manual Send Modal
  openSendManualModal(email) {
    if (!email) {
      app.showToast('error', 'Lead does not have an email address.');
      return;
    }
    document.getElementById('send-input-to').value = email;
    document.getElementById('send-input-subject').value = '';
    document.getElementById('send-input-body').value = '';
    document.getElementById('modal-send-manual').classList.add('open');
  },

  closeSendModal() {
    document.getElementById('modal-send-manual').classList.remove('open');
  },

  async sendManualEmail(e) {
    e.preventDefault();
    const to = document.getElementById('send-input-to').value;
    const subject = document.getElementById('send-input-subject').value.trim();
    const body = document.getElementById('send-input-body').value.trim();

    app.showToast('info', 'Dispatching email outreach...');
    try {
      await api.sendManualEmail(to, subject, body);
      app.showToast('success', `Outreach email dispatched successfully to ${to}.`);
      this.closeSendModal();
    } catch (err) {
      app.showToast('error', `Failed to send email: ${err.message}`);
    }
  }
};

window.leads = leads;
