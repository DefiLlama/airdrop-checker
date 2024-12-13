const csv = require('csv')
const fs = require('fs')
const { PromisePool } = require('@supercharge/promise-pool')

const { setKey, initDB } = require("./db")

// source: https://github.com/bodino/Fndair_backend/tree/main/Backend/Data
// source: https://github.com/rotki/data/tree/main/airdrops

const csvConfigs_done = [
  { file: 'omni.csv', decimals: 0, key: 'omni', addressField: 'address', valueField: 'amount' },
  { file: '1inch.csv', decimals: 0, key: '1inch', addressField: 'address', valueField: 'amount' },
  { file: 'convex_airdrop.csv', decimals: 0, key: 'convex', addressField: 'address', valueField: 'amount' },
  { file: 'cornichon_airdrop.csv', decimals: 0, key: 'cornichon', addressField: 'address', valueField: 'amount' },
  { file: 'cow_gnosis.csv', decimals: 18, key: 'cow0', addressField: 'address', valueField: 'amount' },
  { file: 'cow_mainnet.csv', decimals: 18, key: 'cow1', addressField: 'address', valueField: 'amount' },
  { file: 'curve_airdrop.csv', decimals: 0, key: 'curve', addressField: 'address', valueField: 'amount' },
  { file: 'degen2_season1.csv', decimals: 0, key: 'degen', addressField: 'address', valueField: 'amount' },
  { file: 'diva.csv', decimals: 0, key: 'diva', addressField: 'address', valueField: 'amount' },
  { file: 'ens.csv', decimals: 0, key: 'ens', addressField: 'address', valueField: 'amount' },
  { file: 'furucombo_airdrop.csv', decimals: 0, key: 'furucombo', addressField: 'address', valueField: 'amount' },
  { file: 'grain_iou.csv', decimals: 18, key: 'grain', addressField: 'address', valueField: 'amount' },
  { file: 'lido_airdrop.csv', decimals: 18, key: 'lido', addressField: 'address', valueField: 'amount' },
  { file: 'optimism_4.csv', decimals: 0, key: 'op', addressField: 'address', valueField: 'amount' },
  { file: 'psp.csv', decimals: 0, key: 'psp', addressField: 'address', valueField: 'amount' },
  // { file: 'shapeshift.csv', decimals: 0, key: 'shapeshift', addressField: 'address', valueField: 'amount' }, // too big, skipped it
  { file: 'shutter.csv', decimals: 0, key: 'shutter', addressField: 'address', valueField: 'amount' },
  { file: 'starknet.csv', decimals: 0, key: 'starknet', addressField: 'address', valueField: 'amount' },
  { file: 'saddle_finance.csv', decimals: 18, key: 'saddle', addressField: 'address', valueField: 'amount' },
  { file: 'tornado.csv', decimals: 18, key: 'tornado', addressField: 'address', valueField: 'amount' },
  { file: 'uniswap.csv', decimals: 0, key: 'uniswap', addressField: 'address', valueField: 'amount' },
  { file: 'Dydx.json', decimals: 0, key: 'dydx', },
  { file: 'EUL.json', decimals: 0, key: 'eul', },
  { file: 'Hop.json', decimals: 0, key: 'hop', },
  { file: 'kmno_allocation_v3.csv', decimals: 0, key: 'kamino', addressField: 'wallet', valueField: 'kmno_allocated' },
  { file: 'myso-airdrop-prod.json', decimals: 18, key: 'myso', },
  { file: 'jup_allocation_final.csv', decimals: 0, key: 'jup', addressField: 'pubkey', valueField: 'amount' },
  { file: 'ekubo.csv', decimals: 0, key: 'ekubo', },
  { file: 'zk.csv', decimals: 0, key: 'zk', addressField: 'userId', valueField: 'tokenAmount' },
  { file: 'debridge.csv', decimals: 0, key: 'db1', addressField: 'userId', valueField: 'dist1' },
  { file: 'debridge.csv', decimals: 0, key: 'db2', addressField: 'userId', valueField: 'dist2' },
  { file: 'op_airdrop_5_simple_list.csv', decimals: 0, key: 'op5', addressField: 'address', valueField: 'op_total' },
]

const csvConfigs = [
  { file: 'odos_retro_allocations1.csv', decimals: 0, key: 'odos1', addressField: 'User', valueField: 'Token Allocation' },
  { file: 'odos_retro_allocations2.csv', decimals: 0, key: 'odos1', },
]

async function addCsv() {
  initDB()

  for (const config of csvConfigs) {
    const csvData = await readCSV(config)
    let { decimals, key, addressField, valueField } = config

    if (!addressField) {
      console.info(key, 'assuming first column is address field, and the next is value')
      addressField = 0
      valueField = 1
    } else {
      const headRow = csvData.shift()
      addressField = headRow.indexOf(addressField)
      valueField = headRow.indexOf(valueField)
    }

    const timeKey = `${key} took`
    console.time(timeKey)
    console.info(`Adding ${csvData.length} records for`, key)
    let i = 0

    await PromisePool.withConcurrency(100)
      .for(csvData)
      .process(async (record, idx) => {
        if (idx % 10000 === 0) console.info('Processed', Number(100 * idx / csvData.length).toFixed(2), '%')
        const address = record[addressField]
        let value = record[valueField]
        if (!value) return;
        if (isNaN(+value)) {
          console.info('Invalid value for key', address, key, value)
          return;
        }
        if (decimals || decimals === 0) value = Math.round(value / 10 ** decimals)
        if (value < 1) return;
        /* 
          if (++i < 15)
            console.log('address', address, 'value', value)
          return;
           */
        await setKey(address, key, value)
      })

    console.timeEnd(timeKey)
  }
}

async function readCSV({ file, delimiter = ',', key }) {
  const isJson = file.endsWith('.json')
  const csvFolder = './csv-data/'
  if (!isJson) {
    const csvData = []
    return new Promise((resolve) =>
      fs.createReadStream(csvFolder + file)
        .pipe(csv.parse({ delimiter }))
        .on('data', row => csvData.push(row))
        .on('end', () => resolve(csvData)))
  }
  const data = require(csvFolder + file)

  switch (key) {
    case 'myso':
      return Object.entries(data).map(([address, { amount }]) => [address, amount])
  }


  if (typeof data.Data === 'object' && typeof data.Info === 'object') {
    return Object.entries(data.Data).map(([address, { tokens }]) => [address, tokens])
  }

  throw new Error('Not implemented!')
}

addCsv().catch(console.error).then(() => {
  console.log('done')
  process.exit(0)
})  