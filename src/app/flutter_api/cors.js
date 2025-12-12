// CORS helper for Flutter API
// This file provides CORS headers that allow Flutter apps to access the API

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Flutter-App',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
};

// Helper to add CORS headers to response
export function withCors(response) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Helper to create JSON response with CORS
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Helper to handle OPTIONS preflight request
export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Error response helper
export function errorResponse(message, status = 400, additionalData = {}) {
  return jsonResponse({
    success: false,
    error: message,
    ...additionalData,
  }, status);
}

// Success response helper
export function successResponse(data, status = 200) {
  return jsonResponse({
    success: true,
    ...data,
  }, status);
}

