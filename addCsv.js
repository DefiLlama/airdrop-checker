const csv = require('csv')
const fs = require('fs')
const { PromisePool } = require('@supercharge/promise-pool')

const { setKey, initDB } = require("./db")

const csvConfigs = [
  { file: 'omni.csv', decimals: 0, key: 'omni', addressField: 'address', valueField: 'amount' },
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

    console.info(`Adding ${csvData.length} records for`, key)

    await PromisePool.withConcurrency(100)
      .for(csvData)
      .process(async (record) => {
        const address = record[addressField]
        let value = record[valueField]
        if (isNaN(+value)) {
          console.info('Invalid value for key', address, key, value)
          return;
        }
        if (decimals || decimals === 0) value = Math.round(value / 10 ** decimals)
        await setKey(address, key, value)
      })

  }
}

async function readCSV({ file, delimiter = ',' }) {
  const csvFolder = './csv-data/'
  const csvData = []
  return new Promise((resolve) =>
    fs.createReadStream(csvFolder + file)
      .pipe(csv.parse({ delimiter }))
      .on('data', row => csvData.push(row))
      .on('end', () => resolve(csvData)))
}

addCsv().catch(console.error).then(() => {
  console.log('done')
  process.exit(0)
})  