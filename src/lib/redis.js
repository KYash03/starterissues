const { Redis } = require("ioredis");

let redisClient;

function getRedisClient() {
  if (!redisClient) {
    if (!process.env.REDIS_CONNECTION_STRING) {
      throw new Error("REDIS_CONNECTION_STRING is required but not configured");
    }

    redisClient = new Redis(process.env.REDIS_CONNECTION_STRING, {
      connectTimeout: 2000,
      maxRetriesPerRequest: 3,
    });

    redisClient.on("error", (err) => {
      console.error("Redis connection error:", err);
    });
  }

  return redisClient;
}

async function shutdownRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log("Redis connection closed gracefully");
    } catch (err) {
      console.error("Error closing Redis connection:", err);
      redisClient.disconnect();
    } finally {
      redisClient = null;
    }
  }
}

["SIGTERM", "SIGINT", "beforeExit"].forEach((signal) => {
  process.on(signal, async () => {
    console.log(`${signal} received, closing Redis connection...`);
    await shutdownRedis();
  });
});

module.exports = { getRedisClient };
