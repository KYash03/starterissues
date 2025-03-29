import { getRedisClient } from "../redis";
import crypto from "crypto";

const rateLimitConfigs = {
  default: { points: 25, duration: 60 },
  issues: { points: 10, duration: 60 },
  metadata: { points: 50, duration: 60 },
  "filter-options": { points: 15, duration: 60 },
};

const globalRateLimit = { points: 50, duration: 60 };

function getClientIp(request) {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp && /^[0-9a-f.:]+$/i.test(cfIp)) {
    return cfIp;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (/^[0-9a-f.:]+$/i.test(firstIp)) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp && /^[0-9a-f.:]+$/i.test(realIp)) {
    return realIp;
  }

  return request.ip || "127.0.0.1";
}

export async function rateLimit(request, route = "default") {
  const redis = getRedisClient();
  const config = rateLimitConfigs[route] || rateLimitConfigs.default;

  const SECRET_SALT = process.env.RATE_LIMIT_SALT;

  const ip = getClientIp(request);

  const userAgentInfo = request.headers.get("user-agent") || "";
  const userAgentHash = crypto
    .createHash("md5")
    .update(userAgentInfo + SECRET_SALT)
    .digest("hex")
    .substring(0, 8);

  const routeKey = `ratelimit:${route}:${ip}:${userAgentHash.substring(0, 4)}`;

  const globalKey = `ratelimit:global:${ip}`;

  try {
    const multi = redis.multi();

    multi.incr(routeKey);
    multi.expire(routeKey, config.duration);
    multi.incr(globalKey);
    multi.expire(globalKey, globalRateLimit.duration);
    multi.ttl(routeKey);
    multi.ttl(globalKey);

    const results = await multi.exec();

    if (!results) {
      throw new Error("Redis transaction failed");
    }

    const routeCount = results[0][1];
    const globalCount = results[2][1];
    const routeTtl = results[4][1];
    const globalTtl = results[5][1];

    if (routeCount > config.points || globalCount > globalRateLimit.points) {
      const isRouteExceeded = routeCount > config.points;
      const ttl = isRouteExceeded ? routeTtl : globalTtl;
      const limit = isRouteExceeded ? config.points : globalRateLimit.points;

      return {
        success: false,
        status: 429,
        message: "Too many requests, please try again.",
        headers: {
          "Retry-After": ttl.toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(Date.now() + ttl * 1000).toISOString(),
        },
      };
    }

    return {
      success: true,
      headers: {
        "X-RateLimit-Limit": config.points.toString(),
        "X-RateLimit-Remaining": (config.points - routeCount).toString(),
        "X-RateLimit-Reset": new Date(
          Date.now() + routeTtl * 1000
        ).toISOString(),
        "X-Global-RateLimit-Remaining": (
          globalRateLimit.points - globalCount
        ).toString(),
      },
    };
  } catch (error) {
    console.error("Redis rate limit error:", error);

    return {
      success: false,
      status: 429,
      message: "Rate limiting service error - requests temporarily limited.",
      headers: {
        "Retry-After": "30",
        "X-RateLimit-Limit": "0",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": new Date(Date.now() + 30000).toISOString(),
      },
    };
  }
}
