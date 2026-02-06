/** Standard JSON response helper */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  });
}

/** Error response helper */
export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message }, status);
}

/** CORS preflight handler */
export function corsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  });
}

/** Normalize X username: strip @, lowercase, trim */
export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, '').toLowerCase();
}
