export interface LabStatus {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  region: string;
  uptime: string;
  responseTime: number;
  deployedAt: string;
}
function shortText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 120;
}
export function validateStatus(value: unknown): LabStatus {
  if (!value || typeof value !== "object")
    throw new Error("Invalid status response");
  const data = value as Record<string, unknown>;
  if (
    !["healthy", "degraded", "unhealthy"].includes(String(data.status)) ||
    !shortText(data.version) ||
    !shortText(data.region) ||
    !shortText(data.uptime) ||
    typeof data.responseTime !== "number" ||
    !Number.isFinite(data.responseTime) ||
    data.responseTime < 0 ||
    !shortText(data.deployedAt) ||
    Number.isNaN(Date.parse(data.deployedAt))
  )
    throw new Error("Invalid status response");
  return data as unknown as LabStatus;
}
export async function fetchStatus(
  endpoint: string,
  timeoutMs = 4000,
  fetcher: typeof fetch = fetch,
): Promise<LabStatus> {
  const url = new URL(endpoint);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Status endpoint must use HTTPS");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Service unavailable");
    // Avoid reading an unbounded status response. This is a tiny public document.
    if (!response.body) throw new Error("Empty status response");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) {
          await reader.cancel();
          throw new Error("Status response too large");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return validateStatus(JSON.parse(new TextDecoder().decode(bytes)));
  } finally {
    clearTimeout(timer);
  }
}
