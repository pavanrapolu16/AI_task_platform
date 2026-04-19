const Redis = require("ioredis");

function createRedisClient() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || "redis",
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: null
  });

  redis.on("connect", () => {
    console.log("Backend connected to Redis");
  });

  redis.on("error", (err) => {
    console.error("Redis error:", err.message);
  });

  return redis;
}

module.exports = createRedisClient;
