type HostRedirect = {
  source: "/:path*";
  destination: string;
  statusCode: 301;
  has: [{ type: "host"; value: string }];
};

export const hostRedirect = (canonicalOrigin: string): HostRedirect => {
  const canonical = new URL(canonicalOrigin);
  const alternateHost = canonical.hostname.startsWith("www.")
    ? canonical.hostname.slice(4)
    : `www.${canonical.hostname}`;

  return {
    source: "/:path*",
    destination: `${canonical.origin}/:path*`,
    statusCode: 301,
    has: [{ type: "host", value: alternateHost }]
  };
};
