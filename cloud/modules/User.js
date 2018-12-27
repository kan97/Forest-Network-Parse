'use strict';
const _ = require('lodash');
const UTILS = require('../../helpers/UTILS');

const UserModule = {};

UserModule.getFollowingList = async (request) => {
    const userId = request.params.userId || (request.user ? request.user.id : undefined);
    if (!userId) {
        throw "Missing params userId or login required";
    }

    let user = request.user;
    if (request.params.userId) {
        const userQuery = new Parse.Query('User');
        userQuery.equalTo('objectId', userId);
        user = await userQuery.first({useMasterKey: true});
    }

    const followingList = user.get('followings');
    if (!followingList || _.isEmpty(followingList)) {
        return [];
    }

    const followingQuery = new Parse.Query('User');
    followingQuery.containedIn('publicKey', followingList);
    followingQuery.select(['name', 'objectId', 'publicKey', 'picture']);

    return followingQuery.find({useMasterKey: true}).then((results) => {
        return UTILS.parseObjectArray2JSON(results);
    });
};

UserModule.searchUserByKeyword = (request) => {
    let keyword = request.params.keyword;
    keyword = UTILS.createRegex(keyword, 'i');

    let nameQuery = new Parse.Query('User');
    nameQuery.matches('name', keyword);

    let publicKeyQuery = new Parse.Query('User');
    publicKeyQuery.matches('name', keyword);

    const userQuery = Parse.Query.or(nameQuery, publicKeyQuery);
    if (request.params.page) {
        const page = request.params.page || 1;
        const perPage = request.params.perPage || 20;
    
        let pagging = UTILS.pageCalc(page, perPage);
        if (deviceTime) {
            userQuery.lessThan('createdAt', new Date(deviceTime));
        }
        if (pagging.offset) {
            userQuery.skip(page.offset);
            userQuery.limit(perPage);
        }
    } else {
        userQuery.descending('updatedAt');
    }
    
    userQuery.select(['name', 'objectId', 'publicKey', 'picture']);

    return userQuery.find().then((results) => {
        return UTILS.parseObjectArray2JSON(results);
    });
};

UserModule.getUser = (request) => {
    const userQuery = new Parse.Query('User');  
    const postQuery = new Parse.Query('Post');

    if (request.params.userId) {
        userQuery.equalTo('objectId', request.params.userId);
        postQuery.equalTo('user', UTILS.createBlankPointerTo('User', request.params.userId));
    } else if (request.params.publicKey) {
        userQuery.equalTo('publicKey', request.params.publicKey);
      
        const miniUserQuery = UTILS.buildPointerQuery('User');
        miniUserQuery.equalTo('publicKey', request.params.publicKey);
        
        postQuery.matchesQuery('user', miniUserQuery);
    } else {
        throw "Missing param objectId and publicKey!"
    }
  
    let promises = [];
    promises.push(userQuery.first());
    promises.push(postQuery.count());

    return Promise.all(promises).then((result) => {
        result[0] = result[0]  ? result[0].toJSON() : null;
        if (result[0]) {
            result[0]['postNum'] = result[1];
        }
        
        return result[0];
    });
};

module.exports = UserModule;