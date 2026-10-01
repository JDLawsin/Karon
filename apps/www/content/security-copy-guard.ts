const counselRules = [
  {
    label: "processing or DPA",
    wording: /\b(?:processing|DPA)\b/iu,
    href: "/legal/processing-agreement"
  },
  {
    label: "retention",
    wording: /\bretention\b/iu,
    href: "/legal/privacy"
  }
] as const;

const withoutScripts = (html: string) => html
  .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
  .replace(/<style\b[\s\S]*?<\/style>/giu, " ");

export const findUnlinkedCounselWording = (html: string) => counselRules.flatMap(({ label, wording, href }) => {
  const approvedLink = new RegExp(
    `<a\\b(?=[^>]*\\bhref\\s*=\\s*(["'])${href}\\1)[^>]*>[\\s\\S]*?<\\/a>`,
    "giu"
  );
  const visibleUnlinkedText = withoutScripts(html)
    .replace(approvedLink, " ")
    .replace(/<[^>]*>/gu, " ");

  return wording.test(visibleUnlinkedText)
    ? [`${label} wording must link to ${href}`]
    : [];
});
