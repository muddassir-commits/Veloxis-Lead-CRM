const supabase = require('./supabaseService');

// Base64 transparent 1x1 GIF buffer
const pixelBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/**
 * Processes an email open event for a given tracking email UUID
 * @param {string} emailId - The unique tracker ID embedded in the email
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client User Agent header
 * @returns {Promise<boolean>} - Whether tracking update succeeded
 */
async function trackEmailOpen(emailId, ipAddress, userAgent) {
  try {
    console.log(`📊 Open detected for Tracker ID: ${emailId}`);

    // 1. Find the tracking record
    const { data: trackRecord, error: fetchError } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('email_id', emailId)
      .maybeSingle();

    if (fetchError || !trackRecord) {
      console.warn(`⚠️  Tracking record not found for Email ID: ${emailId}`);
      return false;
    }

    const currentOpens = trackRecord.opens || 0;
    const newOpens = currentOpens + 1;
    const ipList = trackRecord.ip_addresses || [];
    const uaList = trackRecord.user_agents || [];

    // Append metadata if not already logged to prevent duplicate arrays from growing too large
    if (ipAddress && !ipList.includes(ipAddress)) ipList.push(ipAddress);
    if (userAgent && !uaList.includes(userAgent)) uaList.push(userAgent);

    // 2. Update tracking statistics
    const { error: updateError } = await supabase
      .from('email_tracking')
      .update({
        opens: newOpens,
        last_opened_at: new Date().toISOString(),
        ip_addresses: ipList,
        user_agents: uaList
      })
      .eq('id', trackRecord.id);

    if (updateError) throw updateError;

    // 3. Dynamically update Lead Score based on opens
    // Opens >= 3 -> Hot
    // Opens >= 1 -> Warm
    let targetScore = 'Warm';
    if (newOpens >= 3) {
      targetScore = 'Hot';
    }

    const { data: lead } = await supabase
      .from('leads')
      .select('lead_score')
      .eq('id', trackRecord.lead_id)
      .maybeSingle();

    if (lead && lead.lead_score !== 'Hot') {
      await supabase
        .from('leads')
        .update({ 
          lead_score: targetScore, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', trackRecord.lead_id);
      console.log(`📈 Lead Score upgraded to ${targetScore} for Lead ID: ${trackRecord.lead_id}`);
    }

    return true;
  } catch (err) {
    console.error('❌ Tracking open record update failed:', err.message);
    return false;
  }
}

module.exports = {
  trackEmailOpen,
  pixelBuffer
};
