
const csv = require('csv');
const fs = require('fs');

let oldAddressSet = new Set();
let newAddressSet = new Set();

const oldFile = 'odos_retro_allocations.csv';
const newFile = 'final_odos_retro_allocations.csv';


async function readCSV({ file, delimiter = ',', key }) {
  const csvFolder = __dirname + '/../csv-data/'
  const csvData = []
  return new Promise((resolve) =>
    fs.createReadStream(csvFolder + file)
      .pipe(csv.parse({ delimiter }))
      .on('data', row => csvData.push(row))
      .on('end', () => resolve(csvData)))
}


async function findMissingAddresses() {
  const oldData = await readCSV({ file: oldFile, key: 'address' });
  const newData = await readCSV({ file: newFile, key: 'address' });

  oldData.forEach(row => oldAddressSet.add(row[0].toLowerCase()));
  newData.forEach(row => newAddressSet.add(row[0].toLowerCase()));

  const missingAddresses = [...oldAddressSet].filter(address => !newAddressSet.has(address));
  console.log('Addresses in new file but missing from old file:', missingAddresses);
}

findMissingAddresses();