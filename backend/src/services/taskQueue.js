const createRedisClient = require("../config/redis");

const redis = createRedisClient();
const queueName = process.env.REDIS_QUEUE_NAME || "tasks_queue";

async function enqueueTask(payload) {
  await redis.lpush(queueName, JSON.stringify(payload));
}

module.exports = { enqueueTask };
