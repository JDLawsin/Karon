/** Pexels — inventory: docs/attributions.md · license: https://www.pexels.com/license/ */
const AUTH_PHOTOS = [
  {
    alt: "Clinic staff using a tablet beside a patient in a dental treatment room.",
    credit: {
      label: "Andrea Piacquadio",
      href: "https://www.pexels.com/photo/medical-staff-with-tablet-and-lying-patient-in-dental-clinic-3952124/"
    },
    src: "/images/auth-hero.jpg",
    className: "absolute top-[6%] left-[6%] z-1 w-[min(14rem,36%)] -rotate-6",
    backingClassName: "absolute -inset-3 rotate-12 rounded-lg bg-primary-foreground/15"
  },
  {
    alt: "Two clinicians review a dental image on a clinic computer.",
    credit: {
      label: "Bakytzhan Baurzhanov",
      href: "https://www.pexels.com/photo/dentists-looking-at-tooth-on-screen-9951403/"
    },
    src: "/images/auth-hero-monitor.jpg",
    className:
      "absolute top-1/2 left-1/2 z-2 w-[min(15rem,40%)] -translate-x-1/2 -translate-y-1/2 rotate-3",
    backingClassName: "absolute -inset-3 -rotate-6 rounded-lg bg-primary-foreground/15"
  },
  {
    alt: "A dentist reviews a dental x-ray on a laptop with a patient in the chair.",
    credit: {
      label: "Gustavo Fring",
      href: "https://www.pexels.com/photo/dentist-explaining-the-x-ray-result-5622254/"
    },
    src: "/images/auth-hero-screen.jpg",
    className: "absolute right-[8%] bottom-[10%] z-1 w-[min(14rem,36%)] rotate-6",
    backingClassName: "absolute -inset-3 -rotate-12 rounded-lg bg-primary-foreground/15"
  }
] as const;

type PhotoCardProps = {
  alt: string;
  backingClassName: string;
  className: string;
  src: string;
};

const PhotoCard = ({ alt, backingClassName, className, src }: PhotoCardProps) => (
  <div className={className}>
    <div aria-hidden className={backingClassName} />
    <div className="relative rounded-lg bg-background p-3">
      <img
        alt={alt}
        className="aspect-3/4 w-full rounded-none object-cover object-center"
        src={src}
      />
    </div>
  </div>
);

type Props = {
  className?: string;
};

const AuthHeroPanel = ({ className }: Props) => (
  <aside className={className}>
    <div className="relative h-full min-h-svh w-full min-w-0 overflow-hidden bg-primary">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute -top-24 -right-16 size-112 rounded-full bg-primary-foreground/5" />
        <div className="absolute right-1/4 bottom-24 size-40 rounded-full bg-primary-foreground/10" />
        <div className="absolute bottom-16 -left-20 size-72 rotate-12 rounded-lg bg-primary-foreground/5" />
      </div>
      <div className="absolute inset-0 z-1">
        {AUTH_PHOTOS.map((photo) => (
          <PhotoCard
            alt={photo.alt}
            backingClassName={photo.backingClassName}
            className={photo.className}
            key={photo.src}
            src={photo.src}
          />
        ))}
      </div>
      <p className="absolute inset-x-0 bottom-0 z-2 px-4 py-3 text-right text-xs leading-5 text-pretty text-primary-foreground/80">
        Photos:{" "}
        {AUTH_PHOTOS.map((photo, index) => (
          <span key={photo.credit.href}>
            {index > 0 ? ", " : null}
            <a
              className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={photo.credit.href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {photo.credit.label}
            </a>
          </span>
        ))}
      </p>
    </div>
  </aside>
);

export default AuthHeroPanel;
