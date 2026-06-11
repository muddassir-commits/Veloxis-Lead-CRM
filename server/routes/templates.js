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

module.exports = router;
