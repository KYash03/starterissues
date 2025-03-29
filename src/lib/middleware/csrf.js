export function validateCSRF(request) {
  if (request.method === "GET") return true;

  const csrfToken = request.headers.get("X-XSRF-TOKEN");

  const cookies = request.cookies.get("XSRF-TOKEN")?.value;

  return csrfToken && cookies && csrfToken === cookies;
}
