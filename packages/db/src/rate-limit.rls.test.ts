import { randomUUID } from "node:crypto";

import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import { databaseUrl, loadEnvFiles } from "./load-env";
import { createSharedRateLimitStore } from "./rate-limit";

loadEnvFiles();

const url = databaseUrl();
const key = `booking-two-instance:${randomUUID()}`;

describe.skipIf(!url)("KR-033 shared booking rate limit", () => {
  const first = createSharedRateLimitStore(url!);
  const second = createSharedRateLimitStore(url!);
  const admin = postgres(url!, { max: 1, prepare: false, ssl: "require" });

  afterAll(async () => {
    await admin`delete from private.rate_limit_buckets where key_hash = ${key}`;
    await Promise.all([first.close(), second.close(), admin.end()]);
  });

  it("holds one atomic limit across two app instances", async () => {
    await expect(Promise.all([
      first.hit(key, 10, 2),
      second.hit(key, 10, 2)
    ])).resolves.toEqual([false, false]);
    await expect(first.hit(key, 10, 2)).resolves.toBe(true);
  });
});
