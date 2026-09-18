import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchStatus, validateStatus } from "../src/lib/lab-client.ts";

const sample = {
  status: "healthy",
  version: "v1.0.0",
  region: "ap-south-1",
  uptime: "2h",
  responseTime: 42,
  deployedAt: "2026-09-18T10:00:00Z",
};
test("validates the public API contract", () => {
  assert.deepEqual(validateStatus(sample), sample);
});
test("rejects missing fields, invalid dates, and invalid latency", () => {
  for (const response of [
    null,
    {},
    { ...sample, responseTime: -1 },
    { ...sample, responseTime: Infinity },
    { ...sample, status: "unknown" },
    { ...sample, deployedAt: "invalid" },
    { ...sample, version: "x".repeat(121) },
  ])
    assert.throws(() => validateStatus(response));
});
test("fetches without credentials and validates the result", async () => {
  const actual = await fetchStatus(
    "https://example.com/api/status",
    100,
    async (_url, options) => {
      assert.equal(options.credentials, "omit");
      assert.equal(options.cache, "no-store");
      return Response.json(sample);
    },
  );
  assert.deepEqual(actual, sample);
});
test("rejects HTTP failures, malformed JSON, and oversized responses", async () => {
  for (const response of [
    new Response("", { status: 503 }),
    new Response("not json"),
    new Response("x".repeat(8193)),
  ])
    await assert.rejects(
      fetchStatus("https://example.com/status", 100, async () => response),
    );
});
test("rejects network failure without retrying", async () => {
  let calls = 0;
  await assert.rejects(
    fetchStatus("https://example.com/status", 100, async () => {
      calls++;
      throw new TypeError("Network error");
    }),
  );
  assert.equal(calls, 1);
});
test("aborts a request that exceeds its timeout", async () => {
  await assert.rejects(
    fetchStatus(
      "https://example.com/status",
      10,
      async (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    ),
    { name: "AbortError" },
  );
});
test("rejects insecure or non-HTTP endpoints", async () => {
  for (const url of [
    "http://example.com/status",
    "javascript:alert(1)",
    "file:///status",
  ])
    await assert.rejects(fetchStatus(url));
});
