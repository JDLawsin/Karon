const STAR_CLIP =
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
const TRIANGLE_CLIP = "polygon(50% 0%, 0% 100%, 100% 100%)";

const PublicBookingBackdrop = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute -top-28 -right-20 size-112 rounded-full bg-primary/5" />
    <div className="absolute top-[14%] -left-28 size-80 rounded-full bg-primary/5" />
    <div className="absolute right-[18%] top-[38%] size-52 rounded-full bg-primary/8" />
    <div className="absolute bottom-28 left-[12%] size-64 rounded-full bg-primary/5" />
    <div className="absolute -bottom-16 right-[8%] size-96 rounded-full bg-primary/5" />
    <div className="absolute top-[8%] left-[22%] size-44 rotate-12 rounded-lg bg-primary/5" />
    <div className="absolute right-[6%] top-[62%] size-36 -rotate-6 rounded-lg bg-primary/5" />
    <div className="absolute bottom-[18%] left-[4%] size-56 rotate-18 rounded-lg bg-primary/5" />
    <div
      className="absolute -top-10 left-[6%] size-72 rotate-18 bg-primary/5"
      style={{ clipPath: STAR_CLIP }}
    />
    <div
      className="absolute top-[22%] right-[12%] size-48 -rotate-12 bg-primary/5"
      style={{ clipPath: STAR_CLIP }}
    />
    <div
      className="absolute bottom-[10%] right-[28%] size-40 rotate-8 bg-primary/5"
      style={{ clipPath: TRIANGLE_CLIP }}
    />
    <div
      className="absolute bottom-[32%] -left-6 size-36 -rotate-18 bg-primary/5"
      style={{ clipPath: TRIANGLE_CLIP }}
    />
    <div className="absolute top-[48%] left-[38%] hidden aspect-3/4 w-44 -rotate-3 rounded-lg bg-primary/5 lg:block" />
  </div>
);

export default PublicBookingBackdrop;
