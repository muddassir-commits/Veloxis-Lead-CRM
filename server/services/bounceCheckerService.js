const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const supabase = require('./supabaseService');

/**
 * Enterprise Bounce Checker Service
 */

// Load IMAP environment variables with SMTP fallbacks
const imapConfig = {
  host: process.env.IMAP_HOST || 'imap.hostinger.com',
  port: parseInt(process.env.IMAP_PORT || '993'),
  secure: process.env.IMAP_SECURE !== 'false',
  auth: {
    user: process.env.IMAP_USER || process.env.SMTP_USER || 'muddassir@veloxisglobal.com',
    pass: process.env.IMAP_PASS || process.env.SMTP_PASS
  }
};

/**
 * Connects to IMAP inbox, searches for bounce-backs, extracts the failed email, and updates CRM.
 */
async function checkBounces() {
  if (!imapConfig.auth.pass) {
    console.warn('⚠️ Bounce Checker: IMAP password not configured. Skipping check.');
    return { success: false, error: 'IMAP password not configured.' };
  }

  console.log(`📡 Bounce Checker: Connecting to IMAP inbox for ${imapConfig.auth.user}...`);
  
  const client = new ImapFlow({
    host: imapConfig.host,
    port: imapConfig.port,
    secure: imapConfig.secure,
    auth: {
      user: imapConfig.auth.user,
      pass: imapConfig.auth.pass
    },
    logger: false
  });

  try {
    await client.connect();
    
    // Lock the INBOX mailbox
    const lock = await client.getMailboxLock('INBOX');
    
    try {
      // Search for unread emails in the Inbox
      const uids = await client.search({ seen: false });
      console.log(`📧 Bounce Checker: Found ${uids.length} unread emails in inbox.`);
      
      let processedCount = 0;
      
      for (const uid of uids) {
        // Fetch raw envelope and source content
        const message = await client.fetchOne(uid, { source: true, envelope: true });
        if (!message || !message.source) continue;
        
        // Parse email using mailparser
        const parsed = await simpleParser(message.source);
        const subject = parsed.subject || '';
        
        // Check if email subject indicates a bounce-back / failure
        const isBounce = /undeliver|failure|returned to sender|mail delivery failed|returned mail/i.test(subject);
        if (!isBounce) continue;
        
        console.log(`🔍 Bounce Checker: Parsing bounce message UID ${uid}: "${subject}"`);
        
        // Extract the failed recipient's email address
        const bouncedEmail = extractBouncedEmail(parsed);
        
        if (bouncedEmail) {
          console.log(`🚨 Bounce Checker: Detected bounced recipient email: ${bouncedEmail}`);
          const matched = await processBounceInCRM(bouncedEmail, subject);
          
          if (matched) {
            processedCount++;
          }
        }
        
        // Mark message as SEEN (read) so we don't process it next time
        await client.messageFlagsAdd({ uid }, ['\\Seen']);
      }
      
      console.log(`✅ Bounce Checker Run Finished. Processed ${processedCount} bounces.`);
      return { success: true, processedCount };
    } finally {
      // Release lock
      lock.release();
    }
  } catch (err) {
    console.error('❌ Bounce Checker failed:', err.message);
    return { success: false, error: err.message };
  } finally {
    // Gracefully logout from the connection
    await client.logout().catch(() => {});
  }
}

/**
 * Parses bounce email MIME headers, body text, and attachments to find the original failed email address.
 * @param {Object} parsed - Parsed mailparser mail object
 * @returns {string|null} Bounced email address or null
 */
function extractBouncedEmail(parsed) {
  // 1. Check SMTP header for failed recipient (used by Brevo, SendGrid, etc.)
  const xFailed = parsed.headers.get('x-failed-recipients');
  if (xFailed) {
    const clean = cleanEmail(xFailed);
    if (clean) return clean;
  }
  
  // 2. Search message body (plain text & HTML) using regexes for common bounce patterns
  const bodyText = (parsed.text || '') + '\n' + (parsed.html || '');
  if (bodyText) {
    const bounceRegexes = [
      /to:\s*<([^>@]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/i,
      /to:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /failed recipient:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /recipient:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /deliver\s+to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /rfc822;\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ];
    
    for (const regex of bounceRegexes) {
      const match = bodyText.match(regex);
      if (match && match[1]) {
        const clean = cleanEmail(match[1]);
        // Avoid returning our own sending address if it got matched
        if (clean && clean !== imapConfig.auth.user.toLowerCase()) {
          return clean;
        }
      }
    }
  }

  // 3. Search in MIME attachments (like delivery-status reports)
  if (parsed.attachments && parsed.attachments.length > 0) {
    for (const attachment of parsed.attachments) {
      const content = attachment.content ? attachment.content.toString() : '';
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const match = content.match(emailRegex);
      if (match) {
        const clean = cleanEmail(match[0]);
        if (clean && clean !== imapConfig.auth.user.toLowerCase()) {
          return clean;
        }
      }
    }
  }

  return null;
}

/**
 * Helper to extract email and sanitize
 */
function cleanEmail(rawEmail) {
  if (!rawEmail || typeof rawEmail !== 'string') return null;
  const match = rawEmail.trim().match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Updates the CRM lead and corresponding sequence to handle a bounced email.
 * @param {string} emailAddress - Bounced email
 * @param {string} bounceSubject - Subject of bounce mail for notes
 */
async function processBounceInCRM(emailAddress, bounceSubject) {
  try {
    // 1. Locate lead in Supabase
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, name, company, notes')
      .eq('email', emailAddress)
      .maybeSingle();
      
    if (leadError || !lead) {
      console.log(`⚠️ Bounce Checker: Bounced email ${emailAddress} could not be matched to a lead in CRM.`);
      return false;
    }
    
    console.log(`🚨 Bounce Checker: Matching lead found: "${lead.name}" (ID: ${lead.id}). Updating status...`);

    // Dispatch Telegram alert for bounce detection
    try {
      const notificationService = require('./notificationService');
      notificationService.notifyBounceDetected(emailAddress, lead.name, lead.company || 'N/A');
    } catch (nErr) {
      console.error('Failed to dispatch bounce Telegram notification:', nErr.message);
    }
    
    // 2. Update Lead Status to 'Bounced'
    const cleanNotes = (lead.notes || '') + `\n[Bounce Daemon] Email bounced on ${new Date().toLocaleDateString()}: "${bounceSubject}"`;
    await supabase
      .from('leads')
      .update({
        status: 'Bounced',
        lead_score: 'Cold',
        notes: cleanNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id);
      
    // 3. Find and pause/stop any running sequences for this lead
    const { data: seq } = await supabase
      .from('sequences')
      .select('id, current_step')
      .eq('lead_id', lead.id)
      .maybeSingle();
      
    if (seq) {
      // Update sequence status to Stopped
      await supabase
        .from('sequences')
        .update({
          status: 'Stopped',
          updated_at: new Date().toISOString()
        })
        .eq('id', seq.id);
        
      // Insert sequence history failure log
      await supabase
        .from('sequence_history')
        .insert({
          sequence_id: seq.id,
          lead_id: lead.id,
          step: seq.current_step,
          status: 'Bounced'
        });
        
      console.log(`🛑 Bounce Checker: Outreach sequence for lead ID ${lead.id} successfully stopped.`);
    }
    
    return true;
  } catch (err) {
    console.error(`❌ Bounce Checker: Error processing CRM database update for ${emailAddress}:`, err.message);
    return false;
  }
}

module.exports = {
  checkBounces
};
