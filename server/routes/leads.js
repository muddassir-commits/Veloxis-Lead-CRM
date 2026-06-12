const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseService');

// Helper to normalize empty strings to null for database compatibility
const sanitizeLeadData = (data) => {
  if (!data) return data;
  const sanitized = { ...data };
  for (const key in sanitized) {
    if (sanitized[key] === '') {
      sanitized[key] = null;
    }
  }
  return sanitized;
};

// 1. GET all leads (with search & filters)
router.get('/', async (req, res) => {
  try {
    const { search, status, lead_score, industry, country, limit = 100, offset = 0 } = req.query;
    
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' });

    // Apply Search (across Name, Company, Email, Website)
    if (search) {
      query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%,website.ilike.%${search}%`);
    }

    // Apply Filters
    if (status) query = query.eq('status', status);
    if (lead_score) query = query.eq('lead_score', lead_score);
    if (industry) query = query.eq('industry', industry);
    if (country) query = query.eq('country', country);

    // Apply sorting & pagination
    query = query
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ success: true, leads: data, total: count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET single lead details by ID with history logs
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch lead details
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (leadErr) throw leadErr;
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    // Fetch send history
    const { data: history } = await supabase
      .from('sequence_history')
      .select(`
        id, step, sent_at, status, email_id,
        templates (name, type, principle)
      `)
      .eq('lead_id', id)
      .order('sent_at', { ascending: false });

    // Fetch tracking metrics
    const { data: tracking } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('lead_id', id);

    // Fetch active sequence status
    const { data: sequence } = await supabase
      .from('sequences')
      .select('*')
      .eq('lead_id', id)
      .maybeSingle();

    res.json({ 
      success: true, 
      lead, 
      history: history || [], 
      tracking: tracking || [],
      sequence: sequence || null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST - Create new lead
router.post('/', async (req, res) => {
  try {
    const leadData = sanitizeLeadData(req.body);
    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, lead: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST - Bulk insert leads
router.post('/bulk', async (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads)) {
      return res.status(400).json({ success: false, error: 'Input must be an array of leads' });
    }

    const sanitizedLeads = leads.map(sanitizeLeadData);

    const { data, error } = await supabase
      .from('leads')
      .insert(sanitizedLeads)
      .select();

    if (error) throw error;
    res.json({ success: true, count: data.length, leads: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. PUT - Update lead details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = sanitizeLeadData(req.body);
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, lead: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE - Clear CRM (delete all leads)
router.delete('/clear/all', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .delete()
      .not('id', 'is', null)
      .select('id');

    if (error) throw error;
    res.json({ success: true, count: data ? data.length : 0, message: 'All leads and associated logs deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. DELETE - Delete lead
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST - Bulk delete leads
router.post('/bulk-delete', async (req, res) => {
  try {
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds)) {
      return res.status(400).json({ success: false, error: 'leadIds must be an array' });
    }

    const { data, error } = await supabase
      .from('leads')
      .delete()
      .in('id', leadIds)
      .select('id');

    if (error) throw error;
    res.json({ 
      success: true, 
      count: data ? data.length : 0, 
      message: `${data ? data.length : 0} leads deleted successfully.` 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. POST - Trigger Auto-Generation of Leads from CRM
router.post('/auto-generate', async (req, res) => {
  try {
    const { count = 10, industry, city, mode = 'email' } = req.body;

    const autoSchedulerService = require('../services/autoSchedulerService');
    
    if (autoSchedulerService.leadGenProgress.running) {
      return res.status(400).json({ success: false, error: 'A lead generation task is already running.' });
    }

    const industries = industry ? [industry] : null;
    const cities = city ? [city] : null;

    // Trigger asynchronously so it doesn't block the request and cause gateway timeouts
    autoSchedulerService.runDailyLeadGeneration(parseInt(count), industries, cities, mode)
      .then(inserted => {
        console.log(`🚀 CRM triggered lead generation completed. Enqueued ${inserted} leads.`);
      })
      .catch(err => {
        console.error('❌ CRM triggered lead generation failed:', err.message);
      });

    res.json({ success: true, message: 'Lead auto-generation started in the background.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. GET - Get current progress of Lead Auto-Generation
router.get('/auto-generate/status', (req, res) => {
  const autoSchedulerService = require('../services/autoSchedulerService');
  res.json({ success: true, progress: autoSchedulerService.leadGenProgress });
});

module.exports = router;
