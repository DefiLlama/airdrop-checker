const Redis = require('ioredis')
const env = require('./env')

let redis

function initDB() {
  if (!redis)
    redis = new Redis({
      port: env.REDIS_PORT,
      host: env.REDIS_HOST,
      password: env.REDIS_PASSWORD
    })
}

async function getKeys(keys) {
  const res = await redis.mget(keys.map(sanitizedKey))
  return Object.fromEntries(res.map((value, i) => [keys[i], JSON.parse(value)]))
}

async function setKey(address, key, value) {
  if (isNaN(+value)) {
    console.info('Invalid value for key', address, key, value)
    return;
  }

  address = sanitizedKey(address)

  // get the current data
  let data = JSON.parse(await redis.get(address)) ?? {}
  data[key] = value

  return redis.set(address, JSON.stringify(data))
}


function sanitizedKey(key) {
  return key.toLowerCase().trim()
}

module.exports = { initDB, getKeys, setKey, }