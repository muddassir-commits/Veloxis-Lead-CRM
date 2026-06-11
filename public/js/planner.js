/**
 * Veloxis Global CRM — Weekly Planner Screen Controller
 */

const planner = {
  plannerData: null,

  async init() {
    console.log('🔄 Initializing Weekly Planner Screen...');
    await this.loadPlannerData();
  },

  async loadPlannerData() {
    const container = document.getElementById('planner-calendar-grid');
    container.innerHTML = '<div style="grid-column: 1/-1; text-align:center;"><div class="spinner" style="margin:40px auto;"></div></div>';

    try {
      const response = await api.getPlanner();
      this.plannerData = response;

      this.renderCalendar();
    } catch (err) {
      container.innerHTML = `<div style="grid-column:1/-1; color:var(--text-danger); text-align:center; padding:20px;">Failed to load planner: ${err.message}</div>`;
    }
  },

  renderCalendar() {
    const container = document.getElementById('planner-calendar-grid');
    container.innerHTML = '';

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayIndex = new Date().getDay(); // 1 = Mon, ..., 6 = Sat

    // Fetch lists from planner payload
    const scheduledEmails = this.plannerData.scheduledEmails || [];
    const linkedinQueue = this.plannerData.linkedinQueue || [];
    const instagramQueue = this.plannerData.instagramQueue || [];

    days.forEach((day, idx) => {
      const dayNum = idx + 1; // Mon = 1
      const isToday = dayNum === todayIndex;
      
      const dayCard = document.createElement('div');
      dayCard.className = `planner-day ${isToday ? 'today' : ''}`;
      
      // Calculate daily schedule counts
      // Emails scheduled for this weekday
      const dayEmails = scheduledEmails.filter(seq => {
        if (!seq.next_sent_at) return false;
        const date = new Date(seq.next_sent_at);
        return date.getDay() === dayNum;
      });

      // Distribute LinkedIn / Instagram targets across the weekdays
      // E.g., if today is Monday, show 2-3 items from the queues, etc.
      // Or show them in the queue if it's the active day
      const dailyLI = isToday ? linkedinQueue.slice(0, 3) : []; // show 2-3 at a time for demonstration
      const dailyIG = isToday ? instagramQueue.slice(0, 5) : [];

      dayCard.innerHTML = `
        <div class="planner-day-name">
          <span>${day}</span>
          ${isToday ? '<span class="badge badge-replied" style="font-size:9px;">Today</span>' : ''}
        </div>
        
        <div class="planner-tasks">
          <!-- Emails scheduled -->
          <div style="font-weight:600;font-size:11px;color:var(--text-muted);text-transform:uppercase;">Scheduled Emails (${dayEmails.length})</div>
          ${dayEmails.length === 0 ? '<div style="font-size:11px;color:var(--text-muted);font-style:italic;">None</div>' : ''}
          ${dayEmails.map(seq => `
            <div class="planner-task-item">
              <strong>${seq.leads?.name || 'Prospect'}</strong>
              <div class="planner-task-time">Step ${seq.current_step} Email</div>
            </div>
          `).join('')}
          
          <!-- LinkedIn queues -->
          <div style="font-weight:600;font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-top:10px;">LinkedIn Manual (${dailyLI.length})</div>
          ${dailyLI.length === 0 && isToday ? '<div style="font-size:11px;color:var(--text-muted);font-style:italic;">All sent!</div>' : ''}
          ${dailyLI.length === 0 && !isToday ? '<div style="font-size:11px;color:var(--text-muted);font-style:italic;">Queue idle</div>' : ''}
          ${dailyLI.map(lead => `
            <div class="planner-task-item linkedin" style="display:flex; flex-direction:column; gap:4px;">
              <strong>${lead.name}</strong>
              <div style="display:flex;gap:4px;margin-top:2px;">
                <a href="${lead.linkedin}" target="_blank" class="btn btn-secondary" style="padding:2px 6px; font-size:10px;" onclick="planner.markManualSent('${lead.id}', 'linkedin')"><i data-lucide="external-link" style="width:10px;height:10px;"></i> Open</a>
                <button class="btn btn-primary" style="padding:2px 6px; font-size:10px;" onclick="planner.copyManualMessage('${lead.id}', 'LinkedIn')"><i data-lucide="copy" style="width:10px;height:10px;"></i> Copy</button>
              </div>
            </div>
          `).join('')}
          
          <!-- Instagram queues -->
          <div style="font-weight:600;font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-top:10px;">Instagram Manual (${dailyIG.length})</div>
          ${dailyIG.length === 0 && isToday ? '<div style="font-size:11px;color:var(--text-muted);font-style:italic;">All sent!</div>' : ''}
          ${dailyIG.length === 0 && !isToday ? '<div style="font-size:11px;color:var(--text-muted);font-style:italic;">Queue idle</div>' : ''}
          ${dailyIG.map(lead => `
            <div class="planner-task-item instagram" style="display:flex; flex-direction:column; gap:4px;">
              <strong>${lead.name}</strong>
              <div style="display:flex;gap:4px;margin-top:2px;">
                <a href="https://instagram.com/${lead.instagram.replace('@','')}" target="_blank" class="btn btn-secondary" style="padding:2px 6px; font-size:10px;" onclick="planner.markManualSent('${lead.id}', 'instagram')"><i data-lucide="external-link" style="width:10px;height:10px;"></i> Open</a>
                <button class="btn btn-primary" style="padding:2px 6px; font-size:10px;" onclick="planner.copyManualMessage('${lead.id}', 'Instagram')"><i data-lucide="copy" style="width:10px;height:10px;"></i> Copy</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      container.appendChild(dayCard);
    });

    lucide.createIcons();
  },

  async copyManualMessage(leadId, type) {
    try {
      const response = await api.getLead(leadId);
      const lead = response.lead;
      
      const resTemp = await api.getTemplates(type);
      const templates = resTemp.templates;
      if (templates.length === 0) {
        app.showToast('error', `No default ${type} templates configured in Outreach Hub.`);
        return;
      }
      
      const template = templates[0]; // grab first standard template
      
      // Compile message
      const signature = 'Muddassir Ali\nFounder, Veloxis Global';
      const compiled = template.body
        .replace(/\{\{\s*name\s*\}\}/g, lead.name)
        .replace(/\{\{\s*company\s*\}\}/g, lead.company || 'your business')
        .replace(/\{\{\s*industry\s*\}\}/g, lead.industry || 'your industry')
        .replace(/\{\{\s*city\s*\}\}/g, lead.city || 'your city')
        .replace(/\{\{\s*signature\s*\}\}/g, signature);

      await navigator.clipboard.writeText(compiled);
      app.showToast('success', `Copied ${type} outreach message for ${lead.name}.`);
    } catch (err) {
      app.showToast('error', `Failed to copy: ${err.message}`);
    }
  },

  async markManualSent(leadId, channel) {
    try {
      // Move lead to Contacted status after opening link
      await api.updateLead(leadId, { 
        status: 'Contacted',
        notes: `Manual outreach sent via ${channel} on ${new Date().toLocaleDateString()}`
      });
      app.showToast('success', `Marked lead status as Contacted.`);
      // Refresh planner calendar
      setTimeout(() => this.loadPlannerData(), 1000);
    } catch (err) {
      console.error(err);
    }
  }
};

window.planner = planner;
