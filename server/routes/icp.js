const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseService');

// 1. GET all ICPs
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('icps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, icps: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST - Create or update an ICP profile
router.post('/', async (req, res) => {
  try {
    const icpData = req.body;
    
    let query;
    if (icpData.id) {
      icpData.updated_at = new Date().toISOString();
      query = supabase
        .from('icps')
        .update(icpData)
        .eq('id', icpData.id)
        .select()
        .single();
    } else {
      query = supabase
        .from('icps')
        .insert([icpData])
        .select()
        .single();
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, icp: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
