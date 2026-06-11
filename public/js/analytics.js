/**
 * Veloxis Global CRM — Analytics Dashboard Screen Controller
 */

const analytics = {
  async init() {
    console.log('🔄 Initializing Analytics Dashboard Screen...');
    await this.loadAnalyticsData();
  },

  async loadAnalyticsData() {
    try {
      const response = await api.getAnalytics();
      
      this.renderTimeline(response.volumeTimeline || []);
      this.renderFunnel(response.funnel || {});
      this.renderTemplatesPerformance(response.templatePerformance || {});
      this.renderTopIndustries(response.leadsByIndustry || {});
    } catch (err) {
      console.error('Failed to load analytics graphs:', err.message);
    }
  },

  renderTimeline(timeline) {
    // Convert timeline { date: 'YYYY-MM-DD', count: X } to charts array format [{ label, value }]
    const dataPoints = timeline.map(t => {
      const date = new Date(t.date);
      const label = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      return { label, value: t.count };
    });

    charts.renderLineChart('analytics-timeline-container', dataPoints);
  },

  renderFunnel(funnel) {
    const list = document.getElementById('analytics-funnel-list');
    list.innerHTML = '';

    const stages = [
      { key: 'new', name: 'New Leads' },
      { key: 'researched', name: 'Researched' },
      { key: 'contacted', name: 'Contacted' },
      { key: 'followedUp', name: 'Followed Up' },
      { key: 'replied', name: 'Replied' },
      { key: 'meeting', name: 'Meeting Booked' },
      { key: 'won', name: 'Won Clients' }
    ];

    // Find the max count to scale percentage widths
    const counts = stages.map(s => funnel[s.key] || 0);
    const maxCount = Math.max(...counts, 1);

    stages.forEach(stage => {
      const count = funnel[stage.key] || 0;
      const pct = Math.round((count / maxCount) * 100);

      const div = document.createElement('div');
      div.className = 'funnel-stage';
      
      div.innerHTML = `
        <span class="funnel-stage-name">${stage.name}</span>
        <div class="funnel-bar-container">
          <div class="funnel-bar-fill" style="width: ${pct}%">
            <span class="funnel-stage-val">${count}</span>
          </div>
          <span class="funnel-stage-pct">${pct}%</span>
        </div>
      `;
      list.appendChild(div);
    });
  },

  renderTemplatesPerformance(performance) {
    const tbody = document.getElementById('analytics-templates-body');
    tbody.innerHTML = '';

    const entries = Object.entries(performance);
    if (entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">No template statistics logged yet.</td></tr>';
      return;
    }

    entries.forEach(([name, data]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600;">${name}</td>
        <td><span class="badge badge-contacted" style="font-size:10px;">${data.type}</span></td>
        <td><strong style="color:var(--cyan);">${data.sent} Sends</strong></td>
      `;
      tbody.appendChild(tr);
    });
  },

  renderTopIndustries(industries) {
    const list = document.getElementById('analytics-industries-list');
    list.innerHTML = '';

    const entries = Object.entries(industries).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (entries.length === 0) {
      list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">No industry data found.</div>';
      return;
    }

    const maxCount = Math.max(...entries.map(e => e[1]), 1);

    entries.forEach(([name, count]) => {
      const pct = Math.round((count / maxCount) * 100);

      const div = document.createElement('div');
      div.className = 'funnel-stage';
      
      div.innerHTML = `
        <span class="funnel-stage-name" style="width: 150px;">${name}</span>
        <div class="funnel-bar-container">
          <div class="funnel-bar-fill" style="width: ${pct}%; background: var(--grad-cyan);">
            <span class="funnel-stage-val">${count}</span>
          </div>
        </div>
      `;
      list.appendChild(div);
    });
  }
};

window.analytics = analytics;
