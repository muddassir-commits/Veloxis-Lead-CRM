const express = require('express');
const router = express.Router();
const logStreamService = require('../services/logStreamService');

// SSE endpoint to stream logs in real-time
router.get('/stream', (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Prevent Nginx/Render buffer buffering
  });

  // Register client
  logStreamService.addClient(res);

  // If connection closes, remove client
  req.on('close', () => {
    logStreamService.removeClient(res);
  });
});

// JSON fallback endpoint to fetch history
router.get('/history', (req, res) => {
  try {
    const history = logStreamService.getHistory();
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
