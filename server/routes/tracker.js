const express = require('express');
const router = express.Router();
const trackingService = require('../services/trackingService');

// Tracking Pixel Endpoint
router.get('/:emailId', async (req, res) => {
  const { emailId } = req.params;
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';

  // Process open tracking asynchronously in the background so request finishes instantly
  trackingService.trackEmailOpen(emailId, ipAddress, userAgent)
    .catch(err => console.error('Tracking log process failed:', err.message));

  // Respond with transparent 1x1 GIF
  res.set({
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  res.send(trackingService.pixelBuffer);
});

module.exports = router;
