"use client";

import { useEffect, useState } from "react";

const useDebouncedValue = <T>(value: T, delayMs = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => window.clearTimeout(id);
  }, [delayMs, value]);

  return debounced;
};

export { useDebouncedValue };
