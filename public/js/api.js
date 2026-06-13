/**
 * Veloxis Global CRM — API Client Utility
 */

const API_BASE = window.location.origin;

const api = {
  // Leads Endpoints
  async getLeads(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/leads?${query}`);
  },

  async getLead(id) {
    return this.request(`/api/leads/${id}`);
  },

  async createLead(leadData) {
    return this.request(`/api/leads`, 'POST', leadData);
  },

  async updateLead(id, updates) {
    return this.request(`/api/leads/${id}`, 'PUT', updates);
  },

  async deleteLead(id) {
    return this.request(`/api/leads/${id}`, 'DELETE');
  },

  async clearAllLeads() {
    return this.request('/api/leads/clear/all', 'DELETE');
  },

  async bulkDeleteLeads(leadIds) {
    return this.request('/api/leads/bulk-delete', 'POST', { leadIds });
  },

  async bulkInsertLeads(leads) {
    return this.request(`/api/leads/bulk`, 'POST', { leads });
  },

  // Scraper Endpoints
  async scrapeMaps(query, region, maxResults) {
    return this.request('/api/scrape/maps', 'POST', { query, region, maxResults });
  },

  async scrapeSocial(platform, niche, city, maxResults) {
    return this.request('/api/scrape/social', 'POST', { platform, niche, city, maxResults });
  },

  async searchApollo(keywords, titles, locations, maxResults) {
    return this.request('/api/scrape/apollo', 'POST', { keywords, titles, locations, maxResults });
  },

  async enrichLead(leadId) {
    return this.request('/api/scrape/enrich', 'POST', { leadId });
  },

  async bulkEnrichLeads(leadIds) {
    return this.request('/api/scrape/bulk-enrich', 'POST', { leadIds });
  },

  // Email & Sequences
  async getSequences() {
    return this.request('/api/email/sequences');
  },

  async getSentEmails() {
    return this.request('/api/email/sent');
  },

  async deleteSentEmail(id) {
    return this.request(`/api/email/history/${id}`, 'DELETE');
  },

  async resendSentEmail(id) {
    return this.request(`/api/email/history/${id}/resend`, 'POST');
  },

  async sendManualEmail(to, subject, body, leadId) {
    return this.request('/api/email/send', 'POST', { to, subject, body, leadId });
  },

  async startSequence(leadId) {
    return this.request('/api/email/sequence/start', 'POST', { leadId });
  },

  async bulkStartSequence(leadIds) {
    return this.request('/api/email/sequence/bulk-start', 'POST', { leadIds });
  },

  async pauseSequence(leadId) {
    return this.request('/api/email/sequence/pause', 'POST', { leadId });
  },

  async resumeSequence(leadId) {
    return this.request('/api/email/sequence/resume', 'POST', { leadId });
  },

  async stopSequence(leadId) {
    return this.request('/api/email/sequence/stop', 'POST', { leadId });
  },

  // Templates
  async getTemplates(type) {
    const query = type ? `?type=${type}` : '';
    return this.request(`/api/templates${query}`);
  },

  async createTemplate(data) {
    return this.request('/api/templates', 'POST', data);
  },

  async updateTemplate(id, data) {
    return this.request(`/api/templates/${id}`, 'PUT', data);
  },

  async deleteTemplate(id) {
    return this.request(`/api/templates/${id}`, 'DELETE');
  },

  async renderTemplate(leadId, templateId, customSubject = null, customBody = null) {
    return this.request('/api/templates/render', 'POST', { leadId, templateId, customSubject, customBody });
  },

  // Planner
  async getPlanner() {
    return this.request('/api/planner');
  },

  // Analytics
  async getAnalytics() {
    return this.request('/api/analytics');
  },

  // ICP
  async getICPs() {
    return this.request('/api/icp');
  },

  async saveICP(data) {
    return this.request('/api/icp', 'POST', data);
  },

  // Settings
  async getSettings() {
    return this.request('/api/settings');
  },

  async saveSetting(key, value) {
    return this.request('/api/settings', 'POST', { key, value });
  },

  async testSMTP() {
    return this.request('/api/settings/test-smtp', 'POST');
  },

  // Lead Auto-Generation
  async triggerAutoGenLeads(count, industry, city, mode = 'email') {
    return this.request('/api/leads/auto-generate', 'POST', { count, industry, city, mode });
  },

  async getAutoGenStatus() {
    return this.request('/api/leads/auto-generate/status');
  },

  // Helper Request Method
  async request(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP error! Status: ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error.message);
      throw error;
    }
  }
};

window.api = api;
