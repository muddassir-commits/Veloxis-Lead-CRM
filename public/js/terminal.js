/**
 * Veloxis Global CRM — Live Server Terminal Panel Controller
 */

const terminal = {
  panel: null,
  body: null,
  toggleBtn: null,
  eventSource: null,
  reconnectDelay: 3000,
  reconnectTimer: null,
  isAutoScrollEnabled: true,
  currentFilter: 'all',

  init() {
    console.log('🔌 Initializing Server Terminal Controller...');
    this.createDOM();
    this.setupListeners();
    this.restoreSavedHeight();
    this.connect();
  },

  createDOM() {
    // 1. Create Terminal Panel container
    this.panel = document.createElement('div');
    this.panel.id = 'crm-terminal-panel';
    this.panel.className = 'terminal-panel minimized';

    // 2. Set default or saved height
    const savedHeight = localStorage.getItem('crm-terminal-height') || '250px';
    this.panel.style.height = savedHeight;

    // 3. Assemble Inner HTML
    this.panel.innerHTML = `
      <div class="term-resize-handle"></div>
      <div class="term-header">
        <div class="term-header-left">
          <span class="term-status-dot disconnected" id="term-status-dot"></span>
          <span class="term-title"><i data-lucide="terminal"></i> Server Console Logs</span>
        </div>
        <div class="term-header-right">
          <select id="term-filter-select" class="term-select">
            <option value="all">All Logs</option>
            <option value="info">Info</option>
            <option value="warn">Warnings</option>
            <option value="error">Errors Only</option>
          </select>
          <button id="term-clear-btn" class="term-btn"><i data-lucide="trash-2"></i> Clear</button>
          <button id="term-min-btn" class="term-btn"><i data-lucide="minimize-2"></i> Minimize</button>
        </div>
      </div>
      <div class="term-body" id="term-body"></div>
    `;

    // 4. Create Toggle Button
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.id = 'crm-terminal-toggle';
    this.toggleBtn.className = 'terminal-toggle-btn';
    this.toggleBtn.innerHTML = `
      <i data-lucide="terminal"></i>
      <span>Terminal</span>
    `;

    // 5. Append to body
    document.body.appendChild(this.panel);
    document.body.appendChild(this.toggleBtn);

    // Save body reference
    this.body = document.getElementById('term-body');

    // Run Lucide Compile for icons
    if (window.safeCreateIcons) {
      window.safeCreateIcons();
    }
  },

  setupListeners() {
    // Toggle Button Click -> Maximize
    this.toggleBtn.addEventListener('click', () => this.setMaximized(true));

    // Minimize Button Click -> Minimize
    document.getElementById('term-min-btn').addEventListener('click', () => this.setMaximized(false));

    // Clear Button Click -> Clear
    document.getElementById('term-clear-btn').addEventListener('click', () => this.clear());

    // Filter Change -> Apply filter
    const filterSelect = document.getElementById('term-filter-select');
    filterSelect.addEventListener('change', (e) => this.setFilter(e.target.value));

    // Auto-scroll scroll lock detector
    this.body.addEventListener('scroll', () => {
      const threshold = 15;
      const isAtBottom = this.body.scrollHeight - this.body.clientHeight - this.body.scrollTop <= threshold;
      this.isAutoScrollEnabled = isAtBottom;
    });

    // Drag Resize Handle Listener
    const handle = this.panel.querySelector('.term-resize-handle');
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    const doResize = (e) => {
      if (!isResizing) return;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaY = startY - clientY; // drag up -> increase height
      const newHeight = Math.max(150, Math.min(window.innerHeight * 0.8, startHeight + deltaY));
      this.panel.style.height = `${newHeight}px`;
    };

    const stopResize = () => {
      if (!isResizing) return;
      isResizing = false;
      document.documentElement.removeEventListener('mousemove', doResize, false);
      document.documentElement.removeEventListener('mouseup', stopResize, false);
      document.documentElement.removeEventListener('touchmove', doResize, false);
      document.documentElement.removeEventListener('touchend', stopResize, false);
      this.panel.classList.remove('resizing');
      localStorage.setItem('crm-terminal-height', this.panel.style.height);
    };

    const startResize = (e) => {
      isResizing = true;
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      startHeight = parseInt(document.defaultView.getComputedStyle(this.panel).height, 10);
      
      document.documentElement.addEventListener('mousemove', doResize, false);
      document.documentElement.addEventListener('mouseup', stopResize, false);
      document.documentElement.addEventListener('touchmove', doResize, false);
      document.documentElement.addEventListener('touchend', stopResize, false);
      
      this.panel.classList.add('resizing');
    };

    handle.addEventListener('mousedown', startResize);
    handle.addEventListener('touchstart', startResize, { passive: true });
  },

  restoreSavedHeight() {
    const savedHeight = localStorage.getItem('crm-terminal-height');
    if (savedHeight) {
      this.panel.style.height = savedHeight;
    }
  },

  setMaximized(shouldShow) {
    if (shouldShow) {
      this.panel.classList.remove('minimized');
      this.toggleBtn.classList.add('hidden');
      // Scroll to bottom on open to ensure fresh view
      setTimeout(() => {
        this.body.scrollTop = this.body.scrollHeight;
      }, 300);
    } else {
      this.panel.classList.add('minimized');
      this.toggleBtn.classList.remove('hidden');
    }
  },

  updateStatus(isConnected) {
    const dot = document.getElementById('term-status-dot');
    if (!dot) return;

    if (isConnected) {
      dot.className = 'term-status-dot connected';
      dot.title = 'Connected';
    } else {
      dot.className = 'term-status-dot disconnected';
      dot.title = 'Disconnected. Reconnecting...';
    }
  },

  connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const sseUrl = '/api/logs/stream';
    this.eventSource = new EventSource(sseUrl);

    // Custom connection event
    this.eventSource.addEventListener('connected', () => {
      this.updateStatus(true);
      this.reconnectDelay = 3000; // Reset backoff
    });

    // Stream message event
    this.eventSource.onmessage = (e) => {
      try {
        const entry = JSON.parse(e.data);
        this.appendLine(entry);
      } catch (err) {
        // Skip ping comments
      }
    };

    // Error handling with exponential backoff
    this.eventSource.onerror = () => {
      this.updateStatus(false);
      this.eventSource.close();

      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        this.connect();
      }, this.reconnectDelay);
    };
  },

  escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  appendLine(entry) {
    if (!this.body) return;

    // Parse timestamp (ISO to HH:MM:SS)
    let timeStr = '';
    try {
      const date = new Date(entry.timestamp);
      timeStr = date.toTimeString().split(' ')[0];
    } catch (e) {
      timeStr = '--:--:--';
    }

    // Determine semantic color class
    let lineClass = '';
    if (entry.level === 'error') {
      lineClass = 'error';
    } else if (entry.level === 'warn') {
      lineClass = 'warn';
    } else {
      const msgLower = entry.message.toLowerCase();
      if (entry.message.includes('✅') || msgLower.includes('success') || msgLower.includes('online')) {
        lineClass = 'success';
      } else {
        lineClass = 'info';
      }
    }

    // Build the log line element
    const line = document.createElement('div');
    line.className = `term-line ${lineClass}`;
    line.dataset.level = entry.level;
    line.dataset.class = lineClass;

    // Format stack traces (make them stackable/newlines)
    const formattedMessage = this.escapeHTML(entry.message).replace(/\n/g, '<br>&nbsp;&nbsp;&nbsp;&nbsp;');

    line.innerHTML = `
      <span class="term-timestamp">${timeStr}</span>
      <span class="term-text">${formattedMessage}</span>
    `;

    // Apply visibility filter
    if (!this.matchesFilter(entry.level, lineClass)) {
      line.style.display = 'none';
    }

    // Append to body
    this.body.appendChild(line);

    // Keep DOM limited to 500 lines for high performance
    while (this.body.children.length > 500) {
      this.body.removeChild(this.body.firstChild);
    }

    // Auto-scroll
    if (this.isAutoScrollEnabled) {
      this.body.scrollTop = this.body.scrollHeight;
    }
  },

  matchesFilter(level, lineClass) {
    if (this.currentFilter === 'all') return true;
    if (this.currentFilter === 'error') return level === 'error';
    if (this.currentFilter === 'warn') return level === 'warn';
    if (this.currentFilter === 'info') return level === 'info' && lineClass !== 'success';
    return true;
  },

  setFilter(filterValue) {
    this.currentFilter = filterValue;
    const lines = this.body.querySelectorAll('.term-line');
    
    lines.forEach(line => {
      const level = line.dataset.level;
      const lineClass = line.dataset.class;
      
      if (this.matchesFilter(level, lineClass)) {
        line.style.display = 'flex';
      } else {
        line.style.display = 'none';
      }
    });
  },

  clear() {
    if (this.body) {
      this.body.innerHTML = '';
    }
  }
};

window.terminal = terminal;
