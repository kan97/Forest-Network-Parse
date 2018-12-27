'use strict';
const _ = require('lodash');
const UTILS = require('../../helpers/UTILS');

const TimelineModule = {};

//--no use
TimelineModule.getTimeline = async function (request) {
    let userPublicKey = request.params.userPublicKey;

    if (!userPublicKey) {
        throw "Missing param userPublicKey: String"
    }

    const PostQuery = new Parse.Query('Post');

    let pipeline = [
        {
            match: {
                user: userPublicKey
            }
        }, {
            lookup: {
                from: "_User",
                localField: "user",    // field in the orders collection
                foreignField: "publicKey",  // field in the items collection
                as: "user"
            }
        }, {
            project: { text: 1, time: 1, user: 1, hash: 1 }
        }
    ];

    let results = await PostQuery.aggregate(pipeline);
    let hashList = results.map((value) => {
        return value.hash;
    });

    let commentCount =new Parse.Query('Interact');
    commentCount.containedIn('postHash', hashList);
    commentCount.equalTo('type', 1);

    return Promise.all([commentCount.find()])
        .then(res => {
            console.log();
            return results;
        })
        .catch((err) => {
            throw err;
        });
};

TimelineModule.getPostsTimeline = async (request) => {
    const PostQuery = new Parse.Query('Post');

    const forUser = request.params.userId || (request.user ? request.user.id : undefined);
    if (!forUser) {
        throw "Missing params userId or login required";
    }

    const deviceTime = request.params.deviceTime;
    const page = request.params.page || 1;
    const perPage = request.params.perPage || 5;

    let pagging = UTILS.pageCalc(page, perPage);

    PostQuery.equalTo('user', UTILS.createBlankPointerTo('User', forUser));
    PostQuery.descending('time');
    PostQuery.include('user');
    PostQuery.select(['objectId', 'text', 'time', 'hash', 'type', 'user.name', 'user.objectId', 'user.picture']);
    if (deviceTime) {
        PostQuery.lessThan('createdAt', new Date(deviceTime));
    }
    if (pagging.offset) {
        PostQuery.skip(page.offset);
        PostQuery.limit(perPage);
    }


    let result = await PostQuery.find();
    const commentPostQuery = new Parse.Query('Interact');
    commentPostQuery.containedIn('postHash', result);
    commentPostQuery.exists('comment');
    commentPostQuery.include('user');
    commentPostQuery.ascending('time');
    commentPostQuery.select(['user.name', 'user.objectId', 'user.picture', 'comment', 'time', 'postHash']);

    const reactionPostQuery = new Parse.Query('Interact');
    reactionPostQuery.containedIn('postHash', result);
    reactionPostQuery.exists('reaction');
    //reactionPostQuery.notEqualTo('reaction', 0);
    reactionPostQuery.include('user');
    reactionPostQuery.ascending('time');
    reactionPostQuery.select(['user.name', 'user.objectId', 'user.picture', 'reaction', 'time', 'postHash']);

    let promises = [];
    promises.push(reactionPostQuery.find());
    promises.push(commentPostQuery.find());

    return Promise.all(promises).then(Interacts => {
        let reactions = {};
        let comments = {};
        let myReaction = {};
        let addedUser = [];

        Interacts[0].forEach(interact => {
            let postId = interact.get('postHash').id;
            interact = interact.set('user', interact.get('user').toJSON());
            interact = interact.toJSON();

            if (interact.reaction == 0 || !interact.reaction) {
                addedUser[postId].push(interact.user.ObjectId);
                return;
            }

            if (!reactions[postId]) {
                reactions[postId] = [];
            }
            if (!addedUser[postId]) {
                addedUser[postId] = [];
            }

            if (!addedUser[postId].includes(interact.user.ObjectId) &&) {
                reactions[postId].push(interact);
                addedUser[postId].push(interact.user.ObjectId);
                if (!myReaction[postId] && request.user && interact.user.ObjectId == request.user.id) {
                    myReaction[postId] = interact.reaction;
                }
            }
        });

        Interacts[1].forEach(interact => {
            let postId = interact.get('postHash').id;
            interact = interact.set('user', interact.get('user').toJSON());
            interact = interact.toJSON();
            if (!comments[postId]) {
                comments[postId] = [];
            }
            comments[postId].push(interact);
        });

        result = result.map((Post) => {
            Post.set('user', Post.get('user').toJSON());
            Post = Post.toJSON();
            Post['reactions'] = reactions[Post.objectId];
            Post['comments'] = comments[Post.objectId];
            Post['myReaction'] = myReaction[Post.objectId];
            return Post;
        });

        return result;
    });
};

TimelineModule.getPostsExplore = async (request) => {
    const PostQuery = new Parse.Query('Post');

    const deviceTime = request.params.deviceTime;
    const page = request.params.page || 1;
    const perPage = request.params.perPage || 5;

    let pagging = UTILS.pageCalc(page, perPage);

    PostQuery.descending('time');
    PostQuery.include('user');
    PostQuery.select(['objectId', 'text', 'time', 'hash', 'type', 'user.name', 'user.objectId', 'user.picture']);
    if (deviceTime) {
        PostQuery.lessThan('createdAt', new Date(deviceTime));
    }
    if (pagging.offset) {
        PostQuery.skip(page.offset);
        PostQuery.limit(perPage);
    } else {
        PostQuery.limit(20);
    }


    let result = await PostQuery.find();
    const commentPostQuery = new Parse.Query('Interact');
    commentPostQuery.containedIn('postHash', result);
    commentPostQuery.exists('comment');
    commentPostQuery.include('user');
    commentPostQuery.ascending('time');
    commentPostQuery.select(['user.name', 'user.objectId', 'user.picture', 'comment', 'time', 'postHash']);

    const reactionPostQuery = new Parse.Query('Interact');
    reactionPostQuery.containedIn('postHash', result);
    reactionPostQuery.exists('reaction');
    reactionPostQuery.notEqualTo('reaction', 0);
    reactionPostQuery.include('user');
    reactionPostQuery.ascending('time');
    reactionPostQuery.select(['user.name', 'user.objectId', 'user.picture', 'reaction', 'time', 'postHash']);

    let promises = [];
    promises.push(reactionPostQuery.find());
    promises.push(commentPostQuery.find());

    return Promise.all(promises).then(Interacts => {
        let reactions = {};
        let comments = {};
        let myReaction = {};
        let addedUser = [];

        Interacts[0].forEach(interact => {
            let postId = interact.get('postHash').id;
            interact = interact.set('user', interact.get('user').toJSON());
            interact = interact.toJSON();

            if (interact.reaction == 0 || !interact.reaction) {
                addedUser[postId].push(interact.user.ObjectId);
                return;
            }

            if (!reactions[postId]) {
                reactions[postId] = [];
            }
            if (!addedUser[postId]) {
                addedUser[postId] = [];
            }

            if (!addedUser[postId].includes(interact.user.ObjectId) &&) {
                reactions[postId].push(interact);
                addedUser[postId].push(interact.user.ObjectId);
                if (!myReaction[postId] && request.user && interact.user.ObjectId == request.user.id) {
                    myReaction[postId] = interact.reaction;
                }
            }
        });

        Interacts[1].forEach(interact => {
            let postId = interact.get('postHash').id;
            interact = interact.set('user', interact.get('user').toJSON());
            interact = interact.toJSON();
            if (!comments[postId]) {
                comments[postId] = [];
            }
            comments[postId].push(interact);
        });

        result = result.map((Post) => {
            Post.set('user', Post.get('user').toJSON());
            Post = Post.toJSON();
            Post['reactions'] = reactions[Post.objectId];
            Post['comments'] = comments[Post.objectId];
            Post['myReaction'] = myReaction[Post.objectId];
            return Post;
        });

        return result;
    });
};

TimelineModule.getPostsNewFeeds = async (request) => {
    const PostQuery = new Parse.Query('Post');

    const forUser = request.user ? request.user.id : undefined;
    if (!forUser) {
        throw "Login required";
    }

    const followingList =request.user.get('followings');
    if (!followingList || _.isEmpty(followingList)) {
        return [];
    }

    followingList = followingList.map((IDvalue) => {
        return UTILS.createBlankPointerTo('User', IDvalue);
    });

    const deviceTime = request.params.deviceTime;
    const page = request.params.page || 1;
    const perPage = request.params.perPage || 5;

    let pagging = UTILS.pageCalc(page, perPage);

    PostQuery.containedIn('user', followingList);
    PostQuery.descending('time');
    PostQuery.include('user');
    PostQuery.select(['objectId', 'text', 'time', 'hash', 'type', 'user.name', 'user.objectId', 'user.picture']);
    if (deviceTime) {
        PostQuery.lessThan('createdAt', new Date(deviceTime));
    }
    if (pagging.offset) {
        PostQuery.skip(page.offset);
        PostQuery.limit(perPage);
    }


    let result = await PostQuery.find();
    const commentPostQuery = new Parse.Query('Interact');
    commentPostQuery.containedIn('postHash', result);
    commentPostQuery.exists('comment');
    commentPostQuery.include('user');
    commentPostQuery.ascending('time');
    commentPostQuery.select(['user.name', 'user.objectId', 'user.picture', 'comment', 'time', 'postHash']);

    const reactionPostQuery = new Parse.Query('Interact');
    reactionPostQuery.containedIn('postHash', result);
    reactionPostQuery.exists('reaction');
    reactionPostQuery.notEqualTo('reaction', 0);
    reactionPostQuery.include('user');
    reactionPostQuery.ascending('time');
    reactionPostQuery.select(['user.name', 'user.objectId', 'user.picture', 'reaction', 'time', 'postHash']);

    let promises = [];
    promises.push(reactionPostQuery.find());
    promises.push(commentPostQuery.find());

    return Promise.all(promises).then(Interacts => {
        let reactions = {};
        let comments = {};
        let myReaction = {};
        let addedUser = [];

        Interacts[0].forEach(interact => {
            let postId = interact.get('postHash').id;
            interact = interact.set('user', interact.get('user').toJSON());
            interact = interact.toJSON();

            if (interact.reaction == 0 || !interact.reaction) {
                addedUser[postId].push(interact.user.ObjectId);
                return;
            }

            if (!reactions[postId]) {
                reactions[postId] = [];
            }
            if (!addedUser[postId]) {
                addedUser[postId] = [];
            }

            if (!addedUser[postId].includes(interact.user.ObjectId) &&) {
                reactions[postId].push(interact);
                addedUser[postId].push(interact.user.ObjectId);
                if (!myReaction[postId] && request.user && interact.user.ObjectId == request.user.id) {
                    myReaction[postId] = interact.reaction;
                }
            }
        });

        Interacts[1].forEach(interact => {
            let postId = interact.get('postHash').id;
            interact = interact.set('user', interact.get('user').toJSON());
            interact = interact.toJSON();
            if (!comments[postId]) {
                comments[postId] = [];
            }
            comments[postId].push(interact);
        });

        result = result.map((Post) => {
            Post.set('user', Post.get('user').toJSON());
            Post = Post.toJSON();
            Post['reactions'] = reactions[Post.objectId];
            Post['comments'] = comments[Post.objectId];
            Post['myReaction'] = myReaction[Post.objectId];
            return Post;
        });

        return result;
    });
};

module.exports = TimelineModule;