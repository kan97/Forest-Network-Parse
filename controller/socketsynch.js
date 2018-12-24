const asyncLock = require('async-lock');
let lockCurrBlock = new asyncLock();

const { RpcClient } = require('tendermint');
const client = RpcClient('wss://komodo.forest.network:443');

const { decode, hash } = require('../lib/tx/index');
const base32 = require('base32.js');
const { decodeFollowing } = require('../lib/tx/v1');
const { calculateEnergy } = require('../helpers/calculate');

//---------------------------------------------------
const subscribeHandler = async (event) => {
    let blockQuery = new Parse.Query('Block');
    blockQuery.exists('currBlock');
    let currBlockAll = await blockQuery.first();
    let currBlockObj = currBlockAll.has('currBlock') ? currBlockAll.get('currBlock') : false;
    console.log(currBlockObj);
    if (typeof currBlockObj != 'number') {
        console.log('Find nothing');
        return;
    }
    console.log(currBlockObj);
    if (lockCurrBlock.isBusy()) {
        console.log('busy!!');
        return;
    }

    console.log('now run!!!!!');

    let blockSyncFunction = () => {
        return fetchAllBlocks(currBlockObj, Number(event.block.header.height)).then(async (end) => {
            return 'Done';
        });
    };

    lockCurrBlock.acquire('Current-Block-Mutex', blockSyncFunction).then(function (result) {
        console.log('done|||||||||||||||||||||||||||||||||||||||');

    }).catch((err) => {
        console.log(err);
    });
};
//---------------------------------------------------
// Parse A Single Block
handleSingleBlock = async function (res, currBlock) {
    if (!res.block.data.txs) {
        console.log('[!!] - No Transaction!!!!');
        return Promise.resolve(false);
    }
    
    for (let i = 0; i < res.block.data.txs.length; i++) {
        console.log('   >  transaction ' + i);
        let base64Txs = Buffer.from(res.block.data.txs[0], 'base64');
        let txs = decode(base64Txs);
        let bandwidthTime = res.block.header.time;
        await handleSingleTransaction(txs, bandwidthTime);
    }

    let blockQuery = new Parse.Query('Block');
    blockQuery.exists('currBlock');
    block = await blockQuery.first();
    block.set('currBlock', currBlock);
    await block.save();

    return Promise.resolve(true);
};

//---------------------------------------------------
// Parse A Single Transaction
handleSingleTransaction = async function (txs, bandwidthTime) {
    let _TO_SAVE = [];
    console.log('   >  >  bandwidthTime ' + bandwidthTime);

    let query = new Parse.Query('User');
    query.equalTo('publicKey', txs.account);
    let txsUser = await query.first();

    if (txsUser) {
        console.log('   >  >  account ' + txs.account);
        txsUser.set('sequence', txs.sequence);
        txsUser.set('bandwidthTime', new Date(bandwidthTime));
        _TO_SAVE.push(txsUser);
    } else {
        console.log('[!!!] => ' + txs.account + ' not found in db');
    }

    if (txs.operation == 'create_account') {
        console.log('   >  >  > create_account');
        let newUser = new Parse.User();
        newUser.set('publicKey', txs.params.address);
        newUser.set('sequence', 0);
        newUser.set('balance', 0);

        newUser.set('username', txs.params.address);
        newUser.set('password', '1');

        _TO_SAVE.push(newUser);
    }

    if (txs.operation == 'payment') {
        console.log('   >  >  > payment');
        let amount = txs.params.amount;
        if (txsUser) {
            console.log('   >  >  >  >  ' + txsUser + 'decrease: ' + amount);
            txsUser.increment('balance', amount * (-1));
        }

        let recvUserQuery = new Parse.Query('User');
        recvUserQuery.equalTo('publicKey', txs.params.address);
        let recvUser = await recvUserQuery.first();
        if (recvUser) {
            console.log('   >  >  >  >  ' + recvUser + 'decrease: ' + amount);
            recvUser.increment('balance', amount);
            _TO_SAVE.push(recvUser);
        }
    }

    if (txs.operation == 'post') {
        console.log('   >  >  > post');
        try {
            const hashCode = hash(txs);
            console.log(hashCode);
            console.log(content);

            let newPost = new Parse.Object('Post');
            newPost.set('type', txs.params.content.type);
            newPost.set('text', txs.params.content.text);
            newPost.set('hash', hashCode);
            
            _TO_SAVE.push(newPost);
        } catch (err) {
            console.log(err);
        }
    }
    console.log(txs);
    console.log(txsUser);
    if (txs.operation == 'update_account' && txsUser) {
        console.log('   >  >  > update_account');
        const updateKey = txs.params.key;

        if (updateKey == 'name') {
            console.log('   >  >  >  > NAME');
            txsUser.set('name', txs.params.value.toString('utf-8'));
        }

        if (updateKey == 'picture') {
            console.log('   >  >  >  > AVATAR');
            txsUser.set('picture', 'data:image/jpeg;base64,' + txs.params.value.toString('base64'));
        }

        if (updateKey == 'followings') {
            try {
                addresses = decodeFollowing(txs.params.value).addresses
                followings = []
                for (let index = 0; index < addresses.length; index++) {
                    followings.push(base32.encode(addresses[index]))
                }

                txsUser.set('followings', followings);
            } catch (error) {
                console.log(error);
            }
        }
    }

    if (txs.operation == 'interact') {
        console.log('   >  >  > interact');
        try {
            let newInteract = new Parse.Object('Interact');
            newInteract.set('postHash', txs.params.object)
            if (txs.params.content.type == 1) {
                newInteract.set('comment', txs.params.content.text)
            }
            if (txs.params.content.type == 2) {
                newInteract.set('reaction', txs.params.content.reaction)
            }

            _TO_SAVE.push(newPost);
        } catch (err) {
            console.log(err);
        }
    }

    await Parse.Object.saveAll(_TO_SAVE, {useMasterKey: true});
    return Promise.resolve(true);
};

//---------------------------------------------------
//=====================[main]========================
let moduleExporter = {};
moduleExporter.init = function() {
    console.log('=====================[START-SYNCH]========================');
    client.subscribe({
        query: "tm.event='NewBlock'"
    }, subscribeHandler).catch(e => console.log("ERR", e));
};

//-----------------------------------------------------
async function fetchAllBlocks(start, end) {
    console.log('START FETCH FROM ' + start + ' to ' + end);
    for (let index = start + 1; index <= end; index++) {
        let res = await client.block({
            height: index
        });

        console.log('[i] - NOW PARSING INDEX ', index);

        await handleSingleBlock(res, index);
    }

    return Promise.resolve(end);
};

module.exports = moduleExporter;