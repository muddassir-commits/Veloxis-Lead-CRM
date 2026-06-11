/**
 * Veloxis Global CRM — Command Center Dashboard Screen Controller
 */

const dashboard = {
  async init() {
    console.log('🔄 Initializing Command Center Dashboard...');
    this.updateGreeting();
    await this.loadStats();
  },

  updateGreeting() {
    const welcomeEl = document.getElementById('dashboard-welcome');
    if (!welcomeEl) return;
    
    const hour = new Date().getHours();
    let greeting = 'Good Morning, Muddassir';
    if (hour >= 12 && hour < 17) {
      greeting = 'Good Afternoon, Muddassir';
    } else if (hour >= 17) {
      greeting = 'Good Evening, Muddassir';
    }
    welcomeEl.textContent = greeting;
  },

  async loadStats() {
    const feedContainer = document.getElementById('dashboard-activity-feed');
    try {
      // 1. Fetch Analytics overview data
      const analyticsData = await api.getAnalytics();
      const summary = analyticsData.summary;

      // 2. Set Stat Values
      document.getElementById('stat-total-leads').textContent = summary.totalLeads;
      document.getElementById('stat-total-sent').textContent = summary.totalSent;
      document.getElementById('stat-open-rate').textContent = `${summary.openRate}%`;
      document.getElementById('stat-replies').textContent = summary.replies;

      // 3. Set Daily Outreach Goal Progress Bars
      // Fetch settings to check limit details
      const settingsData = await api.getSettings();
      const limits = settingsData.settings?.outreach_limits || { email_daily_limit: 100, linkedin_daily_limit: 10, instagram_daily_limit: 30 };

      // Calculate sent values today (mocking/extracting from actual history or estimating)
      const emailSentCount = summary.totalSent > limits.email_daily_limit ? limits.email_daily_limit : summary.totalSent; // placeholder or actual count
      
      const emailPct = Math.min(Math.round((emailSentCount / limits.email_daily_limit) * 100), 100);
      document.getElementById('progress-email-text').textContent = `${emailSentCount} / ${limits.email_daily_limit} Sent`;
      document.getElementById('progress-email-bar').style.width = `${emailPct}%`;

      // Manual logs (since manual, we query sequence history or mock based on completed check)
      const plannerData = await api.getPlanner();
      
      const linkedinSent = 10 - plannerData.linkedinQueue.length; // Remaining leads in queue represents what was done
      const instagramSent = 30 - plannerData.instagramQueue.length;

      const linkedinPct = Math.min(Math.round((linkedinSent / limits.linkedin_daily_limit) * 100), 100);
      document.getElementById('progress-linkedin-text').textContent = `${linkedinSent} / ${limits.linkedin_daily_limit} Sent`;
      document.getElementById('progress-linkedin-bar').style.width = `${linkedinPct}%`;

      const instagramPct = Math.min(Math.round((instagramSent / limits.instagram_daily_limit) * 100), 100);
      document.getElementById('progress-instagram-text').textContent = `${instagramSent} / ${limits.instagram_daily_limit} Sent`;
      document.getElementById('progress-instagram-bar').style.width = `${instagramPct}%`;

      // 4. Render Recent Activity Feed (Open tracker events + sends)
      if (feedContainer) {
        feedContainer.innerHTML = '';
        
        const { data: leads } = await api.getLeads({ limit: 10 });
        const activityList = [];

        // Build list of activities
        if (leads) {
          leads.forEach(lead => {
            if (lead.status === 'Replied') {
              activityList.push({
                type: 'reply',
                title: 'Lead Replied 💬',
                desc: `${lead.name} (${lead.company || 'Direct'}) responded to your outreach.`,
                time: new Date(lead.updated_at)
              });
            } else if (lead.status === 'Contacted') {
              activityList.push({
                type: 'mail',
                title: 'Outreach Sent 📧',
                desc: `Step 1 email successfully sent to ${lead.name}.`,
                time: new Date(lead.updated_at)
              });
            }
          });
        }

        // Fetch tracker logs if available
        const recentTracking = analyticsData.uniqueOpened;
        if (recentTracking > 0) {
          activityList.push({
            type: 'click',
            title: 'Email Opened 👁️',
            desc: `A prospect recently viewed your diagnosis screen record.`,
            time: new Date()
          });
        }

        // Sort activities by date
        activityList.sort((a, b) => b.time - a.time);

        if (activityList.length === 0) {
          feedContainer.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:13px;">No outreach logs recorded today yet.</div>';
          return;
        }

        activityList.forEach(act => {
          const item = document.createElement('div');
          item.className = 'feed-item';
          
          let icon = 'mail';
          if (act.type === 'reply') icon = 'message-square';
          if (act.type === 'click') icon = 'eye';

          item.innerHTML = `
            <div class="feed-icon ${act.type}"><i data-lucide="${icon}"></i></div>
            <div class="feed-details">
              <span class="feed-title">${act.title}</span>
              <span class="feed-desc">${act.desc}</span>
              <span class="feed-time">${app.formatTimeAgo(act.time)}</span>
            </div>
          `;
          feedContainer.appendChild(item);
        });

        // Initialize icons
        lucide.createIcons();
      }

    } catch (err) {
      console.error('Failed to load dashboard activities:', err.message);
      if (feedContainer) {
        feedContainer.innerHTML = '<div style="color:var(--danger); font-size:13px; padding:20px;">Could not retrieve activity feed. Check database connection.</div>';
      }
    }
  }
};

window.dashboard = dashboard;
