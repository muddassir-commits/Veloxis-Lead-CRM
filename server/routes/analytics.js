const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseService');

// GET analytics dashboard dataset
router.get('/', async (req, res) => {
  try {
    // 1. Core Leads statistics
    const { data: leads, error: leadErr } = await supabase
      .from('leads')
      .select('id, status, lead_score, industry, country, created_at, updated_at, notes');
      
    if (leadErr) throw leadErr;

    const totalLeads = leads.length;
    const leadsByStatus = {};
    const leadsByScore = { Hot: 0, Warm: 0, Cold: 0 };
    const leadsByIndustry = {};
    const leadsByCountry = {};

    let linkedinSentToday = 0;
    let instagramSentToday = 0;

    leads.forEach(l => {
      leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1;
      leadsByScore[l.lead_score] = (leadsByScore[l.lead_score] || 0) + 1;
      if (l.industry) leadsByIndustry[l.industry] = (leadsByIndustry[l.industry] || 0) + 1;
      if (l.country) leadsByCountry[l.country] = (leadsByCountry[l.country] || 0) + 1;

      // Count manual outreaches updated today with manual send logs in notes
      const isUpdatedToday = l.updated_at && (new Date(l.updated_at).toDateString() === new Date().toDateString());
      if (l.notes && isUpdatedToday) {
        if (l.notes.toLowerCase().includes('via linkedin')) {
          linkedinSentToday++;
        }
        if (l.notes.toLowerCase().includes('via instagram')) {
          instagramSentToday++;
        }
      }
    });

    // 2. Fetch email metrics
    const { data: history, error: histErr } = await supabase
      .from('sequence_history')
      .select('id, sent_at, step');
      
    if (histErr) throw histErr;

    const { data: tracking, error: trackErr } = await supabase
      .from('email_tracking')
      .select('id, opens, last_opened_at, clicked');
      
    if (trackErr) throw trackErr;

    let emailsSentToday = 0;
    history.forEach(h => {
      const isSentToday = h.sent_at && (new Date(h.sent_at).toDateString() === new Date().toDateString());
      if (isSentToday) {
        emailsSentToday++;
      }
    });

    const totalSent = history.length;
    const totalOpens = tracking.reduce((acc, curr) => acc + (curr.opens || 0), 0);
    const uniqueOpened = tracking.filter(t => t.opens > 0).length;
    const totalClicked = tracking.filter(t => t.clicked).length;

    const openRate = totalSent > 0 ? Math.round((uniqueOpened / totalSent) * 100) : 0;
    const clickRate = uniqueOpened > 0 ? Math.round((totalClicked / uniqueOpened) * 100) : 0;

    // 3. Sent volume trends (Grouped by date)
    const volumeTimeline = {};
    history.forEach(h => {
      if (h.sent_at) {
        const dateStr = h.sent_at.split('T')[0]; // YYYY-MM-DD
        volumeTimeline[dateStr] = (volumeTimeline[dateStr] || 0) + 1;
      }
    });

    // Sort timeline by date
    const sortedTimeline = Object.entries(volumeTimeline)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Last 30 days

    // 4. Template performance breakdown
    const { data: templateStats, error: tempErr } = await supabase
      .from('sequence_history')
      .select(`
        id, step,
        templates (name, type, principle)
      `);
      
    if (tempErr) throw tempErr;
      
    const templatePerformance = {};
    if (templateStats) {
      templateStats.forEach(stat => {
        if (stat.templates) {
          const tName = stat.templates.name;
          if (!templatePerformance[tName]) {
            templatePerformance[tName] = { sent: 0, type: stat.templates.type, principle: stat.templates.principle };
          }
          templatePerformance[tName].sent++;
        }
      });
    }

    res.json({
      success: true,
      summary: {
        totalLeads,
        totalSent,
        totalOpens,
        uniqueOpened,
        openRate,
        clickRate,
        replies: leadsByStatus['Replied'] || 0,
        meetingsBooked: leadsByStatus['Meeting'] || 0,
        wonClients: leadsByStatus['Won'] || 0,
        emailsSentToday,
        linkedinSentToday,
        instagramSentToday
      },
      funnel: {
        new: leadsByStatus['New'] || 0,
        researched: leadsByStatus['Researched'] || 0,
        contacted: leadsByStatus['Contacted'] || 0,
        followedUp: leadsByStatus['Followed Up'] || 0,
        replied: leadsByStatus['Replied'] || 0,
        meeting: leadsByStatus['Meeting'] || 0,
        proposal: leadsByStatus['Proposal'] || 0,
        won: leadsByStatus['Won'] || 0,
        lost: leadsByStatus['Lost'] || 0
      },
      leadsByScore,
      leadsByIndustry,
      leadsByCountry,
      volumeTimeline: sortedTimeline,
      templatePerformance
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
