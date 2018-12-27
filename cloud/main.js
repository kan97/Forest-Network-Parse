'use strict';

//add your own functions here
Parse.Cloud.define("hello", function(request) {
  return "world!";
});

let TimelineModule = require('./modules/Timeline');
Parse.Cloud.define('getPostsTimeline', TimelineModule.getPostsTimeline);
Parse.Cloud.define('getPostsNewFeeds', TimelineModule.getPostsNewFeeds);
Parse.Cloud.define('getPostsExplore', TimelineModule.getPostsExplore);

let UserModule = require('./modules/User');
Parse.Cloud.define('getFollowingList', UserModule.getFollowingList);
Parse.Cloud.define('searchUserByKeyword', UserModule.searchUserByKeyword);
Parse.Cloud.define('getUser', UserModule.getUser);