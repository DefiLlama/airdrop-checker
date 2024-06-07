const { PromisePool } = require('@supercharge/promise-pool')

const angleMeritCampaignsListWETH = [
  "0x85b36549d9743068d2db487b6d30b8f0309f2e027710e9c9fcbdf9478e4da8ce", // round 1 weth
  "0x11be178bb0d6930048f5d31c9d126e6b69270a52ce597676330bef8bf5c56792", // round 2 weth
  "0xce1f81897ed003b821a59d99cd37d6bf8c5681a60fdcf0899aa4eaf1b8812ccf", // round 3 weth
];

const angleMeritCampaignsListGHO = [
  "0xf9f30e2125f579215729eee4614148ece724a012631e633f3ddc1b874f8bff04", // round 1 gho
  "0xa5b1ff1fd12a97f766aa45528f443f59a158d55fa2d9d989123fbeff5be9e49a", // round 1 stkGHO
  "0x183713142cb5efd3f88362c6b77426fb5a2dd0dd94e5a7525323011182265d64", // round 2 gho
  "0x54bb7655e2b25403f9e47b79c57966a6fb6fbde792161624572f7982742da326", // round 2 stkGHO
  "0xb13201242264f73bfe6952b4e530585b403d3f83d103bd76105c8104be99f347", // round 3 gho
  "0xed2693f82f6659dfde101b22e07f3648beb246509c5d902b74c7f67ac914a2a8", // round 3 stkGHO
  "0x8667c4b4cdb311d8b14186a772bf193590513cb0d778966ef27508a2eabbaf97", // round 4 GHO
  "0xc40e9a082cd5eb072457c4281d6de2825b37a7268a98d66b667c504f65180ed5", // round 4 stkGHO
];


async function addMeritRewards() {
  const eligibleAddressesWETH = await fetchMeritRewards(angleMeritCampaignsListWETH);
  const eligibleAddressesGHO = await fetchMeritRewards(angleMeritCampaignsListGHO);

  const eligibleAddressesWETHArray = Array.from(eligibleAddressesWETH);
  const eligibleAddressesGHOArray = Array.from(eligibleAddressesGHO);

  await uploadMeritRewardsToDB(eligibleAddressesWETHArray, "Aave Merit wETH");
  await uploadMeritRewardsToDB(eligibleAddressesGHOArray, "Aave Merit GHO");
}

async function uploadMeritRewardsToDB(eligibleAddressesArray, key) {
  await PromisePool.withConcurrency(100)
  .for(eligibleAddressesArray)
  .process(async (record, idx) => {
    if (idx % 10000 === 0) console.info('Processed', Number(100 * idx / eligibleAddressesArray.length).toFixed(2), '%')
    await setKey(record[0], key, record[1])
  })
}

async function fetchMeritRewards(campaignIdsList) {
  const eligibleAddresses = new Map([]);
  for (campaignId of campaignIdsList) {
    let addressesEligible;
    try {
      addressesEligible = await fetch(
        `https://api.merkl.xyz/v3/campaignUnclaimed?chainId=1&campaignId=${campaignId}`
      )
        .then((r) => r.json());
    } catch (e) {
      throw new Error(`Failed to fetch data from Merkl API: ${e}`);
    }
    if(!addressesEligible) {
      throw new Error("Data returned by Merkl API undefined");
    }
    if(addressesEligible.length == 0) {
      throw new Error("Data returned by Merkl API empty");
    }
    console.log(addressesEligible);
    for (const user of addressesEligible) {
      if(user.unclaimed > 0) {
        const userCurrentbalance = eligibleAddresses.get(user.recipient);
        if(userCurrentbalance) {
          eligibleAddresses.set(user.recipient, userCurrentbalance + user.unclaimed/10**18);
        } else {
          eligibleAddresses.set(user.recipient, user.unclaimed/10**18);
        }
      }
    }
  }
  return eligibleAddresses;
}

addMeritRewards()