const HyperExpress = require('hyper-express')
let airdropConfig = require('./airdrop-config.json')
const env = require('./env')
const { initDB, getKeys } = require('./db')

const webserver = new HyperExpress.Server()

async function main() {
  const timeKey = 'Airdrop tracker Server init'
  console.time(timeKey)
  webserver.use((_req, res, next) => {
    res.append('Access-Control-Allow-Origin', '*')
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    next()
  });

  initDB()

  let router = webserver

  /* 
  const subPath = env.API2_SUBPATH
  if (subPath) {
    router = new HyperExpress.Router()
    webserver.use('/' + subPath, router)
  }
  */

  router.get('/config', getAirdropConfig)
  router.get('/check/:keys', getAirdropInfo)
  router.get('/eigen/:key', getAirdropEigen)
  router.get('/eigens/:key', getAirdropEigens)

  webserver.listen(env.PORT)
    .then(() => {
      console.timeEnd(timeKey)
      console.log('Webserver started on port ' + env.PORT)
    })
    .catch((e) => console.log('Failed to start webserver on port ' + env.PORT, e))
}

main()

async function getAirdropConfig(_, res) {
  successResponse(res, airdropConfig)
}

async function getAirdropInfo(req, res) {
  try {
    const keys = req.params.keys.split(',')
    const data = await getKeys(keys)
    await getMeritAirdrop(keys, data)
    successResponse(res, data)
  } catch (e) {
    console.error(e)
    errorResponse(res, e)
  }
}

const angleMeritCampaignsListWETH = [
  "0x85b36549d9743068d2db487b6d30b8f0309f2e027710e9c9fcbdf9478e4da8ce", // r1 weth
  "0x11be178bb0d6930048f5d31c9d126e6b69270a52ce597676330bef8bf5c56792", // r2 weth
  "0xce1f81897ed003b821a59d99cd37d6bf8c5681a60fdcf0899aa4eaf1b8812ccf", // r3 weth
];

const angleMeritCampaignsListGHO = [
  "0xf9f30e2125f579215729eee4614148ece724a012631e633f3ddc1b874f8bff04", // r1 gho
  "0xa5b1ff1fd12a97f766aa45528f443f59a158d55fa2d9d989123fbeff5be9e49a", // r1 stkGHO
  "0x183713142cb5efd3f88362c6b77426fb5a2dd0dd94e5a7525323011182265d64", // r2 gho
  "0x54bb7655e2b25403f9e47b79c57966a6fb6fbde792161624572f7982742da326", // r2 stkGHO
  "0xb13201242264f73bfe6952b4e530585b403d3f83d103bd76105c8104be99f347", // r3 gho
  "0xed2693f82f6659dfde101b22e07f3648beb246509c5d902b74c7f67ac914a2a8", // r3 stkGHO
  "0x8667c4b4cdb311d8b14186a772bf193590513cb0d778966ef27508a2eabbaf97", // r4 GHO
  "0xc40e9a082cd5eb072457c4281d6de2825b37a7268a98d66b667c504f65180ed5", // r4 stkGHO
];

async function getMeritRewardsData(address) {
  function calculateTotalUnclaimed(data, campaignsList) {
    return Object.entries(data).reduce((total, [campaignId, subObject]) => {
        if (campaignsList.includes(campaignId)) {
            const subTotal = Object.values(subObject).reduce((subSum, item) => {
                return subSum + parseFloat(item.unclaimed);
            }, 0);
            return total + subTotal;
        }
        return total;
    }, 0);
  }

  const userCampaigns = await fetch(
    `https://api.angle.money/v3/rewards?user=${address.toLowerCase()}`
  )
    .then((r) => r.json())
    .then((r) => r["1"].campaignData);

  const unclaimedRewardsGho = calculateTotalUnclaimed(userCampaigns, angleMeritCampaignsListGHO);
  const unclaimedRewardsWeth = calculateTotalUnclaimed(userCampaigns, angleMeritCampaignsListWETH);
  const unclaimedRewards = {
    gho: unclaimedRewardsGho/10**18,
    weth: unclaimedRewardsWeth/10**18,
  };
  return unclaimedRewards;
}

async function getMeritAirdrop(addresses, data) {
  for (const address of addresses) {
    const merit = await getMeritRewardsData(address)
    console.log(merit)
    console.log(data)
    if(merit.weth > 0) {
      if(!data[address]) {
        data[address] = {};
      }
      data[address]["Aave Merit wETH"] = merit.weth;
    } 
    if(merit.gho > 0) {
      if(!data[address]) {
        data[address] = {};
      }
      data[address]["Aave Merit GHO"] = merit.gho;
    }
  }
  return data;
}

async function getAirdropEigen(req, res) {
  try {
    const address = req.params.key
    const data = await getEigenData(address)
    successResponse(res, data)
  } catch (e) {
    console.error(e)
    errorResponse(res, e)
  }
}

function getEigenData(address) {
  return fetch(
    `https://claims.eigenfoundation.org/clique-eigenlayer-api/campaign/eigenlayer/credentials?walletAddress=${address.toLowerCase()}`
  )
    .then((r) => r.json())
    .then((r) => r.data.pipelines)

}

async function getAirdropEigens(req, res) {
  try {
    const addresses = req.params.key.split(',')
    const response = {}

    for (const address of addresses) {
      response[address] = await getEigenData(address)
    }
    successResponse(res, response)
  } catch (e) {
    console.error(e)
    errorResponse(res, e)
  }
}

function successResponse(res, data, cacheMinutes = 30, {
  isJson = true,
  isPost = false,
} = {}) {
  res.setHeaders({
    "Expires": getTimeInFutureMinutes(cacheMinutes) // cache for 5 minutes
  })
  if (isPost)
    res.removeHeader("Expires")

  isJson ? res.json(data) : res.send(data)
}

function errorResponse(res, data = 'Internal server error', {
  statusCode = 400,
} = {}) {
  res.status(statusCode)
  res.send(data, true)
}

function getTimeInFutureMinutes(minutes) {
  const date = new Date();
  // add five minutes to the current time
  date.setMinutes(date.getMinutes() + minutes);
  return date.toUTCString()
}

//pulls config from github every 3 hours
setInterval(() => updateConfig, 1000 * 60 * 60 * 3)

function updateConfig() {
  fetch('https://raw.githubusercontent.com/DefiLlama/airdrop-checker/master/airdrop-config.json')
    .then(res => res.json())
    .then((data) => airdropConfig = data)
    .catch((e) => console.error('Failed to fetch airdrop config', e))
}
