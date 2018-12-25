'use strict';
const _ = require('lodash');
const UTILS = require('../../helpers/UTILS');

const TimelineModule = {};

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

module.exports = TimelineModule;