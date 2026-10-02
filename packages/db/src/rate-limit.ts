import "server-only";

import postgres from "postgres";

const createSharedRateLimitStore = (databaseUrl: string) => {
  const connection = postgres(databaseUrl, { max: 2, prepare: false });

  const hit = async (key: string, windowMinutes: number, limit: number) =>
    connection.begin(async (transaction) => {
      await transaction.unsafe("set local role service_role");
      const rows = await transaction<{ limited: boolean }[]>`
        select private.rate_limit_hit(
          ${key},
          make_interval(mins => ${windowMinutes}),
          ${limit}
        ) as limited
      `;

      if (typeof rows[0]?.limited !== "boolean") {
        throw new Error("Shared rate limiter returned no result");
      }

      return rows[0].limited;
    });

  return { hit, close: () => connection.end() };
};

export { createSharedRateLimitStore };
