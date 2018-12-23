const asyncLock = require('async-lock');
let lockCurrBlock = new asyncLock();

const { RpcClient } = require('tendermint');
const client = RpcClient('wss://komodo.forest.network:443');

const { decode } = require('../lib/tx/index');
const base32 = require('base32.js');
const { decodeFollowing, decodePost } = require('../lib/tx/v1');
const { calculateEnergy } = require('../helpers/calculate');

//---------------------------------------------------
const subscribeHandler = async (event) => {
  let currBlockAll = await blockSchema.find();
  let currBlockObj = currBlockAll.length > 0 ? currBlockAll[0] : false;

  if (!currBlockObj || typeof currBlockObj.currBlock != 'Number') {
    console.log('Find nothing');
    return;
  }

  if (lockCurrBlock.isBusy()) {
    return;
  }

  let blockSyncFunction = () => {
    
    return Promise.resolve(true);
  };

  lockCurrBlock.acquire('Current-Block-Mutex', blockSyncFunction).then(function (result) {
    return result;
  });
};
//---------------------------------------------------

client.subscribe({
  query: "tm.event='NewBlock'"
}, subscribeHandler).catch(e => console.log("ERR", e))

// cách tuần tự
async function fetchAllBlocks() {
  for (let index = 11001; index < 16075; index++) {
    res = await client.block({
      height: index
    });
    if (res.block.data.txs) {
      console.log(index);
      base64Txs = Buffer.from(res.block.data.txs[0], 'base64')
      txs = decode(base64Txs)
      account = await userSchema.findOne({
        public_key: txs.account
      })
      currentBlockTime = res.block_meta.header.time
      await userSchema.updateOne({
        public_key: txs.account
      }, {
        energy: calculateEnergy(account, currentBlockTime, base64Txs.length),
        bandwidthTime: currentBlockTime,
      })

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
          // await userSchema.updateOne({
          //   public_key: txs.account
          // }, {
          //   $set: {
          //     sequence: txs.sequence,
          //   },
          //   $inc: {
          //     balance: txs.params.amount * (-1),
          //   }
          // })
          // await userSchema.updateOne({
          //   public_key: txs.params.address
          // }, {
          //   $inc: {
          //     balance: txs.params.amount,
          //   }
          // })
          break;

        case 'post':
          // try {
          //   content = decodePost(txs.params.content)
          //   console.log(content);
          //   post = new postSchema({
          //     public_key: txs.account,
          //     content: {
          //       type: content.type,
          //       text: content.text
          //     }
          //   })
          //   await post.save(function (err) {
          //     if (err) {
          //       console.log(err)
          //     }
          //   })
          //   await userSchema.updateOne({
          //     public_key: txs.account
          //   }, {
          //     $set: {
          //       sequence: txs.sequence,
          //     }
          //   })
          // } catch (err) {
          //   console.log(err);
          // }
          break;

        case 'update_account':
          switch (txs.params.key) {
            // case 'name':
            //   await userSchema.updateOne({
            //     public_key: txs.account
            //   }, {
            //     $set: {
            //       sequence: txs.sequence,
            //       name: txs.params.value.toString('utf-8'),
            //     }
            //   })
            //   break;

            // case 'picture':
            //   await userSchema.updateOne({
            //     public_key: txs.account
            //   }, {
            //     $set: {
            //       sequence: txs.sequence,
            //       picture: 'data:image/jpeg;base64,' + txs.params.value.toString('base64'),
            //     }
            //   })
            //   break;

            case 'followings':
              // try {
              //   addresses = decodeFollowing(txs.params.value).addresses
              //   followings = []
              //   for (let index = 0; index < addresses.length; index++) {
              //     followings.push(base32.encode(addresses[index]))
              //   }
              //   await userSchema.updateOne({
              //     public_key: txs.account
              //   }, {
              //     $set: {
              //       sequence: txs.sequence,
              //       followings: followings,
              //     }
              //   })
              // } catch (error) {
              //   console.log(error);
              // }
              break;

            default:
              break;
          }

        case 'interact':

          break;

        default:
          break;
      }
    }
  }
}


/* GET home page. */
router.get('/', function (req, res, next) {
  fetchAllBlocks()
  res.render('index', {
    title: 'Express'
  });
});

module.exports = router;