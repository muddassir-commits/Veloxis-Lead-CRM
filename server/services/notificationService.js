const telegramService = require('./telegramService');

/**
 * CRM Central Notification Service
 * Dispatches real-time alerts to the CEO's Telegram for all manual and automated activities.
 */
class NotificationService {
  /**
   * Helper to format and dispatch a message asynchronously
   * @param {string} emoji - Icon prefix
   * @param {string} title - Header of the notification
   * @param {Object} details - Key-value pair of details to include
   */
  async _sendNotification(emoji, title, details = {}) {
    let message = `${emoji} *CRM ALERT: ${title}*\n`;
    message += `📅 Time: ${new Date().toLocaleTimeString()} IST\n\n`;

    for (const [key, val] of Object.entries(details)) {
      if (val !== undefined && val !== null && val !== '') {
        message += `🔹 *${key}*: ${val}\n`;
      }
    }

    // Dispatch asynchronously so we do not block Express response cycles
    telegramService.sendTelegramMessage(message).catch(err => {
      console.error('⚠️ Central Notification dispatch failed:', err.message);
    });
  }

  // --- Scraper / Lead Gen Notifications ---
  
  notifyLeadGenStart(source, count, vertical, location) {
    this._sendNotification('🔍', 'Lead Sourcing Kickoff', {
      'Trigger Source': source,
      'Target Leads': count,
      'Industry Vertical': vertical,
      'Location Target': location
    });
  }

  notifyLeadGenComplete(source, count, enqueued) {
    this._sendNotification('🎉', 'Lead Sourcing Completed', {
      'Trigger Source': source,
      'Total Sourced': count,
      'Successfully Enqueued': enqueued
    });
  }

  // --- Email Send Notifications ---

  notifyEmailSent(emailAddress, leadName, subject, step, isManual = false) {
    this._sendNotification('✉️', isManual ? 'Manual Email Dispatched' : 'Sequence Email Dispatched', {
      'Recipient Name': leadName || 'N/A',
      'Email Address': emailAddress,
      'Subject Line': subject,
      'Sequence Step': step || 'Manual compose'
    });
  }

  notifyEmailFailed(emailAddress, leadName, errorMsg, isManual = false) {
    this._sendNotification('❌', isManual ? 'Manual Email Failed' : 'Sequence Email Failed', {
      'Recipient Name': leadName || 'N/A',
      'Email Address': emailAddress,
      'Failure Error': errorMsg
    });
  }

  // --- Bounce Notifications ---

  notifyBounceDetected(emailAddress, leadName, company) {
    this._sendNotification('🚨', 'Delivery Bounce Detected', {
      'Lead Name': leadName || 'N/A',
      'Company Name': company || 'N/A',
      'Bounced Email': emailAddress,
      'CRM Status Update': 'Marked as Bounced (Campaign Stopped)'
    });
  }

  // --- CRM State Modification Notifications ---

  notifyCrmCleared(count) {
    this._sendNotification('🗑️', 'CRM Leads Database Cleared', {
      'Action Taken': 'Manual Clear All Leads',
      'Records Deleted': count
    });
  }

  notifyLeadCreated(name, email, company) {
    this._sendNotification('📋', 'New Lead Added', {
      'Name': name || 'N/A',
      'Email': email || 'N/A',
      'Company': company || 'N/A'
    });
  }

  notifyLeadUpdated(name, email, updates) {
    this._sendNotification('✏️', 'Lead Record Updated', {
      'Lead Name': name || 'N/A',
      'Email Address': email,
      'Fields Updated': Object.keys(updates).join(', ')
    });
  }

  notifyLeadDeleted(name, email) {
    this._sendNotification('🗑️', 'Lead Record Deleted', {
      'Name': name || 'N/A',
      'Email Address': email
    });
  }

  // --- Settings / Scheduler State Notifications ---

  notifySettingsUpdated(category) {
    this._sendNotification('⚙️', 'CRM Settings Modified', {
      'Updated Category': category,
      'Triggered By': 'Manual Dashboard Update'
    });
  }

  notifyCronTriggered(taskName, details) {
    this._sendNotification('⏰', 'Automated Cron Triggered', {
      'Scheduler Task': taskName,
      'Details': details
    });
  }
}

module.exports = new NotificationService();
