/**
 * Veloxis Global CRM — Sent Mail Screen Controller (Gmail-Style Archive)
 */

const sentMail = {
  emailList: [],
  activeEmailId: null,

  async init() {
    console.log('🔄 Initializing Sent Mail Screen...');
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
      this.renderEmailList(this.emailList);

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

  renderEmailList(emails) {
    const listContainer = document.getElementById('sent-email-list');
    listContainer.innerHTML = '';

    if (emails.length === 0) {
      listContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:30px; font-size:13px;">No sent emails found.</div>';
      return;
    }

    emails.forEach(email => {
      const card = document.createElement('div');
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

      // Hover effect via inline style management (to keep vanilla CSS clean)
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

      // Open tracking pill badge
      let trackingBadge = '';
      if (email.opens > 0) {
        trackingBadge = `<span class="badge" style="background:var(--success-glow); color:var(--success); border:1px solid rgba(16,185,129,0.3); text-transform:none; font-size:10px; padding:2px 6px;">👁️ Opened (${email.opens})</span>`;
      } else {
        trackingBadge = `<span class="badge" style="background:rgba(255,255,255,0.05); color:var(--text-muted); text-transform:none; font-size:10px; padding:2px 6px;">Unopened</span>`;
      }

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:13px; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:65%;">${email.lead.name}</strong>
          <span style="font-size:10px; color:var(--text-muted);">${timeText}</span>
        </div>
        <div style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${email.subject}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <span class="badge badge-researched" style="font-size:9px; padding:2px 6px;">Step ${email.step}</span>
          ${trackingBadge}
        </div>
      `;
      listContainer.appendChild(card);
    });
  },

  filterEmails() {
    const query = document.getElementById('sent-search').value.toLowerCase();
    const filtered = this.emailList.filter(email => {
      return (
        email.lead.name.toLowerCase().includes(query) ||
        (email.lead.company && email.lead.company.toLowerCase().includes(query)) ||
        (email.lead.email && email.lead.email.toLowerCase().includes(query)) ||
        email.subject.toLowerCase().includes(query) ||
        email.body.toLowerCase().includes(query)
      );
    });
    this.renderEmailList(filtered);
  },

  viewEmailDetails(emailId) {
    this.activeEmailId = emailId;
    
    // Highlight active card
    this.renderEmailList(this.emailList);

    const detailContainer = document.getElementById('sent-email-detail');
    const email = this.emailList.find(e => e.id === emailId);

    if (!email) {
      this.resetDetailView();
      return;
    }

    const sentDate = new Date(email.sent_at).toLocaleString();
    const lastOpenedDate = email.last_opened_at ? new Date(email.last_opened_at).toLocaleString() : 'N/A';

    detailContainer.innerHTML = `
      <div style="border-bottom:1px solid var(--border-color); padding-bottom:16px; display:flex; flex-direction:column; gap:10px;">
        <h2 style="font-size:20px; font-weight:700; color:var(--text-primary); line-height:1.4;">${email.subject}</h2>
        
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; font-size:13px; color:var(--text-secondary);">
          <div>
            <div>To: <strong style="color:var(--text-primary);">${email.lead.name}</strong> <span>&lt;${email.lead.email || 'No email'}&gt;</span></div>
            <div style="font-size:11px; margin-top:2px;">Company: <span style="color:var(--cyan);">${email.lead.company || 'Direct'}</span> | Industry: <span>${email.lead.industry || 'Unknown'}</span></div>
          </div>
          <div style="text-align:right;">
            <div>Sent: <span>${sentDate}</span></div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Sequence Step: <strong>Step ${email.step}</strong></div>
          </div>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i data-lucide="eye" style="color:var(--success); width:16px; height:16px;"></i>
          <span style="font-size:13px; font-weight:600;">Open Tracker Stats</span>
        </div>
        <div style="display:flex; gap:15px; font-size:12px;">
          <div>Opens: <strong id="sent-detail-opens" style="color:var(--success);">${email.opens}</strong></div>
          <div>Last Opened: <strong id="sent-detail-last-opened" style="color:var(--text-primary);">${lastOpenedDate}</strong></div>
        </div>
      </div>

      <div style="flex-grow:1; background:rgba(0,0,0,0.15); border:1px solid var(--border-color); padding:20px; border-radius:8px; font-family:'Courier New', Courier, monospace; font-size:14px; color:var(--text-primary); line-height:1.6; white-space:pre-wrap; overflow-y:auto; min-height:300px;">
        ${email.body}
      </div>
    `;

    lucide.createIcons();
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
