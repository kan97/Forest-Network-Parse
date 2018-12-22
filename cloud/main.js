'use strict';

//add your own functions here
Parse.Cloud.define("hello", function(request) {
  return "world!";
});