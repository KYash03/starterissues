const { NextResponse } = require("next/server");
const { query, getMetadata } = require("../services/db-service");
const { buildIssuesQuery } = require("./routes");
const { getRedisClient } = require("../redis");

const MAX_ISSUES_LIMIT = 10;

const CACHE_TTL = {
  ISSUES: 300,
  METADATA: 60,
  FILTER_OPTIONS: 1800,
};

async function withCache(key, ttl, dataFetcher) {
  try {
    const redis = getRedisClient();

    const cachedData = await redis.get(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const data = await dataFetcher();

    await redis.set(key, JSON.stringify(data), "EX", ttl);

    return data;
  } catch (error) {
    console.error("Redis cache error:", error);
    return await dataFetcher();
  }
}

function generateIssuesKey(params) {
  const queryParams = { ...params };

  [
    "languages",
    "excludedLanguages",
    "labels",
    "excludedLabels",
    "repositories",
    "excludedRepositories",
    "bookmarkIds",
  ].forEach((param) => {
    if (Array.isArray(queryParams[param])) {
      queryParams[param].sort();
    }
  });

  return `api:issues:${JSON.stringify(queryParams)}`;
}

const combineEndpoints = (endpoints) => {
  return async () => {
    const results = {};
    for (const [key, handler] of Object.entries(endpoints)) {
      const response = await handler();
      const data = await response.json();
      results[key] = data[key] || [];
    }
    return NextResponse.json(results);
  };
};

function createCachedEndpoint(keyPrefix, ttl, dataFetcher) {
  return async () => {
    const data = await withCache(keyPrefix, ttl, dataFetcher);
    return NextResponse.json(data);
  };
}

const createListEndpointHandler = ({ queryStr, resultKey, mapRow }) => {
  const fetchData = async () => {
    const result = await query(queryStr);
    const mappedResults = result.rows.map(mapRow);
    return { [resultKey]: mappedResults };
  };

  return createCachedEndpoint(
    `api:${resultKey}`,
    CACHE_TTL.FILTER_OPTIONS,
    fetchData
  );
};

const listEndpoints = {
  languages: {
    queryStr: `SELECT DISTINCT unnest(languages) as language
               FROM repositories
               WHERE languages IS NOT NULL
               ORDER BY language`,
    resultKey: "languages",
    mapRow: (row) => row.language,
  },
  labels: {
    queryStr: `SELECT DISTINCT name
               FROM labels
               WHERE name IS NOT NULL
               ORDER BY name`,
    resultKey: "labels",
    mapRow: (row) => row.name,
  },
  repositories: {
    queryStr: `SELECT DISTINCT full_name
               FROM repositories
               WHERE full_name IS NOT NULL
               ORDER BY full_name`,
    resultKey: "repositories",
    mapRow: (row) => row.full_name,
  },
};

const getLanguages = createListEndpointHandler(listEndpoints.languages);
const getLabels = createListEndpointHandler(listEndpoints.labels);
const getRepositories = createListEndpointHandler(listEndpoints.repositories);

const getMetadataEndpoint = (() => {
  const fetchMetadata = async () => {
    const metadata = await getMetadata();
    return { metadata };
  };

  return createCachedEndpoint(
    "api:metadata",
    CACHE_TTL.METADATA,
    fetchMetadata
  );
})();

const getIssues = async (request) => {
  const { searchParams } = new URL(request.url);
  const params = {
    languages: searchParams.getAll("languages[]"),
    excludedLanguages: searchParams.getAll("excludedLanguages[]"),
    labels: searchParams.getAll("labels[]"),
    excludedLabels: searchParams.getAll("excludedLabels[]"),
    repositories: searchParams.getAll("repositories[]"),
    excludedRepositories: searchParams.getAll("excludedRepositories[]"),
    sortBy: searchParams.get("sortBy") || "updated_at",
    sortOrder: searchParams.get("sortOrder") || "desc",
    limit: Math.min(
      parseInt(searchParams.get("limit") || "10"),
      MAX_ISSUES_LIMIT
    ),
    noAssignee: searchParams.get("noAssignee") === "true",
    minStars: parseInt(searchParams.get("minStars") || "500"),
    maxStars: parseInt(searchParams.get("maxStars") || "1000000"),
    bookmarkIds: searchParams.getAll("bookmarkIds[]"),
    cursor: searchParams.get("cursor") || null,
    cursorId: searchParams.get("cursorId")
      ? parseInt(searchParams.get("cursorId"))
      : null,
  };

  const shouldCache = params.bookmarkIds.length === 0;

  const fetchIssuesData = async () => {
    const { sql, params: queryParams } = buildIssuesQuery(params);
    const result = await query(sql, queryParams);

    const countQuery = buildIssuesQuery({ ...params, forCount: true });
    const countResult = await query(countQuery.sql, countQuery.params);

    const total = parseInt(countResult.rows[0].total);

    const lastItem =
      result.rows.length > 0 ? result.rows[result.rows.length - 1] : null;

    const nextCursor = lastItem
      ? {
          cursor:
            lastItem[
              params.sortBy === "stargazers_count"
                ? "stargazers_count"
                : params.sortBy
            ],
          cursorId: lastItem.id,
        }
      : null;

    return {
      issues: result.rows,
      pagination: {
        total,
        limit: params.limit,
        hasMore:
          result.rows.length === params.limit && result.rows.length < total,
        nextCursor,
      },
    };
  };

  let response;
  if (shouldCache) {
    const cacheKey = generateIssuesKey(params);
    response = await withCache(cacheKey, CACHE_TTL.ISSUES, fetchIssuesData);
  } else {
    response = await fetchIssuesData();
  }

  return NextResponse.json(response);
};

module.exports = {
  combineEndpoints,
  getLanguages,
  getLabels,
  getRepositories,
  getMetadataEndpoint,
  getIssues,
};
