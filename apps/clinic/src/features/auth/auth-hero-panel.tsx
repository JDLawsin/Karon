import Image from "next/image";

/** Unsplash License — free to use: https://unsplash.com/license */
const AUTH_HERO = {
  alt: "A bright dental treatment room with modern equipment.",
  credit: {
    label: "National Cancer Institute",
    href: "https://unsplash.com/photos/a-dental-operatory-with-modern-equipment-1629909613654-28e377c37b09"
  },
  src: "/images/auth-hero.jpg"
} as const;

type Props = {
  className?: string;
};

const AuthHeroPanel = ({ className }: Props) => (
  <aside className={className}>
    <div className="relative h-full min-h-svh w-full min-w-0 overflow-hidden">
      <Image
        alt={AUTH_HERO.alt}
        className="object-cover object-center"
        fill
        priority
        sizes="(min-width: 1024px) calc(100vw - 32rem), (min-width: 768px) calc(100vw - 28rem), 0px"
        src={AUTH_HERO.src}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-background/80 via-background/20 to-transparent md:bg-linear-to-l md:from-background/70 md:via-transparent md:to-transparent"
      />
      <p className="absolute inset-x-0 bottom-0 px-4 py-3 text-right text-xs text-foreground/80">
        <a
          className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={AUTH_HERO.credit.href}
          rel="noopener noreferrer"
          target="_blank"
        >
          Photo: {AUTH_HERO.credit.label}
        </a>
      </p>
    </div>
  </aside>
);

export default AuthHeroPanel;
