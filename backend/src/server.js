'use strict';
const { createApp } = require('./app');
const { getStore } = require('./db/store');
const config = require('./config');

getStore(); // loads/creates the JSON collections before serving
createApp().listen(config.port, () => {
  console.log(`CLMS API + portal → http://localhost:${config.port}  [${config.env}]`);
});
