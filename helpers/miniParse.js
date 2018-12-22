'use strict';

var parse = require('parse/node');
const config = require('../parse-config/parse-server');

module.exports = {
    init: function () {        
        parse.initialize(config.appId, config.javascriptKey, config.masterKey);
        parse.serverURL = config.serverURL;

        return parse;
    }
};