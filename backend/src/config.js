'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'clms-dev-secret-change-in-production',
  tokenExpiry: process.env.JWT_EXPIRY || '8h',
  dataDir: process.env.DATA_DIR || path.join(__dirname, '..', 'data'),
  env: process.env.NODE_ENV || 'development'
};
