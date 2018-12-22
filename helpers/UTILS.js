'use strict';
const _ = require('lodash');
const asyncLock = require('async-lock');
let miniParse = require('./miniParse');
let lock = new asyncLock();

const UTILS = {};

UTILS.createPointerTo = (ClassName, fieldName, fieldValue) => {
    const Query = new Parse.Query(ClassName);
    Query.equalTo(fieldName, fieldValue);
    //console.log(Query);

    return Query.first().then((result) => {

        if (result) {
            const ParseObject = Parse.Object.extend(ClassName);
            return ParseObject.createWithoutData(result.id);
        } else {
            let CreatedObject = new Parse.Object(ClassName);
            CreatedObject.set(fieldName, fieldValue);
            return CreatedObject.save().then((realObject) => {
                return realObject.createWithoutData(result.id);
            });
        }
    });
};

UTILS.createBlankPointerTo = (ClassName, objectId) => {
    const ParseObject = Parse.Object.extend(ClassName);
    return ParseObject.createWithoutData(objectId);
};

UTILS.pageCalc = (pageNumber, perPage) => {
    if (!pageNumber)
        return null;
    perPage = perPage || 10;
    const offset = (pageNumber - 1) * perPage;
    return { offset, limit: perPage };
};

UTILS.buildPointerQuery = (className = 'Product', selectedField = []) => {
    const query = new Parse.Query(className);

    if (!_.isEmpty(selectedField)) {
        query.select(selectedField);
    }

    return query;
};

UTILS.parseObjectArray2JSON = (parseObjectArray = []) => {
    return parseObjectArray.map((indexVal) => {
        return indexVal.toJSON();
    });
};

UTILS.createRegex = (inputString = new String(''), option = new String('')) => {
    let regedKeep = inputString.replace(/[.*+?^${}()|[\]\\]/gi, "\\$&");
    let rededTrim = inputString.replace(/[.*+?^${}()|[\]\\]/gi, "");
    const reged = inputString + '|' + rededTrim + '|' + regedKeep;

    return new RegExp(reged, 'gi');
};

UTILS.generateBarcode = () => {
    return lock.acquire('generateBarcode', function() {
        let promise = new Promise((resolve) => {
            setTimeout(() => {
                const getNow = new Date().getTime().toString();
                resolve(getNow);
            }, 1);
        });

        return promise;
    }).then(function(result) {
        return result;
    });
};

UTILS.isExistedNotic = (ParseNotic) => {
    const query = new Parse.Query('NotificationDetail');

    const subQueryNotic = UTILS.buildPointerQuery('Notification');
    subQueryNotic.equalTo('objectId', ParseNotic.id);

    query.matchesQuery('notification', subQueryNotic);

    return query.first().then((result) => {
        if (result) {
            return true;
        }
        else {
            return false;
        }
    });
};

UTILS.isExistedCoupon = (Coupon) => {
    const query = new Parse.Query('CouponDetail');

    const subQuery = UTILS.buildPointerQuery('Coupon');
    subQuery.equalTo('objectId', Coupon.id);

    query.matchesQuery('coupon', subQuery);

    return query.first().then((result) => {
        if (result) {
            return true;
        }
        else {
            return false;
        }
    });
};

UTILS.fetchObject = (ClassName, fieldName, fieldValue) => {
    const Query = new Parse.Query(ClassName);
    Query.equalTo(fieldName, fieldValue);

    return Query.first({useMasterKey: true});
};

UTILS.slicePhoneNumber = (phoneNumber) => {
    const length = phoneNumber.length;
    return phoneNumber.substring(length - 6, length);
};

UTILS.createMiniParse = () => {
    return miniParse.init();
};


module.exports = UTILS;