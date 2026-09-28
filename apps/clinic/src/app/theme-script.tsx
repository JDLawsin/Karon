"use client";

import { themeInitScript } from "@karon/design-system/theme";
import { useServerInsertedHTML } from "next/navigation";

const ThemeScript = () => {
  useServerInsertedHTML(() => (
    <script
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
      id="karon-theme-init"
    />
  ));

  return null;
};

export default ThemeScript;
