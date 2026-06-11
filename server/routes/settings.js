const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseService');
const emailService = require('../services/emailService');

// 1. GET all settings
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value');

    if (error) throw error;
    
    // Map list of key-value rows to a single structured object
    const settingsObj = {};
    data.forEach(item => {
      settingsObj[item.key] = item.value;
    });

    res.json({ success: true, settings: settingsObj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST - Save a setting key-value pair
router.post('/', async (req, res) => {
  try {
    const { key, value } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ success: false, error: 'Key and Value are required' });
    }

    const { data, error } = await supabase
      .from('settings')
      .upsert({ 
        key, 
        value, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'key' })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, setting: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST - Test SMTP connectivity
router.post('/test-smtp', async (req, res) => {
  try {
    const result = await emailService.testSMTPConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
