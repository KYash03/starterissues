const { getRedisClient } = require("../redis");

async function scanAndDeleteKeys(pattern) {
  try {
    const redis = getRedisClient();
    let cursor = "0";
    let totalDeleted = 0;

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await redis.del(keys);
        totalDeleted += keys.length;
      }
    } while (cursor !== "0");

    return totalDeleted;
  } catch (error) {
    console.error("Error scanning/deleting keys:", error.message);
    return 0;
  }
}

async function invalidateApiCaches() {
  try {
    console.log("Invalidating API caches...");
    const redis = getRedisClient();

    await redis.del("api:metadata");

    await redis.del("api:languages");
    await redis.del("api:labels");
    await redis.del("api:repositories");

    const deletedCount = await scanAndDeleteKeys("api:issues:*");
    if (deletedCount > 0) {
      console.log(`Cleared ${deletedCount} issue cache entries`);
    }

    console.log("Cache invalidation complete");
    return true;
  } catch (error) {
    console.error("Cache invalidation error:", error.message);
    return false;
  }
}

module.exports = {
  invalidateApiCaches,
};
