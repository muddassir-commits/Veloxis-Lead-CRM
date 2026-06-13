/**
 * Veloxis Global CRM — Sent Mail Screen Controller (Gmail-Style Archive)
 */

const sentMail = {
  emailList: [],
  activeEmailId: null,
  statusFilter: 'all', // 'all', 'opened', 'unopened'

  async init() {
    console.log('🔄 Initializing Sent Mail Screen...');
    this.statusFilter = 'all';
    this.updateFilterUI();
    await this.loadEmails();
  },

  async loadEmails(isPoll = false) {
    const listContainer = document.getElementById('sent-email-list');
    if (!isPoll) {
      listContainer.innerHTML = '<div class="spinner" style="margin:40px auto;"></div>';
      this.resetDetailView();
    }

    try {
      const response = await api.getSentEmails();
      this.emailList = response.sentEmails || [];
      this.filterEmails(); // Renders list based on filter and search inputs

      // Update active detail view stats in background if currently open
      if (isPoll && this.activeEmailId) {
        const email = this.emailList.find(e => e.id === this.activeEmailId);
        if (email) {
          const opensEl = document.getElementById('sent-detail-opens');
          if (opensEl) opensEl.textContent = email.opens;
          const lastOpenedEl = document.getElementById('sent-detail-last-opened');
          if (lastOpenedEl) {
            lastOpenedEl.textContent = email.last_opened_at ? new Date(email.last_opened_at).toLocaleString() : 'N/A';
          }
        }
      }
    } catch (err) {
      if (!isPoll) {
        listContainer.innerHTML = `<div style="text-align:center; color:var(--text-danger); padding:20px; font-size:13px;">Error loading sent emails: ${err.message}</div>`;
      }
    }
  },

  setStatusFilter(filter) {
    this.statusFilter = filter;
    this.updateFilterUI();
    this.filterEmails();
  },

  updateFilterUI() {
    const filters = ['all', 'sent', 'opened', 'failed'];
    filters.forEach(f => {
      const btn = document.getElementById(`sent-filter-${f}`);
      if (btn) {
        if (f === this.statusFilter) {
          btn.classList.add('active');
          btn.style.background = '';
        } else {
          btn.classList.remove('active');
          btn.style.background = 'none';
        }
      }
    });
  },

  filterEmails() {
    const query = document.getElementById('sent-search').value.toLowerCase();
    const filtered = this.emailList.filter(email => {
      // 1. Search Query filter
      const matchesQuery = 
        email.lead.name.toLowerCase().includes(query) ||
        (email.lead.company && email.lead.company.toLowerCase().includes(query)) ||
        (email.lead.email && email.lead.email.toLowerCase().includes(query)) ||
        email.subject.toLowerCase().includes(query) ||
        email.body.toLowerCase().includes(query);

      // 2. Status Filter
      if (this.statusFilter === 'sent') {
        return matchesQuery && email.status === 'Sent';
      } else if (this.statusFilter === 'opened') {
        return matchesQuery && email.status === 'Sent' && email.opens > 0;
      } else if (this.statusFilter === 'failed') {
        return matchesQuery && email.status.startsWith('Failed');
      }
      return matchesQuery;
    });

    this.renderEmailList(filtered);
  },

  renderEmailList(emails) {
    const listContainer = document.getElementById('sent-email-list');
    listContainer.innerHTML = '';

    if (emails.length === 0) {
      listContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:30px; font-size:13px;">No outreach records match the filters.</div>';
      return;
    }

    emails.forEach(email => {
      const card = document.createElement('div');
      const isFailed = email.status.startsWith('Failed');
      card.className = `sent-email-card card ${this.activeEmailId === email.id ? 'active-email' : ''}`;
      card.style.padding = '12px 14px';
      card.style.borderRadius = '8px';
      card.style.cursor = 'pointer';
      card.style.border = '1px solid var(--border-color)';
      card.style.background = this.activeEmailId === email.id ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255, 255, 255, 0.01)';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '6px';
      card.style.transition = 'var(--transition-fast)';

      if (isFailed) {
        card.style.borderLeft = '3px solid var(--danger)';
      }

      // Hover effects
      card.onmouseover = () => {
        if (this.activeEmailId !== email.id) {
          card.style.background = 'rgba(255, 255, 255, 0.04)';
          card.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        }
      };
      card.onmouseout = () => {
        if (this.activeEmailId !== email.id) {
          card.style.background = 'rgba(255, 255, 255, 0.01)';
          card.style.borderColor = 'var(--border-color)';
        }
      };

      card.onclick = () => this.viewEmailDetails(email.id);

      const timeText = new Date(email.sent_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      let trackingBadge = '';
      if (isFailed) {
        trackingBadge = `<span class="badge" style="background:var(--danger-glow); color:var(--danger); border:1px solid rgba(239,68,68,0.3); text-transform:none; font-size:10px; padding:2px 6px;">❌ Failed</span>`;
      } else if (email.opens > 0) {
        trackingBadge = `<span class="badge" style="background:var(--success-glow); color:var(--success); border:1px solid rgba(16,185,129,0.3); text-transform:none; font-size:10px; padding:2px 6px;">👁️ Opened (${email.opens})</span>`;
      } else {
        trackingBadge = `<span class="badge" style="background:rgba(255,255,255,0.05); color:var(--text-muted); text-transform:none; font-size:10px; padding:2px 6px;">Sent</span>`;
      }

      const stepText = email.step === 0 ? 'Manual' : `Step ${email.step}`;

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:13px; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:65%;">${email.lead.name}</strong>
          <span style="font-size:10px; color:var(--text-muted);">${timeText}</span>
        </div>
        <div style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${email.subject}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <span class="badge badge-researched" style="font-size:9px; padding:2px 6px;">${stepText}</span>
          ${trackingBadge}
        </div>
      `;
      listContainer.appendChild(card);
    });
  },

  async viewEmailDetails(emailId) {
    this.activeEmailId = emailId;
    this.filterEmails(); // Highlight active card

    const detailContainer = document.getElementById('sent-email-detail');
    const email = this.emailList.find(e => e.id === emailId);

    if (!email) {
      this.resetDetailView();
      return;
    }

    const sentDate = new Date(email.sent_at).toLocaleString();
    const lastOpenedDate = email.last_opened_at ? new Date(email.last_opened_at).toLocaleString() : 'N/A';
    const isFailed = email.status.startsWith('Failed');

    // Parse User Agents list
    const parsedDevices = (email.user_agents || []).map(ua => {
      if (!ua) return 'Unknown Device';
      if (ua.includes('iPhone') || ua.includes('iPad')) return 'iPhone / iOS Mobile';
      if (ua.includes('Android')) return 'Android Mobile';
      if (ua.includes('Macintosh')) return 'Mac OS (Safari/Chrome)';
      if (ua.includes('Windows')) return 'Windows PC (Chrome/Edge)';
      if (ua.includes('Linux')) return 'Linux PC';
      if (ua.includes('GoogleImageProxy')) return 'Gmail Cloud Proxy ☁️';
      return 'Web Browser';
    });

    const uniqueDevices = [...new Set(parsedDevices)];
    const uniqueIPs = [...new Set(email.ip_addresses || [])];

    let auditHtml = '';
    if (email.opens > 0) {
      auditHtml = `
        <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px; font-size:11px; color:var(--text-secondary); border-top:1px dashed rgba(255,255,255,0.05); padding-top:8px;">
          <div>📡 IP Addresses: ${uniqueIPs.map(ip => `<span style="font-family:monospace; padding:1px 5px; border-radius:4px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); margin-right:4px;">${ip}</span>`).join('') || 'N/A'}</div>
          <div style="margin-top:3px;">📱 Detected Client: ${uniqueDevices.map(d => `<span style="padding:1px 5px; border-radius:4px; background:var(--primary-glow); color:var(--primary); font-size:10px; margin-right:4px;">${d}</span>`).join('') || 'N/A'}</div>
        </div>
      `;
    }

    let errorBanner = '';
    if (isFailed) {
      const errorMsg = email.status.replace('Failed: ', '');
      errorBanner = `
        <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:8px; padding:12px 16px; display:flex; align-items:center; gap:12px; color:var(--danger); font-size:13px; line-height:1.5;">
          <i data-lucide="alert-octagon" style="width:18px; height:18px; flex-shrink:0;"></i>
          <div>
            <strong>Email Dispatch Failed:</strong> ${errorMsg || 'SMTP/Connection Error'}
          </div>
        </div>
      `;
    }

    let trackerStatsHtml = '';
    if (!isFailed) {
      trackerStatsHtml = `
        <!-- Tracker details card -->
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:12px; border-radius:8px; display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="eye" style="color:var(--success); width:16px; height:16px;"></i>
              <span style="font-size:13px; font-weight:600;">Open Tracker Stats</span>
            </div>
            <div style="display:flex; gap:15px; font-size:12px;">
              <div>Opens: <strong id="sent-detail-opens" style="color:var(--success);">${email.opens}</strong></div>
              <div>Last Opened: <strong id="sent-detail-last-opened" style="color:var(--text-primary);">${lastOpenedDate}</strong></div>
            </div>
          </div>
          ${auditHtml}
        </div>
      `;
    }

    const stepLabel = email.step === 0 ? 'Manual Direct' : `Step ${email.step}`;

    detailContainer.innerHTML = `
      <!-- Detail Header Controls -->
      <div style="border-bottom:1px solid var(--border-color); padding-bottom:16px; display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="font-size:20px; font-weight:700; color:var(--text-primary); line-height:1.4; max-width:65%; margin:0;">${email.subject}</h2>
          
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-icon" style="width:32px; height:32px;" onclick="sentMail.viewLead('${email.lead.id}')" title="View Lead Profile"><i data-lucide="user" style="width:14px; height:14px;"></i></button>
            <button class="btn btn-secondary btn-icon" style="width:32px; height:32px; color:var(--cyan);" onclick="sentMail.resendEmail('${email.id}')" title="Resend Email Now"><i data-lucide="rotate-ccw" style="width:14px; height:14px;"></i></button>
            <button class="btn btn-danger btn-icon" style="width:32px; height:32px;" onclick="sentMail.deleteEmail('${email.id}')" title="Delete Log"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>
          </div>
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; font-size:13px; color:var(--text-secondary);">
          <div>
            <div>To: <strong style="color:var(--text-primary);">${email.lead.name}</strong> <span>&lt;${email.lead.email || 'No email'}&gt;</span></div>
            <div style="font-size:11px; margin-top:2px;">Company: <span style="color:var(--cyan);">${email.lead.company || 'Direct'}</span> | Industry: <span>${email.lead.industry || 'Unknown'}</span></div>
          </div>
          <div style="text-align:right;">
            <div>Sent: <span>${sentDate}</span></div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Sequence Step: <strong>${stepLabel}</strong></div>
          </div>
        </div>
      </div>

      ${errorBanner}

      <!-- Action Panel -->
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn-secondary" style="padding:6px 12px; font-size:12px; gap:6px;" onclick="sentMail.copyEmailBody()"><i data-lucide="copy" style="width:13px; height:13px;"></i> Copy Message</button>
        <button class="btn btn-secondary" style="padding:6px 12px; font-size:12px; gap:6px; color:var(--warning);" onclick="sentMail.pauseSequence('${email.lead.id}')"><i data-lucide="pause" style="width:13px; height:13px;"></i> Pause Sequence</button>
        <button class="btn btn-secondary" style="padding:6px 12px; font-size:12px; gap:6px; color:var(--danger);" onclick="sentMail.stopSequence('${email.lead.id}')"><i data-lucide="square" style="width:13px; height:13px;"></i> Stop Campaign</button>
      </div>

      ${trackerStatsHtml}

      <!-- Message body preview -->
      <div id="sent-body-preview" style="flex-grow:1; background:rgba(0,0,0,0.15); border:1px solid var(--border-color); padding:20px; border-radius:8px; font-family:'Courier New', Courier, monospace; font-size:14px; color:var(--text-primary); line-height:1.6; white-space:pre-wrap; overflow-y:auto; min-height:300px;">${email.body}</div>
    `;

    lucide.createIcons();
  },

  async deleteEmail(id) {
    if (!confirm('Are you sure you want to delete this sent email log? This does NOT recall the email, it only removes the record from CRM outreach history.')) return;
    
    app.showToast('info', 'Deleting log...');
    try {
      await api.deleteSentEmail(id);
      app.showToast('success', 'Sent email log removed.');
      this.activeEmailId = null;
      await this.loadEmails();
    } catch (err) {
      app.showToast('error', `Failed to delete: ${err.message}`);
    }
  },

  async resendEmail(id) {
    if (!confirm('Are you sure you want to resend this exact email copy to the prospect right now?')) return;

    app.showToast('info', 'Resending outreach email...');
    try {
      const res = await api.resendSentEmail(id);
      app.showToast('success', 'Email resent successfully!');
      await this.loadEmails();
      if (res.newEmailId) {
        this.viewEmailDetails(res.newEmailId);
      }
    } catch (err) {
      app.showToast('error', `Failed to resend: ${err.message}`);
    }
  },

  copyEmailBody() {
    const previewEl = document.getElementById('sent-body-preview');
    if (!previewEl) return;
    
    const bodyText = previewEl.textContent;
    navigator.clipboard.writeText(bodyText)
      .then(() => {
        app.showToast('success', 'Email body copied to clipboard.');
      })
      .catch(err => {
        app.showToast('error', 'Failed to copy text.');
      });
  },

  viewLead(leadId) {
    app.showScreen('leads');
    leads.openSidePanel(leadId);
  },

  async pauseSequence(leadId) {
    try {
      await api.pauseSequence(leadId);
      app.showToast('success', 'Campaign paused successfully.');
      await this.loadEmails();
    } catch (err) {
      app.showToast('error', `Failed to pause: ${err.message}`);
    }
  },

  async stopSequence(leadId) {
    try {
      await api.stopSequence(leadId);
      app.showToast('success', 'Campaign stopped.');
      await this.loadEmails();
    } catch (err) {
      app.showToast('error', `Failed to stop: ${err.message}`);
    }
  },

  resetDetailView() {
    this.activeEmailId = null;
    const detailContainer = document.getElementById('sent-email-detail');
    detailContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 100px 20px;">
        <i data-lucide="mail-open" style="width: 48px; height: 48px; margin-bottom: 15px; stroke-width: 1.5; color: var(--text-muted);"></i>
        <p>Select an email from the list to view the full sent message body.</p>
      </div>
    `;
    lucide.createIcons();
  }
};

window.sentMail = sentMail;
