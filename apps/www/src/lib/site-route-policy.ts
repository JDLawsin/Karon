import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

import type { SiteMode } from "../../content/site-mode";

const vendorComparisonSegments = new Set(["alternatives", "compare"]);

export const listPageRoutes = (appRoot: string) => {
  const routes: Array<string> = [];

  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) visit(path);
      else if (/^page\.[jt]sx?$/u.test(entry.name)) routes.push(relative(appRoot, directory).replaceAll("\\", "/"));
    }
  };

  visit(appRoot);
  return routes;
};

export const assertSiteRoutePolicy = (mode: SiteMode, routes: ReadonlyArray<string>) => {
  if (mode === "open") return;

  const forbiddenRoutes = routes.filter((route) => route
    .split("/")
    .filter((segment) => !/^\(.+\)$/u.test(segment))
    .some((segment) => vendorComparisonSegments.has(segment)));

  if (forbiddenRoutes.length > 0) {
    throw new Error(`Vendor comparison routes require open mode: ${forbiddenRoutes.join(", ")}`);
  }
};
