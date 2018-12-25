'use strict';

//add your own functions here
Parse.Cloud.define("hello", function(request) {
  return "world!";
});

let TimelineModule = require('./modules/Timeline');
Parse.Cloud.define('getTimeline', TimelineModule.getTimeline);