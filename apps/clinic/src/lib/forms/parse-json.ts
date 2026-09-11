import type { z } from "zod";

const parseJson = async <S extends z.ZodType>(response: Response, schema: S) => {
  const json: unknown = await response.json().catch(() => null);
  return schema.safeParse(json);
};

export { parseJson };
