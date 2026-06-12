/**
 * Veloxis Global CRM — Main Controller & Routing
 */

window.safeCreateIcons = function() {
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  } else {
    console.warn('⚠️ Lucide library is offline or failed to load. SVG icon compilation skipped.');
  }
};

const app = {
  currentScreen: 'dashboard',

  init() {
    console.log('🏁 Starting Veloxis Global Command Center...');
    
    // Bind Sidebar Navigation Clicks
    const navItems = document.querySelectorAll('.nav-item[data-screen]');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const screen = item.getAttribute('data-screen');
        this.showScreen(screen);
      });
    });

    // Initialize Active Screen Controllers
    this.refreshScreen(this.currentScreen);

    // Initial SVG Icons compilation
    safeCreateIcons();

    // Redraw SVG charts on window resize
    window.addEventListener('resize', () => {
      if (this.currentScreen === 'analytics') {
        analytics.loadAnalyticsData();
      }
    });

    // Run first initialization
    leads.init();
    instagramOutreach.init();
    templates.init();

    // Start auto-refresh interval every 30 seconds for live screens (dashboard, analytics, sent-mail)
    setInterval(() => {
      this.pollActiveScreenData();
    }, 30000);
  },

  showScreen(screenId) {
    if (this.currentScreen === screenId) return;

    // Toggle active classes on nav elements
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${screenId}`);
    if (activeNav) activeNav.classList.add('active');

    // Toggle active screen elements in DOM
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) targetScreen.classList.add('active');

    // Close CRM side detail slider panel when navigating away
    if (screenId !== 'leads') {
      leads.closeSidePanel();
    }

    // Auto-close mobile sidebar if open
    this.toggleMobileSidebar(false);

    this.currentScreen = screenId;
    this.refreshScreen(screenId);
  },

  toggleMobileSidebar(force) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    const isOpen = sidebar.classList.contains('mobile-open');
    const shouldOpen = typeof force === 'boolean' ? force : !isOpen;

    if (shouldOpen) {
      sidebar.classList.add('mobile-open');
      if (backdrop) backdrop.classList.add('active');
    } else {
      sidebar.classList.remove('mobile-open');
      if (backdrop) backdrop.classList.remove('active');
    }
  },

  refreshScreen(screenId) {
    console.log(`➡️  Navigating to screen: ${screenId}`);
    
    switch (screenId) {
      case 'dashboard':
        dashboard.init();
        break;
      case 'leads':
        leads.loadLeads();
        break;
      case 'instagram':
        instagramOutreach.loadLeads();
        break;
      case 'templates':
        templates.loadTemplates();
        break;
      case 'sequences':
        sequences.init();
        break;
      case 'sent-mail':
        sentMail.init();
        break;
      case 'planner':
        planner.init();
        break;
      case 'icp':
        icp.init();
        break;
      case 'analytics':
        analytics.init();
        break;
      case 'settings':
        settings.init();
        break;
    }
  },

  pollActiveScreenData() {
    console.log(`⏱️ Auto-polling updates for active screen: ${this.currentScreen}...`);
    if (this.currentScreen === 'dashboard') {
      dashboard.loadStats().catch(err => console.error('Auto-refresh dashboard failed:', err.message));
    } else if (this.currentScreen === 'analytics') {
      analytics.loadAnalyticsData().catch(err => console.error('Auto-refresh analytics failed:', err.message));
    } else if (this.currentScreen === 'sent-mail') {
      sentMail.loadEmails(true).catch(err => console.error('Auto-refresh sent-mail failed:', err.message));
    }
  },

  refreshDashboard() {
    dashboard.init();
    this.showToast('info', 'Dashboard stats updated.');
  },

  /**
   * Triggers a temporary toast alert box
   * @param {'success'|'error'|'info'} type 
   * @param {string} message 
   */
  showToast(type, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-octagon';

    toast.innerHTML = `
      <i data-lucide="${icon}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    safeCreateIcons();

    // Trigger removal animation
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s reverse ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  /**
   * Helper utility: compiles a time difference into a readable string
   */
  formatTimeAgo(dateInput) {
    const date = new Date(dateInput);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval}y ago`;
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval}mo ago`;
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval}d ago`;
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval}h ago`;
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval}m ago`;
    
    return seconds < 10 ? 'just now' : `${Math.floor(seconds)}s ago`;
  }
};

// Start application on page load
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});

window.app = app;
