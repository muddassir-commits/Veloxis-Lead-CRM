const util = require('util');

// Keep original console references to write to stdout/stderr and avoid recursion
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

const MAX_LOGS = 500;
const logBuffer = [];
const clients = new Set();

// Helper to push logs and broadcast to SSE clients
function queueLog(level, args) {
  const message = util.format(...args);
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message
  };

  logBuffer.push(logEntry);
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.shift();
  }

  // Broadcast to connected SSE clients
  const data = `data: ${JSON.stringify(logEntry)}\n\n`;
  for (const client of clients) {
    try {
      client.write(data);
    } catch (err) {
      // Client might have closed, it will be cleaned up by the request close listener
      originalError.apply(console, ['Error broadcasting to SSE client:', err.message]);
    }
  }
}

// Override console methods to intercept logs
console.log = (...args) => {
  originalLog.apply(console, args);
  queueLog('info', args);
};

console.warn = (...args) => {
  originalWarn.apply(console, args);
  queueLog('warn', args);
};

console.error = (...args) => {
  originalError.apply(console, args);
  queueLog('error', args);
};

// Periodic heartbeat (ping) to prevent proxy/load balancer timeouts (e.g. Render's 60s idle timeout)
setInterval(() => {
  for (const client of clients) {
    try {
      client.write(':ping\n\n');
    } catch (err) {
      // Ignored, client will be cleaned up on close
    }
  }
}, 30000);

module.exports = {
  addClient(res) {
    clients.add(res);
    
    // Write connection establish headers/message and seed with history
    res.write(`event: connected\ndata: {"message": "Log stream connected"}\n\n`);
    
    logBuffer.forEach(logEntry => {
      res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
    });
  },
  
  removeClient(res) {
    clients.delete(res);
  },
  
  getHistory() {
    return [...logBuffer];
  }
};
