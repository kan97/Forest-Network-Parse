'use strict';
const _ = require('lodash');
const serverURL = process.env.PROJECT_DOMAIN ? 
    'https://' + process.env.PROJECT_DOMAIN + '.glitch.me/api' :
    'http://localhost:1337/api';
console.log('[i] - Server is on ' + serverURL);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

//===========================[ PARSE OPTIONS - MAIN]===================
const parseServerOption = {
    databaseURI: process.env.DATABASE_URI || 'mongodb://localhost:27017/eshop',
    cloud: process.env.CLOUD_CODE_MAIN || './cloud/main.js',
    appId: process.env.APP_ID || 'localAppId0123456789',
    masterKey: process.env.MASTER_KEY || 'localMasterKey0123456789',
    serverURL: serverURL,
    maxUploadSize: process.env.PARSE_SERVER_MAX_UPLOAD_SIZE || '10mb',

    javascriptKey: process.env.PARSE_SERVER_JAVASCRIPT_KEY || 'js-SDK-Key-0123456789',
    restAPIKey: process.env.PARSE_SERVER_REST_API_KEY || 'rest-API-Key-0123456789',
    clientKey: process.env.PARSE_SERVER_CLIENT_KEY || 'client-SDK-Key-0123456789' //  Key for iOS, MacOS, tvOS clients
};

//============================[LIVE QUERY]=============================
const enabledLiveQuery = process.env.PARSE_SERVER_ENABLED_LIVE_QUERY || 0;

if (enabledLiveQuery == 1) {
    const liveQueryClassesStr = process.env.PARSE_SERVER_LIVE_QUERY_CLASS_NAMES;
    const liveQueryOptions = {
        liveQuery: {
            classNames: (liveQueryClassesStr ? liveQueryClassesStr.split(',') : '') || [] // List of classes to support for query subscriptions
        }
    };

    parseServerOption = _.extend(parseServerOption, liveQueryOptions);
}

//=====================================================================
module.exports = parseServerOption;