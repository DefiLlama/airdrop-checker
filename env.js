require("dotenv").config();

let auth = process.env.AIRDROP_REDIS_AUTH?.split(':') ?? []

module.exports = {
  PORT: process.env.PORT ?? 5001,
  API2_SUBPATH: process.env.API2_SUBPATH ?? 'test',
  REDIS_PORT: auth.REDIS_PORT ?? 6379,
  REDIS_HOST: auth.REDIS_HOST ?? 'localhost',
  REDIS_PASSWORD: auth.REDIS_PASSWORD,
};