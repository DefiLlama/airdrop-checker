const HyperExpress = require('hyper-express')
const airdropConfig = require('./airdrop-config.json')
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

  const subPath = env.API2_SUBPATH
  let router = webserver

  if (subPath) {
    router = new HyperExpress.Router()
    webserver.use('/' + subPath, router)
  }

  router.get('/config', getAirdropConfig)
  router.get('/check/:keys', getAirdropInfo)

  webserver.listen(env.PORT)
    .then(() => {
      console.timeEnd(timeKey)
      console.log('Webserver started on port ' + env.PORT)
      process.send('ready')
    })
    .catch((e) => console.log('Failed to start webserver on port ' + env.PORT, e))
}


process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  console.log('Shutting down gracefully...');
  setTimeout(() => process.exit(0), 1000); // wait 5 seconds before forcing shutdown
  webserver.close(() => {
    console.log('Server has been shut down gracefully');
    process.exit(0);
  })
}

main()

async function getAirdropConfig(_, res) {
  successResponse(res, airdropConfig)
}

async function getAirdropInfo(req, res) {
  try {
    const keys = req.params.keys.split(',')
    const data = await getKeys(keys)
    successResponse(res, data)
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