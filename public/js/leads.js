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
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="color:var(--text-secondary);font-size:13px;">Phone:</span>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-weight:500;">${lead.phone || 'None'}</span>
                ${lead.phone ? `
                  <button class="btn btn-secondary btn-icon" style="width:24px;height:24px;background:none;border:none;padding:0;" onclick="leads.checkWhatsApp('${lead.id}', '${lead.phone}')" title="Check WhatsApp">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#25D366;vertical-align:middle;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  </button>
                ` : ''}
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;"><span style="color:var(--text-secondary);font-size:13px;">WhatsApp Status:</span> <span>${this.getWhatsAppStatusBadge(lead.notes)}</span></div>
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
            <button class="btn btn-secondary" style="width:100%;" onclick="leads.openOutreachModal('${lead.id}')"><i data-lucide="send"></i> Send Outbound Message</button>
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
      document.getElementById('lead-input-phone').value = lead.phone || '';
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
      phone: document.getElementById('lead-input-phone').value.trim() || null,
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

  // Multi-Channel Manual Outreach Modal Controllers
  activeOutreachChannel: 'Email',
  outreachLead: null,
  activeTemplates: [],

  async openOutreachModal(leadId) {
    this.activeLeadId = leadId;
    const modal = document.getElementById('modal-manual-outreach');
    
    // Clear fields
    document.getElementById('outreach-lead-name').textContent = '...';
    document.getElementById('outreach-lead-company').textContent = '...';
    document.getElementById('outreach-input-to').value = '';
    document.getElementById('outreach-input-subject').value = '';
    document.getElementById('outreach-input-body').value = '';
    document.getElementById('outreach-channel-warning').style.display = 'none';

    modal.classList.add('open');

    try {
      const res = await api.getLead(leadId);
      this.outreachLead = res.lead;
      
      document.getElementById('outreach-lead-name').textContent = this.outreachLead.name;
      document.getElementById('outreach-lead-company').textContent = this.outreachLead.company || 'Direct';
      
      // Default to Email channel
      this.setOutreachChannel('Email');
    } catch (err) {
      app.showToast('error', `Failed to load outreach details: ${err.message}`);
      this.closeOutreachModal();
    }
  },

  closeOutreachModal() {
    document.getElementById('modal-manual-outreach').classList.remove('open');
    this.outreachLead = null;
    this.activeTemplates = [];
  },

  setOutreachChannel(channel) {
    this.activeOutreachChannel = channel;
    
    // Toggle active tab buttons classes
    const channels = ['Email', 'LinkedIn', 'Instagram'];
    channels.forEach(ch => {
      const btn = document.getElementById(`outreach-btn-${ch.toLowerCase()}`);
      if (ch === channel) {
        btn.className = 'btn btn-primary';
        btn.style.background = '';
      } else {
        btn.className = 'btn btn-secondary';
        btn.style.background = 'none';
      }
    });

    const emailGroup = document.getElementById('outreach-email-group');
    const subjectGroup = document.getElementById('outreach-subject-group');
    const templateGroup = document.getElementById('outreach-template-group');
    const socialActions = document.getElementById('outreach-social-actions');
    const submitBtn = document.getElementById('outreach-btn-submit');
    const warning = document.getElementById('outreach-channel-warning');

    warning.style.display = 'none';

    if (channel === 'Email') {
      emailGroup.style.display = 'block';
      subjectGroup.style.display = 'block';
      templateGroup.style.display = 'none';
      socialActions.style.display = 'none';
      submitBtn.style.display = 'block';

      if (this.outreachLead) {
        document.getElementById('outreach-input-to').value = this.outreachLead.email || '';
        if (!this.outreachLead.email) {
          warning.textContent = '⚠️ This lead does not have an email address. Choose LinkedIn or Instagram instead!';
          warning.style.display = 'block';
        }
      }
      document.getElementById('outreach-input-subject').value = '';
      document.getElementById('outreach-input-body').value = '';
    } else {
      // Social channels
      emailGroup.style.display = 'none';
      subjectGroup.style.display = 'none';
      templateGroup.style.display = 'block';
      socialActions.style.display = 'flex';
      submitBtn.style.display = 'none';

      if (this.outreachLead) {
        if (channel === 'LinkedIn' && !this.outreachLead.linkedin) {
          warning.textContent = '⚠️ No LinkedIn link found in CRM details for this lead. Add it in the Edit Modal.';
          warning.style.display = 'block';
        } else if (channel === 'Instagram' && !this.outreachLead.instagram) {
          warning.textContent = '⚠️ No Instagram handle found in CRM details for this lead. Add it in the Edit Modal.';
          warning.style.display = 'block';
        }
      }

      this.loadChannelTemplates(channel);
    }
  },

  async loadChannelTemplates(channel) {
    const select = document.getElementById('outreach-select-template');
    select.innerHTML = '<option value="">Loading templates...</option>';
    document.getElementById('outreach-input-body').value = '';

    try {
      const res = await api.getTemplates(channel);
      this.activeTemplates = res.templates || [];
      
      select.innerHTML = '';
      if (this.activeTemplates.length === 0) {
        select.innerHTML = '<option value="">No templates configured for this channel</option>';
        return;
      }

      this.activeTemplates.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.name} (${t.principle || 'Standard'})`;
        select.appendChild(opt);
      });

      // Render the first template
      this.handleOutreachTemplateChange();
    } catch (err) {
      select.innerHTML = '<option value="">Error loading templates</option>';
    }
  },

  async handleOutreachTemplateChange() {
    const templateId = document.getElementById('outreach-select-template').value;
    if (!templateId || !this.outreachLead) {
      document.getElementById('outreach-input-body').value = '';
      return;
    }

    try {
      const res = await api.renderTemplate(this.outreachLead.id, templateId);
      document.getElementById('outreach-input-body').value = res.body;
    } catch (err) {
      app.showToast('error', `Failed to compile template: ${err.message}`);
    }
  },

  copyOutreachMessage() {
    const text = document.getElementById('outreach-input-body').value.trim();
    if (!text) return;

    navigator.clipboard.writeText(text)
      .then(() => app.showToast('success', 'Outreach message copied to clipboard!'))
      .catch(() => app.showToast('error', 'Clipboard access denied.'));
  },

  async launchSocialProfile() {
    if (!this.outreachLead) return;
    
    let url = '';
    if (this.activeOutreachChannel === 'LinkedIn') {
      url = this.outreachLead.linkedin;
    } else if (this.activeOutreachChannel === 'Instagram') {
      const handle = this.outreachLead.instagram.replace('@', '');
      url = `https://instagram.com/${handle}`;
    }

    if (!url) {
      app.showToast('error', `No profile URL configured for ${this.activeOutreachChannel}.`);
      return;
    }

    window.open(url, '_blank');

    // Prompt to log history
    const shouldLog = document.getElementById('outreach-log-history').checked;
    if (shouldLog) {
      setTimeout(async () => {
        if (confirm(`Did you successfully paste and send the message on ${this.activeOutreachChannel}?\n\nClick "OK" to log outreach in CRM.`)) {
          try {
            // Find active template name
            const select = document.getElementById('outreach-select-template');
            const templateText = select.options[select.selectedIndex]?.text || `${this.activeOutreachChannel} Outreach`;
            
            // Insert sequence history via API mock-up/database updates
            const mockEmailId = 'manual-' + Math.random().toString(36).substr(2, 9);
            
            // Log manual history in sequences table or update notes
            await api.updateLead(this.outreachLead.id, {
              status: 'Contacted',
              notes: `${this.outreachLead.notes || ''}\n[Outreach] Sent manual message via ${this.activeOutreachChannel} (${templateText}) on ${new Date().toLocaleDateString()}`.trim()
            });

            app.showToast('success', 'Logged manual outreach event successfully.');
            this.loadLeads();
            this.closeOutreachModal();
          } catch (err) {
            app.showToast('error', `Failed to log outreach event: ${err.message}`);
          }
        }
      }, 1500);
    }
  },

  async submitManualOutreach(e) {
    e.preventDefault();
    if (this.activeOutreachChannel !== 'Email') return;

    const to = document.getElementById('outreach-input-to').value.trim();
    const subject = document.getElementById('outreach-input-subject').value.trim();
    const body = document.getElementById('outreach-input-body').value.trim();

    if (!to || !subject || !body) {
      app.showToast('error', 'All email fields are required.');
      return;
    }

    app.showToast('info', 'Dispatching email outreach...');
    try {
      const res = await api.sendManualEmail(to, subject, body);
      app.showToast('success', `Outreach email sent successfully to ${to}.`);

      // Log history in database if checked
      const shouldLog = document.getElementById('outreach-log-history').checked;
      if (shouldLog && this.outreachLead) {
        await api.updateLead(this.outreachLead.id, {
          status: 'Contacted',
          notes: `${this.outreachLead.notes || ''}\n[Outreach] Sent manual Email ("${subject}") on ${new Date().toLocaleDateString()}`.trim()
        });
      }

      this.loadLeads();
      this.closeOutreachModal();
    } catch (err) {
      app.showToast('error', `Email dispatch failed: ${err.message}`);
    }
  },

  async checkWhatsApp(leadId, phone) {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}`;
    window.open(waUrl, '_blank');
    
    // Prompt the user to log the status manually
    setTimeout(async () => {
      const isAvailable = confirm(`Did the WhatsApp chat open successfully for ${phone}?\n\nClick "OK" to mark as ACTIVE.\nClick "Cancel" to mark as INACTIVE.`);
      const statusText = isAvailable ? '[WhatsApp: Active]' : '[WhatsApp: Inactive]';
      
      try {
        const res = await api.getLead(leadId);
        let currentNotes = res.lead.notes || '';
        
        // Remove existing whatsapp tags if any
        currentNotes = currentNotes.replace(/\[WhatsApp:\s*(Active|Inactive|Unknown)\]/g, '').trim();
        
        // Append new status tag
        const newNotes = `${currentNotes}\n${statusText}`.trim();
        
        await api.updateLead(leadId, { notes: newNotes });
        app.showToast('success', `Updated WhatsApp status to: ${isAvailable ? 'Active' : 'Inactive'}`);
        
        // Reload details pane
        this.openSidePanel(leadId);
        this.loadLeads();
      } catch (err) {
        app.showToast('error', `Failed to update WhatsApp status: ${err.message}`);
      }
    }, 1500);
  },

  getWhatsAppStatusBadge(notes) {
    const text = notes || '';
    if (text.includes('[WhatsApp: Active]')) {
      return '<span class="badge" style="font-size:10px; background:#25D366; color:white; font-weight:700; border-radius:12px;">Active ✅</span>';
    } else if (text.includes('[WhatsApp: Inactive]')) {
      return '<span class="badge" style="font-size:10px; background:var(--danger); color:white; font-weight:700; border-radius:12px;">Inactive ❌</span>';
    }
    return '<span class="badge" style="font-size:10px; background:rgba(255,255,255,0.05); color:var(--text-secondary); font-weight:700; border-radius:12px;">Unknown ❓</span>';
  }
};

window.leads = leads;
