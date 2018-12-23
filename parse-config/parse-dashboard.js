'use strict';

const parseServerOptions = require('./parse-server');

const serverURL = process.env.PROJECT_DOMAIN ? 
    'https://' + process.env.PROJECT_DOMAIN + '.glitch.me/api' :
    'http://localhost:1337/api';

const parseDashboardOption = {
    mountPath: process.env.DASHBOARD_MOUNT || '/dashboard',
    apps: [
        {
            serverURL: parseServerOptions.serverURL || serverURL,
            appId: parseServerOptions.appId,
            masterKey: parseServerOptions.masterKey,
            javascriptKey: parseServerOptions.javascriptKey,
            restKey: parseServerOptions.restAPIKey,
            clientKey: parseServerOptions.clientKey,
            appName: process.env.APP_NAME || 'ESHOP',
            appNameForURL: 'eshop'
        }
    ],
    users: [
        {
            user: 'forest',
            pass: '$2y$12$5sKTrNeMdKT0IkHJkCa4guZ7iU7hf.Zqdq08Gm42D8R5PZkAUML4i' // fnetwork
        }
    ],
    useEncryptedPasswords: true // @link: https://bcrypt-generator.com
}

module.exports = parseDashboardOption;
