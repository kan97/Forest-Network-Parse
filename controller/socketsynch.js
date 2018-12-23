const asyncLock = require('async-lock');
let lockCurrBlock = new asyncLock();

const { RpcClient } = require('tendermint');
const client = RpcClient('wss://komodo.forest.network:443');

const { decode, hash } = require('../lib/tx/index');
const base32 = require('base32.js');
const { decodeFollowing, decodePost } = require('../lib/tx/v1');
const { calculateEnergy } = require('../helpers/calculate');

//---------------------------------------------------
const subscribeHandler = async (event) => {
    let currBlockAll = await blockSchema.find();
    let currBlockObj = currBlockAll.length > 0 ? currBlockAll[0] : false;

    if (!currBlockObj || typeof currBlockObj.currBlock != 'number') {
        console.log('Find nothing');
        return;
    }

    if (lockCurrBlock.isBusy()) {
        console.log('busy!!');
        return;
    }

    console.log('now run!!!!!');

    let blockSyncFunction = () => {
        // lay' cai so cua block moi trong event cho loop tu` currBlock object cho den do'
        // sau khi loop xong cap nhat gia tri cua currBlockObj.currBlock 
        return fetchAllBlocks(currBlockObj.currBlock, event.block.header.height).then(async (end) => {
            await blockSchema.findByIdAndUpdate(currBlockObj._id, { currBlock: event.block.header.height })
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
handleSingleBlock = function (res) {
    if (!res.block.data.txs) {
        return Promise.resolve(false);
    }
    
    for (let i = 0; i < res.block.data.txs.length; i++) {
        let base64Txs = Buffer.from(res.block.data.txs[0], 'base64');
        let txs = decode(base64Txs);
        let handleSingleTransaction = res.block.header.time;
        await handleSingleTransaction(txs, handleSingleTransaction);
    }

    return Promise.resolve(true);
};

//---------------------------------------------------
// Parse A Single Transaction
handleSingleTransaction = async function (txs, bandwidthTime) {
    let _TO_SAVE = [];

    let query = new Parse.Query('User');
    query.equalTo('publicKey', txs.account);
    let txsUser = await query.first();

    if (txsUser) {
        txsUser.set('sequence', txs.sequence);
        txsUser.set('bandwidthTime', new Date(bandwidthTime));
        _TO_SAVE.push(txsUser);
    }

    if (txs.operation == 'create_account') {
        let newUser = new Parse.User();
        newUser.set('publicKey', txs.params.address);
        newUser.set('sequence', 0);
        newUser.set('balance', 0);

        newUser.set('username', txs.params.address);
        newUser.set('password', '1');

        _TO_SAVE.push(newUser);
    }

    if (txs.operation == 'payment') {
        let amount = txs.params.amount;
        txsUser.increment('balance', amount * (-1));

        let recvUserQuery = new Parse.Query('User');
        recvUserQuery.equalTo('publicKey', txs.params.address);
        let recvUser = await recvUserQuery.first();
        if (recvUser) {
            recvUser.increment('balance', amount);
            _TO_SAVE.push(recvUser);
        }
    }

    if (txs.operation == 'post') {
        try {
            const content = decodePost(txs.params.content);
            const hashCode = hash(txs);

            let newPost = new Parse.Object('Post');
            newPost.set('type', content.type);
            newPost.set('text', content.text);
            newPost.set('hash', hashCode);
            
            _TO_SAVE.push(newPost);
        } catch (err) {
            console.log(err);
        }
    }

    if (txs.operation == 'update_acount' && txsUser) {
        const updateKey = txs.params.key;

        if (updateKey == 'name') {
            txsUser.set('name', txs.params.value.toString('utf-8'));
        }

        if (updateKey == 'picture') {
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
        ////////////
    }

    await Parse.Object.saveAll(_TO_SAVE, {useMasterKey: true});
    return Promise.resolve(true);
};

//---------------------------------------------------
client.subscribe({
    query: "tm.event='NewBlock'"
}, subscribeHandler).catch(e => console.log("ERR", e))

// cách tuần tự
async function fetchAllBlocks(start, end) {
    for (let index = start + 1; index <= end; index++) {
        let res = await client.block({
            height: index
        });

        await handleSingleBlock(res);
        /*
        if (res.block.data.txs) {
            for (let i  = 0; i < res.block.data.txs.length;)
            base64Txs = Buffer.from(res.block.data.txs[0], 'base64');
            txs = decode(base64Txs);

            switch (txs.operation) {
                case 'create_account':
                    await userSchema.updateOne({
                        public_key: txs.account
                    }, {
                            $set: {
                                sequence: txs.sequence,
                            }
                        })
                    user = new userSchema({
                        public_key: txs.params.address,
                    })
                    await user.save(function (err) {
                        if (err) {
                            console.log(err)
                        }
                    })
                    break;

                case 'payment':
                    await userSchema.updateOne({
                        public_key: txs.account
                    }, {
                            $set: {
                                sequence: txs.sequence,
                            },
                            $inc: {
                                balance: txs.params.amount * (-1),
                            }
                        })
                    await userSchema.updateOne({
                        public_key: txs.params.address
                    }, {
                            $inc: {
                                balance: txs.params.amount,
                            }
                        })
                    break;

                case 'post':
                    try {
                        content = decodePost(txs.params.content)
                        console.log(content);
                        post = new postSchema({
                            public_key: txs.account,
                            content: {
                                type: content.type,
                                text: content.text
                            }
                        })
                        await post.save(function (err) {
                            if (err) {
                                console.log(err)
                            }
                        })
                        await userSchema.updateOne({
                            public_key: txs.account
                        }, {
                                $set: {
                                    sequence: txs.sequence,
                                }
                            })
                    } catch (err) {
                        console.log(err);
                    }
                    break;

                case 'update_account':
                    switch (txs.params.key) {
                        case 'name':
                            await userSchema.updateOne({
                                public_key: txs.account
                            }, {
                                    $set: {
                                        sequence: txs.sequence,
                                        name: txs.params.value.toString('utf-8'),
                                    }
                                })
                            break;

                        case 'picture':
                            await userSchema.updateOne({
                                public_key: txs.account
                            }, {
                                    $set: {
                                        sequence: txs.sequence,
                                        picture: 'data:image/jpeg;base64,' + txs.params.value.toString('base64'),
                                    }
                                })
                            break;

                        case 'followings':
                            try {
                                addresses = decodeFollowing(txs.params.value).addresses
                                followings = []
                                for (let index = 0; index < addresses.length; index++) {
                                    followings.push(base32.encode(addresses[index]))
                                }
                                await userSchema.updateOne({
                                    public_key: txs.account
                                }, {
                                        $set: {
                                            sequence: txs.sequence,
                                            followings: followings,
                                        }
                                    })
                            } catch (error) {
                                console.log(error);
                            }
                            break;

                        default:
                            break;
                    }

                case 'interact':

                    break;

                default:
                    break;
            }
        }*/
    }

    return Promise.resolve(end);
};