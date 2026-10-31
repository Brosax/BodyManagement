import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchAndCache,
  invalidate,
  prefetch,
  prefetchTabData,
  setCached,
  todayUrl,
  foodsUrl,
  summaryUrl,
  proteinUrl,
  weightsUrl,
  plansUrl,
  logsUrl,
} from "./api-cache";

describe("url builders", () => {
  it("builds consistent cache keys", () => {
    expect(todayUrl(1, "2026-08-24")).toBe(
      "/api/today?personId=1&date=2026-08-24"
    );
    expect(foodsUrl(2, "2026-08-24")).toBe(
      "/api/foods?personId=2&date=2026-08-24"
    );
    expect(proteinUrl(1, "2026-08-24")).toBe(
      "/api/protein?personId=1&from=2026-08-24&to=2026-08-24"
    );
    expect(weightsUrl(3, 90)).toBe("/api/weights?personId=3&days=90");
    expect(plansUrl()).toBe("/api/plans");
    expect(logsUrl(4)).toBe("/api/training-logs?personId=4");
  });

  it("summaryUrl covers 90 days ending at toDate", () => {
    const url = summaryUrl(1, "2026-08-24");
    expect(url).toMatch(/^\/api\/foods\/summary\?personId=1&from=\d{4}-\d{2}-\d{2}&to=2026-08-24$/);
    expect(url).not.toContain("2026-08-24&to=2026-08-24&");
  });
});

describe("cache layer", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        return new Response(JSON.stringify({ url, n: cacheProbe(url) }), {
          status: 200,
        });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    invalidate("");
  });

  function cacheProbe(url: string): number {
    return url.length; // 确定性返回值，便于断言
  }

  it("fetchAndCache stores result and serves identical promise for concurrent calls", async () => {
    const url = todayUrl(1, "2026-01-01");
    const fetchMock = vi.mocked(globalThis.fetch);
    const [a, b] = await Promise.all([
      fetchAndCache<{ n: number }>(url),
      fetchAndCache<{ n: number }>(url),
    ]);
    expect(a).toEqual(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("prefetch skips when already cached", async () => {
    const url = foodsUrl(9, "2026-01-01");
    setCached(url, [{ date: "2026-01-01", total: 100 }]);
    const fetchMock = vi.mocked(globalThis.fetch);
    prefetch(url);
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefetch fills cache for missing keys", async () => {
    const url = logsUrl(7);
    prefetch(url);
    await (fetchAndCache(url) as Promise<unknown>);
    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("invalidate removes matching prefixes only", async () => {
    const keep = plansUrl();
    const dropA = foodsUrl(1, "2026-01-01");
    const dropB = foodsUrl(2, "2026-01-02");
    setCached(keep, []);
    setCached(dropA, []);
    setCached(dropB, []);
    invalidate("/api/foods");
    const fetchMock = vi.mocked(globalThis.fetch);
    prefetch(keep); // 仍在缓存 → 不发请求
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).not.toHaveBeenCalled();
    prefetch(dropA); // 已失效 → 发请求
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).toHaveBeenCalled();
  });

  it("prefetchTabData requests the right endpoints per tab", async () => {
    prefetchTabData("/eat", 1, "2026-08-24");
    await new Promise((r) => setTimeout(r, 10));
    const calls = vi
      .mocked(globalThis.fetch)
      .mock.calls.map((c) => String(c[0]));
    expect(calls).toContain(foodsUrl(1, "2026-08-24"));
    expect(calls).toContain(summaryUrl(1, "2026-08-24"));
    expect(calls).not.toContain(plansUrl());
  });
});
