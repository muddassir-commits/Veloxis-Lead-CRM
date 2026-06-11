const express = require('express');
const router = express.Router();
const scraperService = require('../services/scraperService');
const emailFinderService = require('../services/emailFinderService');
const supabase = require('../services/supabaseService');

// 1. POST - Google Maps Scraping
router.post('/maps', async (req, res) => {
  try {
    const { query, region = 'India', maxResults = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter is required' });
    }

    const scrapedData = await scraperService.scrapeGoogleMaps(query, region, maxResults);
    
    res.json({ 
      success: true, 
      count: scrapedData.length, 
      results: scrapedData 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST - Enrich Single Lead (Extract email/socials from website)
router.post('/enrich', async (req, res) => {
  try {
    const { leadId } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId parameter is required' });
    }

    // Get lead details
    const { data: lead, error: fetchErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchErr || !lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // Run enrichment
    const enrichment = await emailFinderService.findEmailForLead(lead);

    // Save changes to Database
    const { data: updatedLead, error: updateErr } = await supabase
      .from('leads')
      .update({
        email: enrichment.email || lead.email,
        linkedin: enrichment.linkedin || lead.linkedin,
        instagram: enrichment.instagram || lead.instagram,
        notes: enrichment.notes,
        status: enrichment.email ? 'Researched' : lead.status, // Move to researched if email found
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, lead: updatedLead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST - Bulk Enrich Leads (Sequential to avoid rate limit/performance hits)
router.post('/bulk-enrich', async (req, res) => {
  try {
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds)) {
      return res.status(400).json({ success: false, error: 'leadIds must be an array' });
    }

    console.log(`🚀 Starting bulk email enrichment for ${leadIds.length} leads...`);
    const enrichedLeads = [];

    for (const leadId of leadIds) {
      try {
        const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
        if (!lead || !lead.website) continue;

        const enrichment = await emailFinderService.findEmailForLead(lead);
        
        const { data: updated } = await supabase
          .from('leads')
          .update({
            email: enrichment.email || lead.email,
            linkedin: enrichment.linkedin || lead.linkedin,
            instagram: enrichment.instagram || lead.instagram,
            notes: enrichment.notes,
            status: enrichment.email ? 'Researched' : lead.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId)
          .select()
          .single();

        if (updated) enrichedLeads.push(updated);
        // Cool down period
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`Error enriching lead ${leadId}:`, err.message);
      }
    }

    res.json({ 
      success: true, 
      count: enrichedLeads.length, 
      results: enrichedLeads 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
