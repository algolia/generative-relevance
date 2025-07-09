export function getAuthHeaders(): HeadersInit {
  const username = process.env.NEXT_PUBLIC_BASIC_AUTH_USERNAME;
  const password = process.env.NEXT_PUBLIC_BASIC_AUTH_PASSWORD;

  const credentials = btoa(`${username}:${password}`);

  return {
    Authorization: `Basic ${credentials}`,
  };
}

export function createAuthenticatedFetch() {
  return (url: string, options: RequestInit = {}): Promise<Response> => {
    const authHeaders = getAuthHeaders();

    return fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
    });
  };
}
