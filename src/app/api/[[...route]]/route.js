import { NextResponse } from "next/server";
import { validateCSRF } from "@/lib/middleware/csrf";
import { rateLimit } from "@/lib/middleware/rate-limit";
import {
  getIssues,
  getMetadataEndpoint,
  getLanguages,
  getLabels,
  getRepositories,
  combineEndpoints,
} from "@/lib/api/handlers";

const handlers = {
  issues: (req) => getIssues(req),
  metadata: getMetadataEndpoint,
  "filter-options": () =>
    combineEndpoints({
      languages: getLanguages,
      labels: getLabels,
      repositories: getRepositories,
    })(),
};

const validOrigins = [
  "https://www.starterissues.com",
  "https://starterissues.com",
  ...(process.env.NODE_ENV === "development" ? ["http://localhost"] : []),
];

async function handleApiRequest(request, context, requiresCSRF = false) {
  if (requiresCSRF && !validateCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const { route: routeParam = [] } = await context.params;
  const route = routeParam[0] || "";

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  const isSameOrigin = !origin || host?.includes(new URL(origin).hostname);
  const isAllowedOrigin =
    !origin || validOrigins.some((valid) => origin.startsWith(valid));

  if (!isSameOrigin && !isAllowedOrigin) {
    return NextResponse.json(
      {
        error:
          "Access denied. This API can only be accessed from approved origins.",
      },
      { status: 403 }
    );
  }

  try {
    let rateLimitResult;
    try {
      rateLimitResult = await rateLimit(request, route);
    } catch (rateLimitError) {
      return NextResponse.json(
        { error: "Rate limiting service unavailable" },
        { status: 500 }
      );
    }

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.message },
        {
          status: rateLimitResult.status,
          headers: rateLimitResult.headers,
        }
      );
    }

    const handler = handlers[route];
    if (!handler)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const response = await handler(request);

    if (rateLimitResult.headers) {
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request, context) {
  return handleApiRequest(request, context);
}

export async function POST(request, context) {
  return handleApiRequest(request, context, true);
}

export async function PUT(request, context) {
  return handleApiRequest(request, context, true);
}

export async function DELETE(request, context) {
  return handleApiRequest(request, context, true);
}
