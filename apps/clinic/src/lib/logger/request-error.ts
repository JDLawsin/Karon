import type { Instrumentation } from "next";

type RequestInfo = Parameters<Instrumentation.onRequestError>[1];
type RequestContext = Parameters<Instrumentation.onRequestError>[2];

const requestErrorMetadata = (
  request: RequestInfo,
  context: RequestContext
) => ({
  method: request.method,
  routerKind: context.routerKind,
  routePath: context.routePath,
  routeType: context.routeType
});

export { requestErrorMetadata };
