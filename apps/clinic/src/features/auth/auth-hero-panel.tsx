const STAR_CLIP =
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
const TRIANGLE_CLIP = "polygon(50% 0%, 0% 100%, 100% 100%)";

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
      <div aria-hidden className="absolute inset-0 z-1">
        <div
          className="absolute -top-16 -left-20 size-80 rotate-18 bg-primary-foreground/5"
          style={{ clipPath: STAR_CLIP }}
        />
        <div
          className="absolute top-1/2 left-1/2 z-2 aspect-3/4 w-[min(18rem,48%)] -translate-x-1/2 -translate-y-1/2 rotate-3"
        >
          <div className="absolute -inset-4 -rotate-6 rounded-lg bg-primary-foreground/5" />
        </div>
        <div
          className="absolute right-[5%] bottom-[12%] size-[min(14rem,38%)] rotate-8 bg-primary-foreground/5"
          style={{ clipPath: TRIANGLE_CLIP }}
        />
      </div>
    </div>
  </aside>
);

export default AuthHeroPanel;
