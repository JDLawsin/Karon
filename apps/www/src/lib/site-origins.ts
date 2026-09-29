import "server-only";

import { readSiteOrigins } from "./read-site-origins";

export const siteOrigins = readSiteOrigins(process.env);
