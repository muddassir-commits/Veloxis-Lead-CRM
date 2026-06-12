const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseService');

// 1. GET all templates
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let query = supabase.from('templates').select('*');
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    
    res.json({ success: true, templates: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST - Create template
router.post('/', async (req, res) => {
  try {
    const templateData = req.body;
    const { data, error } = await supabase
      .from('templates')
      .insert([templateData])
      .select()
      .single();
      
    if (error) throw error;
    res.status(201).json({ success: true, template: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. PUT - Update template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    res.json({ success: true, template: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. DELETE - Delete template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST - Render template with lead variables
router.post('/render', async (req, res) => {
  try {
    const { leadId, templateId, customSubject, customBody } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId is required' });
    }

    // Fetch Lead
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // Fetch Template if ID is provided
    let subject = customSubject || '';
    let body = customBody || '';

    if (templateId) {
      const { data: template } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();

      if (template) {
        subject = template.subject;
        body = template.body;
      }
    }

    // Fetch Signature
    const { data: sigSettings } = await supabase.from('settings').select('value').eq('key', 'email_signature').maybeSingle();
    const emailSig = sigSettings?.value?.signature || '';

    // Clean names
    const nameHelper = require('../utils/nameHelper');
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

    const templateEngine = require('../utils/templateEngine');
    const compiledSubject = templateEngine.compileTemplate(subject, dataContext);
    const compiledBody = templateEngine.compileTemplate(body, dataContext);

    res.json({
      success: true,
      subject: compiledSubject,
      body: compiledBody,
      lead
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
