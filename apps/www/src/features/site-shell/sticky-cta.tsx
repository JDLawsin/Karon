"use client";

import { Button } from "@karon/design-system";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { SiteCta } from "../../../content/site.config";

type Props = {
  cta: SiteCta;
};

const StickyCta = ({ cta }: Props) => {
  const [originVisible, setOriginVisible] = useState(true);
  const [stopVisible, setStopVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const origin = document.querySelector("[data-sticky-cta-origin]");
    const stops = document.querySelectorAll("[data-sticky-cta-stop]");
    const originObserver = new IntersectionObserver(([entry]) => setOriginVisible(entry?.isIntersecting ?? true));
    const visibleStops = new Set<Element>();
    const stopObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting ? visibleStops.add(entry.target) : visibleStops.delete(entry.target));
      setStopVisible(visibleStops.size > 0);
    });

    if (origin) originObserver.observe(origin);
    stops.forEach((stop) => stopObserver.observe(stop));

    return () => {
      originObserver.disconnect();
      stopObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => setKeyboardVisible(window.innerHeight - viewport.height > 150);
    viewport.addEventListener("resize", update);
    update();
    return () => viewport.removeEventListener("resize", update);
  }, []);

  const visible = !originVisible && !stopVisible && !keyboardVisible;

  return (
    <div aria-hidden={!visible} className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-opacity duration-motion lg:hidden ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`} inert={!visible}>
      <Button asChild className="w-full">
        <Link data-cta-id={cta.ctaId} href={cta.href}>{cta.label}</Link>
      </Button>
    </div>
  );
};

export default StickyCta;
