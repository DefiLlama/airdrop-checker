To add new airdrop data

  - Add the csv/json data in `csv-data` folder (create folder if missing)
  - add new entry in `airdrop-config.json` file
  - add new entry in `addCsv.js` file (this links the file and entry in airdrop-config.json file based on key)
  - if it is json/custom code is needed, add it in `readCSV` function
  - set redis config in your env `REDIS_HOST`, `REDIS_PORT`, `REDIS_PORT`     
  - run `node addCsv.js` to update te database
  - (not sure if needed) restart airdrop checker service
  - commit changes.