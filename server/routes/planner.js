const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseService');

// GET planner schedule overview
router.get('/', async (req, res) => {
  try {
    const now = new Date().toISOString();

    // 1. Fetch scheduled automated email sequences
    const { data: scheduledSequences, error: seqError } = await supabase
      .from('sequences')
      .select(`
        id, current_step, next_sent_at, status,
        leads (id, name, company, email, website, country, city)
      `)
      .eq('status', 'Running')
      .order('next_sent_at', { ascending: true });

    if (seqError) throw seqError;

    // 2. Fetch leads suitable for manual LinkedIn outreach (have linkedin handle, status is New/Researched)
    const { data: linkedinLeads } = await supabase
      .from('leads')
      .select('id, name, company, linkedin, industry, city, status')
      .not('linkedin', 'is', null)
      .neq('linkedin', '')
      .in('status', ['New', 'Researched'])
      .order('created_at', { ascending: false })
      .limit(20);

    // 3. Fetch leads suitable for manual Instagram outreach (have instagram handle, status is New/Researched)
    const { data: instagramLeads } = await supabase
      .from('leads')
      .select('id, name, company, instagram, industry, city, status')
      .not('instagram', 'is', null)
      .neq('instagram', '')
      .in('status', ['New', 'Researched'])
      .order('created_at', { ascending: false })
      .limit(40);

    // Filter out leads that already have running email sequences to prevent multi-channel overlap
    const runningLeadIds = new Set((scheduledSequences || []).map(s => s.leads?.id).filter(Boolean));

    const cleanLinkedinQueue = (linkedinLeads || [])
      .filter(l => !runningLeadIds.has(l.id))
      .slice(0, 10); // Target: 10/day

    const cleanInstagramQueue = (instagramLeads || [])
      .filter(l => !runningLeadIds.has(l.id))
      .slice(0, 30); // Target: 20-30/day

    res.json({
      success: true,
      scheduledEmails: scheduledSequences || [],
      linkedinQueue: cleanLinkedinQueue,
      instagramQueue: cleanInstagramQueue
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
