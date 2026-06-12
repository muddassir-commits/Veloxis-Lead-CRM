const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const sequenceService = require('./services/sequenceService');
const browserManager = require('./services/browserManager');
const autoSchedulerService = require('./services/autoSchedulerService');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS & JSON Parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend dashboard assets with no-cache headers to prevent browser caching during updates
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Email Open Tracking Route (must run BEFORE /api routing for neat URLs)
const trackerRouter = require('./routes/tracker');
app.use('/track', trackerRouter);

// Bind API Sub-routes
const leadsRouter = require('./routes/leads');
const emailRouter = require('./routes/email');
const templatesRouter = require('./routes/templates');
const plannerRouter = require('./routes/planner');
const analyticsRouter = require('./routes/analytics');
const icpRouter = require('./routes/icp');
const settingsRouter = require('./routes/settings');

app.use('/api/leads', leadsRouter);
app.use('/api/email', emailRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/planner', plannerRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/icp', icpRouter);
app.use('/api/settings', settingsRouter);

// Health Check Endpoint for Render / UptimeRobot Keep-Alive
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Fallback: Redirect all non-API paths to Single Page App index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global Error Handler Middleware to catch any unhandled request errors gracefully
app.use((err, req, res, next) => {
  console.error('🔥 Global Server Error:', err.stack || err.message);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Automated Sequence Scheduler Cron
try {
  sequenceService.startScheduler();
} catch (cronErr) {
  console.error('❌ Failed to start cron scheduler:', cronErr.message);
}

// Start Daily Lead Gen & Outreach Auto Scheduler
try {
  autoSchedulerService.startAutoScheduler();
} catch (autoErr) {
  console.error('❌ Failed to start auto scheduler:', autoErr.message);
}

// Start Server Listening
const server = app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 VELOXIS OUTREACH COMMAND CENTER SERVER ONLINE`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`================================================================`);
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Shutting down gracefully...');
  sequenceService.stopScheduler();
  try {
    autoSchedulerService.stopAutoScheduler();
  } catch (err) {
    console.error('❌ Failed to stop auto scheduler:', err.message);
  }
  await browserManager.close();
  server.close(() => {
    console.log('Server connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received. Shutting down gracefully...');
  sequenceService.stopScheduler();
  try {
    autoSchedulerService.stopAutoScheduler();
  } catch (err) {
    console.error('❌ Failed to stop auto scheduler:', err.message);
  }
  await browserManager.close();
  server.close(() => {
    console.log('Server connection closed.');
    process.exit(0);
  });
});

// Trigger watcher restart
