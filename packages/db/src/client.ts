import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { sessionRoleForClaims, type JwtClaims } from "./claims";
import * as schema from "./schema";

type KaronSchema = typeof schema;
type KaronDb = PostgresJsDatabase<KaronSchema>;

const createDb = (databaseUrl: string) => {
  const adminConnection = postgres(databaseUrl, { max: 4, prepare: false });
  const rlsConnection = postgres(databaseUrl, { max: 4, prepare: false });
  const admin = drizzle(adminConnection, { schema });
  const client = drizzle(rlsConnection, { schema });

  const rls = async <T>(
    claims: JwtClaims,
    run: (tx: KaronDb) => Promise<T>
  ) => {
    const role = sessionRoleForClaims(claims);

    return client.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`
      );
      await tx.execute(
        sql`select set_config('request.jwt.claim.sub', ${claims.sub ?? ""}, true)`
      );
      await tx.execute(sql.raw(`set local role ${role}`));
      return run(tx as unknown as KaronDb);
    });
  };

  return { admin, rls };
};

export { createDb };
export type { KaronDb };
