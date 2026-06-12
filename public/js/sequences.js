/**
 * Veloxis Global CRM — Sequence Manager Screen Controller
 */

const sequences = {
  sequencesList: [],

  async init() {
    console.log('🔄 Initializing Sequence Manager Screen...');
    await this.loadSequences();
  },

  async loadSequences() {
    const tbody = document.getElementById('sequence-table-body');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><div class="spinner" style="margin:20px auto;"></div></td></tr>';

    try {
      // We query direct list of sequences
      const response = await api.getSequences();
      this.sequencesList = response.sequences || [];

      tbody.innerHTML = '';

      if (this.sequencesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:30px;">No campaigns running in the cloud right now.</td></tr>';
        return;
      }

      this.sequencesList.forEach(seq => {
        const lead = seq.leads;
        if (!lead || !lead.id) return;

        const tr = document.createElement('tr');

        let statusColor = 'var(--text-muted)';
        if (seq.status === 'Running') statusColor = 'var(--success)';
        if (seq.status === 'Paused') statusColor = 'var(--warning)';
        if (seq.status === 'Stopped') statusColor = 'var(--danger)';
        if (seq.status === 'Completed' || seq.status === 'Replied') statusColor = 'var(--success)';

        const lastSentText = seq.last_sent_at ? new Date(seq.last_sent_at).toLocaleString() : 'Never';
        const nextSentText = seq.next_sent_at ? new Date(seq.next_sent_at).toLocaleString() : 'Not Scheduled';

        let controlBtns = '';
        if (seq.status === 'Running') {
          controlBtns = `<button class="btn btn-secondary btn-icon" onclick="sequences.pauseCampaign('${lead.id}')" title="Pause"><i data-lucide="pause" style="width:14px;height:14px;"></i></button>`;
        } else if (seq.status === 'Paused') {
          controlBtns = `<button class="btn btn-primary btn-icon" onclick="sequences.resumeCampaign('${lead.id}')" title="Resume"><i data-lucide="play" style="width:14px;height:14px;"></i></button>`;
        } else {
          // Stopped, Completed, Replied
          controlBtns = `<button class="btn btn-primary btn-icon" onclick="sequences.startCampaign('${lead.id}')" title="Restart"><i data-lucide="refresh-cw" style="width:14px;height:14px;"></i></button>`;
        }

        if (seq.status !== 'Stopped' && seq.status !== 'Completed' && seq.status !== 'Replied') {
          controlBtns += ` <button class="btn btn-danger btn-icon" onclick="sequences.stopCampaign('${lead.id}')" title="Stop"><i data-lucide="square" style="width:14px;height:14px;"></i></button>`;
        }

        tr.innerHTML = `
          <td style="font-weight:600;">${lead.name}</td>
          <td>${lead.company || '<span style="color:var(--text-muted);">Direct</span>'}</td>
          <td style="font-size:13px;color:var(--text-secondary);">${lead.email || '<span style="color:var(--text-muted);font-style:italic;">No Email</span>'}</td>
          <td><span class="badge badge-researched">Step ${seq.current_step} / 4</span></td>
          <td><strong style="color:${statusColor}">${seq.status}</strong></td>
          <td style="font-size:13px;color:var(--text-secondary);">${lastSentText}</td>
          <td style="font-size:13px;color:var(--text-secondary);">${nextSentText}</td>
          <td>
            <div style="display:flex; gap:6px;">
              ${controlBtns}
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      lucide.createIcons();

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-danger);">Error fetching campaigns: ${err.message}</td></tr>`;
    }
  },

  async pauseCampaign(leadId) {
    try {
      await api.pauseSequence(leadId);
      app.showToast('success', 'Sequence paused.');
      this.loadSequences();
    } catch (err) {
      app.showToast('error', `Failed to pause: ${err.message}`);
    }
  },

  async resumeCampaign(leadId) {
    try {
      await api.resumeSequence(leadId);
      app.showToast('success', 'Sequence resumed and queued.');
      this.loadSequences();
    } catch (err) {
      app.showToast('error', `Failed to resume: ${err.message}`);
    }
  },

  async stopCampaign(leadId) {
    if (!confirm('Are you sure you want to stop this sequence? This will remove scheduled email steps.')) return;
    try {
      await api.stopSequence(leadId);
      app.showToast('success', 'Sequence stopped.');
      this.loadSequences();
    } catch (err) {
      app.showToast('error', `Failed to stop: ${err.message}`);
    }
  },

  async startCampaign(leadId) {
    try {
      await api.startSequence(leadId);
      app.showToast('success', 'Sequence restarted and queued.');
      this.loadSequences();
    } catch (err) {
      app.showToast('error', `Failed to restart sequence: ${err.message}`);
    }
  }
};

window.sequences = sequences;
