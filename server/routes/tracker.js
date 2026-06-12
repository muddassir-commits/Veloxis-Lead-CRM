const express = require('express');
const router = express.Router();
const trackingService = require('../services/trackingService');

// Tracking Pixel Endpoint
router.get('/:emailId', async (req, res) => {
  let { emailId } = req.params;
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';

  // Strip .gif extension if present to get the raw emailId UUID
  if (emailId && emailId.endsWith('.gif')) {
    emailId = emailId.slice(0, -4);
  }

  // Process open tracking asynchronously in the background so request finishes instantly
  trackingService.trackEmailOpen(emailId, ipAddress, userAgent)
    .catch(err => console.error('Tracking log process failed:', err.message));

  // Respond with transparent 1x1 GIF inline
  res.set({
    'Content-Type': 'image/gif',
    'Content-Disposition': 'inline',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  res.send(trackingService.pixelBuffer);
});

module.exports = router;
