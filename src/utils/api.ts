export async function readApiJson<T>(response: Response): Promise<T> {
  const body = await response.text();
  let data: any = null;

  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    const fallback = response.status === 404
      ? "The server does not have this API route yet. Restart the application server and try again."
      : `The server returned an invalid response (HTTP ${response.status}).`;
    throw new Error(fallback);
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Request failed (HTTP ${response.status}).`);
  }

  return data as T;
}
