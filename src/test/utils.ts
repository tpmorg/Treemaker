import { vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// Mock SvelteKit request event
export function createRequestEvent(options: {
  method?: string;
  url?: URL;
  params?: Record<string, string>;
  request?: Request;
  locals?: Record<string, any>;
}): any {
  const {
    method = 'GET',
    url = new URL('http://localhost:3000/'),
    params = {},
    request = new Request(url, { method }),
    locals = { user: { id: 'test-user-id' } }
  } = options;
  
  return {
    request,
    url,
    params,
    locals,
    fetch: vi.fn(),
    getClientAddress: vi.fn(() => '127.0.0.1'),
    platform: {},
    isDataRequest: false,
    route: { id: 'test' },
    isSubRequest: false,
    setHeaders: vi.fn(),
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      serialize: vi.fn()
    }
  };
}

// Helper to create a mock request with JSON body
export function createJsonRequest(url: string, body: any, method = 'POST'): Request {
  // Ensure URL is valid by adding a base URL if it's a relative path
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
  
  return new Request(fullUrl, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}
