// @ts-check

import { fileURLToPath } from "node:url";

import { serwist } from "@serwist/next/config";

export default serwist({
  swSrc: fileURLToPath(new URL("./src/app/sw.ts", import.meta.url)),
  swDest: fileURLToPath(new URL("./public/sw.js", import.meta.url))
});
