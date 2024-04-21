require("dotenv").config();

let auth = process.env.AIRDROP_REDIS_AUTH?.split(':') ?? []

module.exports = {
  PORT: process.env.PORT ?? 5001,
  API2_SUBPATH: process.env.API2_SUBPATH ?? 'prod',
  REDIS_HOST: auth[0] ?? 'localhost',
  REDIS_PORT: auth[1] ?? 6379,
  REDIS_PASSWORD: auth[2],
};