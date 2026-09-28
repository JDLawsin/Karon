import { describe, expect, it } from "vitest";

import { requestErrorMetadata } from "./request-error";

describe("request error metadata", () => {
  it("keeps request paths and headers out of operational logs", () => {
    const metadata = requestErrorMetadata(
      {
        method: "GET",
        path: "/patients/11111111-1111-4111-8111-111111111111",
        headers: { authorization: "Bearer private-token" }
      },
      {
        routerKind: "App Router",
        routePath: "/patients/[patientId]",
        routeType: "render",
        renderSource: "react-server-components",
        revalidateReason: undefined,
        renderType: "dynamic"
      }
    );

    expect(metadata).toEqual({
      method: "GET",
      routerKind: "App Router",
      routePath: "/patients/[patientId]",
      routeType: "render"
    });
    expect(JSON.stringify(metadata)).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(JSON.stringify(metadata)).not.toContain("private-token");
  });
});
