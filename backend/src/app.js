'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { HttpError } = require('./utils/errors');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '512kb' }));
  app.get('/api/health', (req, res) => res.json({
    status: 'ok', service: 'library-management-api', time: new Date().toISOString()
  }));
  app.use('/api', routes);

  // Serve the built SPA when present (production single-port mode).
  const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route ${req.method} ${req.originalUrl}` } }));

  // Central error envelope: {error:{code,message,details?}} — no stack leaks.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Request body is not valid JSON' } });
    }
    console.error('[unhandled]', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Unexpected server error' } });
  });
  return app;
}

module.exports = { createApp };
