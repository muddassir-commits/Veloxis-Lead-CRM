/**
 * Veloxis Global CRM — Settings Screen Controller
 */

const settings = {
  init() {
    console.log('🔄 Initializing Settings Screen...');
    this.loadSettings();
    this.checkSMTPStatus();
  },

  async loadSettings() {
    try {
      const response = await api.getSettings();
      const current = response.settings || {};

      // 1. Signature
      if (current.email_signature) {
        document.getElementById('settings-signature').value = current.email_signature.signature || '';
      }

      // 2. Schedule
      if (current.sending_schedule) {
        const sched = current.sending_schedule;
        document.getElementById('schedule-start').value = sched.start_hour !== undefined ? sched.start_hour : 9;
        document.getElementById('schedule-end').value = sched.end_hour !== undefined ? sched.end_hour : 18;

        const allowedDays = sched.allowed_days || [1, 2, 3, 4, 5, 6];
        const dayChecks = document.querySelectorAll('input[name="schedule-days"]');
        dayChecks.forEach(check => {
          check.checked = allowedDays.includes(parseInt(check.value));
        });
      }

      // 3. Limits
      if (current.outreach_limits) {
        const limits = current.outreach_limits;
        document.getElementById('limit-email').value = limits.email_daily_limit !== undefined ? limits.email_daily_limit : 100;
        document.getElementById('limit-linkedin').value = limits.linkedin_daily_limit !== undefined ? limits.linkedin_daily_limit : 10;
        document.getElementById('limit-instagram').value = limits.instagram_daily_limit !== undefined ? limits.instagram_daily_limit : 30;
      }

    } catch (err) {
      console.error('Failed to load settings:', err.message);
    }
  },

  async checkSMTPStatus() {
    const statusEl = document.getElementById('settings-smtp-status');
    if (!statusEl) return;

    try {
      const res = await api.testSMTP();
      if (res.success) {
        statusEl.innerHTML = '<span style="color:var(--success);"><i data-lucide="check-circle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"></i> Active & Connected</span>';
      } else {
        statusEl.innerHTML = '<span style="color:var(--danger);"><i data-lucide="alert-triangle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"></i> Credentials Invalid</span>';
      }
    } catch (err) {
      statusEl.innerHTML = '<span style="color:var(--danger);"><i data-lucide="x-circle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"></i> Offline / Error</span>';
    }
    lucide.createIcons();
  },

  async testSMTP() {
    const statusEl = document.getElementById('settings-smtp-status');
    statusEl.innerHTML = '<span style="color:var(--text-muted);"><i class="spinner" style="display:inline-block;vertical-align:middle;width:14px;height:14px;"></i> Testing...</span>';
    app.showToast('info', 'Testing connection to Hostinger SMTP servers...');

    try {
      const res = await api.testSMTP();
      if (res.success) {
        app.showToast('success', 'SMTP connection verified successfully!');
        statusEl.innerHTML = '<span style="color:var(--success);"><i data-lucide="check-circle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"></i> Connected</span>';
      } else {
        app.showToast('error', `SMTP Connection failed: ${res.error}`);
        statusEl.innerHTML = '<span style="color:var(--danger);"><i data-lucide="alert-triangle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"></i> Failed</span>';
      }
    } catch (err) {
      app.showToast('error', `Connection error: ${err.message}`);
      statusEl.innerHTML = '<span style="color:var(--danger);"><i data-lucide="x-circle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"></i> Offline</span>';
    }
    lucide.createIcons();
  },

  async saveSignature(e) {
    e.preventDefault();
    const signature = document.getElementById('settings-signature').value;

    try {
      await api.saveSetting('email_signature', { signature });
      app.showToast('success', 'Email signature updated successfully.');
    } catch (err) {
      app.showToast('error', `Failed to save signature: ${err.message}`);
    }
  },

  async saveSchedule(e) {
    e.preventDefault();
    
    const start_hour = parseInt(document.getElementById('schedule-start').value);
    const end_hour = parseInt(document.getElementById('schedule-end').value);
    
    const checkedDays = document.querySelectorAll('input[name="schedule-days"]:checked');
    const allowed_days = Array.from(checkedDays).map(c => parseInt(c.value));

    const value = {
      start_hour,
      end_hour,
      allowed_days,
      batch_size: 10 // default batch size
    };

    try {
      await api.saveSetting('sending_schedule', value);
      app.showToast('success', 'Sending schedule settings updated.');
    } catch (err) {
      app.showToast('error', `Failed to save schedule: ${err.message}`);
    }
  },

  async saveLimits(e) {
    e.preventDefault();

    const email_daily_limit = parseInt(document.getElementById('limit-email').value);
    const linkedin_daily_limit = parseInt(document.getElementById('limit-linkedin').value);
    const instagram_daily_limit = parseInt(document.getElementById('limit-instagram').value);

    const value = {
      email_daily_limit,
      linkedin_daily_limit,
      instagram_daily_limit
    };

    try {
      await api.saveSetting('outreach_limits', value);
      app.showToast('success', 'Daily outreaches limits updated.');
      
      // Update Command Center numbers
      dashboard.loadStats();
    } catch (err) {
      app.showToast('error', `Failed to save limits: ${err.message}`);
    }
  },

  async clearCRMData() {
    if (!confirm('🚨 WARNING: Are you sure you want to delete all leads, active sequences, history, and tracking data from your database? This action is permanent and cannot be undone.')) {
      return;
    }

    if (!confirm('Please confirm once more. Do you really want to clear all CRM data?')) {
      return;
    }

    app.showToast('info', 'Cleaning CRM database...');
    try {
      const res = await api.clearAllLeads();
      app.showToast('success', `CRM reset successfully. Deleted ${res.count} leads.`);
      
      // Update stats and refresh screens
      if (window.dashboard && typeof window.dashboard.loadStats === 'function') {
        dashboard.loadStats();
      }
      if (window.leads && typeof window.leads.loadLeads === 'function') {
        leads.loadLeads();
      }
    } catch (err) {
      app.showToast('error', `Database reset failed: ${err.message}`);
    }
  }
};

window.settings = settings;
