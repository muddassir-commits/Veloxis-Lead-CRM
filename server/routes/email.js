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

    const htmlContent = body.replace(/\\n/g, '\n').replace(/\n/g, '<br/>');
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

// 8. GET - Retrieve all sequences for Sequence Manager
router.get('/sequences', async (req, res) => {
  try {
    const { data: sequences, error } = await supabase
      .from('sequences')
      .select(`
        id, current_step, next_sent_at, last_sent_at, status,
        leads (id, name, company, email, website, country, city)
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, sequences: sequences || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. GET - Retrieve all sent emails (sequence history) for Sent Mail screen
router.get('/sent', async (req, res) => {
  try {
    const { data: history, error } = await supabase
      .from('sequence_history')
      .select(`
        id, step, sent_at, status, email_id,
        leads (id, name, company, email, website, country, city, industry),
        templates (id, name, type, subject, body, principle)
      `)
      .order('sent_at', { ascending: false });

    if (error) throw error;

    // Fetch tracking info for all sent emails to get opens
    const { data: tracking, error: trackError } = await supabase
      .from('email_tracking')
      .select('email_id, opens, last_opened_at, ip_addresses, user_agents');

    if (trackError) throw trackError;

    const trackingMap = {};
    if (tracking) {
      tracking.forEach(t => {
        trackingMap[t.email_id] = t;
      });
    }

    // Fetch Signature settings
    const { data: sigSettings } = await supabase.from('settings').select('value').eq('key', 'email_signature').maybeSingle();
    const emailSig = sigSettings?.value?.signature || '';

    const nameHelper = require('../utils/nameHelper');
    const templateEngine = require('../utils/templateEngine');

    // Combine history with tracking and compile template variables
    const sentEmails = (history || []).map(h => {
      const track = trackingMap[h.email_id] || { opens: 0, last_opened_at: null };
      const lead = h.leads || {};
      const template = h.templates || { subject: '', body: '' };

      const greetingName = nameHelper.getCleanGreetingName(lead.name || '', lead.company);
      const companyShort = nameHelper.getCleanCompanyName(lead.company || lead.name || '');

      const dataContext = {
        name: greetingName,
        greeting_name: greetingName,
        company: lead.company || 'your business',
        company_short: companyShort,
        website: lead.website || '',
        industry: lead.industry || 'your sector',
        city: lead.city || 'your city',
        signature: emailSig
      };

      const compiledSubject = templateEngine.compileTemplate(template.subject || '', dataContext).replace(/\\n/g, '\n');
      const compiledBody = templateEngine.compileTemplate(template.body || '', dataContext).replace(/\\n/g, '\n');

      return {
        id: h.id,
        step: h.step,
        sent_at: h.sent_at,
        status: h.status,
        email_id: h.email_id,
        opens: track.opens,
        last_opened_at: track.last_opened_at,
        ip_addresses: track.ip_addresses || [],
        user_agents: track.user_agents || [],
        lead: {
          id: lead.id,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          website: lead.website,
          industry: lead.industry,
          city: lead.city,
          country: lead.country
        },
        template: {
          name: template.name,
          principle: template.principle,
          type: template.type
        },
        subject: compiledSubject,
        body: compiledBody
      };
    });

    res.json({ success: true, sentEmails });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. DELETE - Delete a sent email log (sequence history)
router.delete('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First fetch the record to get the email_id (tracker ID)
    const { data: history, error: fetchErr } = await supabase
      .from('sequence_history')
      .select('email_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (history) {
      // Delete tracking record first
      await supabase
        .from('email_tracking')
        .delete()
        .eq('email_id', history.email_id);
      
      // Delete history record
      const { error: deleteErr } = await supabase
        .from('sequence_history')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;
    }

    res.json({ success: true, message: 'Sent email log deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. POST - Resend a sent email
router.post('/history/:id/resend', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the history record along with lead details and template content
    const { data: history, error: fetchErr } = await supabase
      .from('sequence_history')
      .select(`
        id, step, email_id, sequence_id, template_id,
        leads (id, name, company, email, website, country, city, industry),
        templates (id, subject, body)
      `)
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !history) {
      return res.status(404).json({ success: false, error: fetchErr?.message || 'Sent email log not found' });
    }

    const lead = history.leads;
    const template = history.templates;

    if (!lead || !lead.email) {
      return res.status(400).json({ success: false, error: 'Lead email address is missing' });
    }

    if (!template) {
      return res.status(400).json({ success: false, error: 'Outreach template no longer exists' });
    }

    // Fetch daily signature
    const { data: sigSettings } = await supabase.from('settings').select('value').eq('key', 'email_signature').maybeSingle();
    const emailSig = sigSettings?.value?.signature || '';

    const nameHelper = require('../utils/nameHelper');
    const templateEngine = require('../utils/templateEngine');

    // Compile variables
    const greetingName = nameHelper.getCleanGreetingName(lead.name, lead.company);
    const companyShort = nameHelper.getCleanCompanyName(lead.company || lead.name);

    const dataContext = {
      name: greetingName,
      greeting_name: greetingName,
      company: lead.company || 'your business',
      company_short: companyShort,
      website: lead.website || '',
      industry: lead.industry || 'your sector',
      city: lead.city || 'your city',
      signature: emailSig
    };

    const compiledSubject = templateEngine.compileTemplate(template.subject, dataContext);
    const compiledBody = templateEngine.compileTemplate(template.body, dataContext);
    const htmlContent = compiledBody.replace(/\\n/g, '\n').replace(/\n/g, '<br/>');

    // Generate new tracker ID
    const { v4: uuidv4 } = require('uuid');
    const newTrackerId = uuidv4();

    // Send email via Nodemailer
    const sendResult = await emailService.sendMail({
      to: lead.email,
      subject: compiledSubject,
      html: `<html><body>${htmlContent}</body></html>`,
      trackerId: newTrackerId
    });

    if (!sendResult.success) {
      return res.status(500).json({ success: false, error: sendResult.error });
    }

    // Create sequence history for the resent email
    await supabase.from('sequence_history').insert({
      sequence_id: history.sequence_id,
      lead_id: lead.id,
      step: history.step,
      template_id: template.id,
      email_id: newTrackerId,
      status: 'Sent'
    });

    // Create empty email tracking record
    await supabase.from('email_tracking').insert({
      lead_id: lead.id,
      email_id: newTrackerId,
      opens: 0
    });

    res.json({ success: true, message: 'Email resent successfully', newEmailId: newTrackerId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

