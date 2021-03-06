'use strict';
require('dotenv').config()

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
const ParseDashboard = require('parse-dashboard');

var app = express();

const parseServerOption = require('./parse-config/parse-server');
var parseApi = new ParseServer(parseServerOption);
app.use('/api', parseApi);

const parseDashboardOption = require('./parse-config/parse-dashboard');
var parseDashboard = new ParseDashboard(parseDashboardOption);
app.use('/dashboard', parseDashboard);

console.log(typeof process.env.DISABLE_FOREST_NETWORK_SYNCH);
if (!(process.env.DISABLE_FOREST_NETWORK_SYNCH == "true")) {
  let socketsynch = require('./controller/socketsynch');
  console.log('=====================[START-SYNCH]========================');
  socketsynch.init();
}

var port = process.env.PORT || 1337;
app.listen(port, function() {
  console.log('eshop running on port ' + port + '.');
});