const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const sequenceService = require('../services/sequenceService');
const supabase = require('../services/supabaseService');

// 1. POST - Send manual email to a lead
router.post('/send', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    
    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, error: 'to, subject, and body parameters are required' });
    }

    const htmlContent = body.replace(/\n/g, '<br/>');
    const result = await emailService.sendMail({
      to,
      subject,
      html: `<html><body>${htmlContent}</body></html>`
    });

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST - Start sequence for a single lead
router.post('/sequence/start', async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId is required' });
    }

    const result = await sequenceService.startSequenceForLead(leadId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST - Batch Start Sequences
router.post('/sequence/bulk-start', async (req, res) => {
  try {
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds)) {
      return res.status(400).json({ success: false, error: 'leadIds must be an array' });
    }

    console.log(`🚀 Bulk starting sequences for ${leadIds.length} leads...`);
    const results = { succeeded: [], failed: [] };

    for (const leadId of leadIds) {
      const res = await sequenceService.startSequenceForLead(leadId);
      if (res.success) {
        results.succeeded.push(leadId);
      } else {
        results.failed.push({ leadId, error: res.error });
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST - Pause outreach sequence
router.post('/sequence/pause', async (req, res) => {
  try {
    const { leadId } = req.body;
    const { data, error } = await supabase
      .from('sequences')
      .update({ status: 'Paused', updated_at: new Date().toISOString() })
      .eq('lead_id', leadId)
      .select();

    if (error) throw error;
    res.json({ success: true, message: 'Sequence paused successfully', data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST - Resume outreach sequence
router.post('/sequence/resume', async (req, res) => {
  try {
    const { leadId } = req.body;
    
    // Resume sequence and set next_sent_at to now so it sends on the next cron check
    const { data, error } = await supabase
      .from('sequences')
      .update({ 
        status: 'Running', 
        next_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('lead_id', leadId)
      .select();

    if (error) throw error;
    res.json({ success: true, message: 'Sequence resumed successfully', data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST - Stop outreach sequence
router.post('/sequence/stop', async (req, res) => {
  try {
    const { leadId } = req.body;
    const { data, error } = await supabase
      .from('sequences')
      .update({ status: 'Stopped', next_sent_at: null, updated_at: new Date().toISOString() })
      .eq('lead_id', leadId)
      .select();

    if (error) throw error;
    res.json({ success: true, message: 'Sequence stopped successfully', data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. GET/POST - Trigger sequence checks manually (for external cron triggers like cron-job.org)
router.all('/sequence/cron', async (req, res) => {
  try {
    console.log('⏰ Received external cron trigger for processing outreach sequence...');
    await sequenceService.processDueSequences();
    res.json({ success: true, message: 'Cron sequence processing completed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

