import { cn } from "../lib/cn";
import KaronMark from "./karon-mark";

type Props = {
  className?: string;
};

const KaronWordmark = ({ className }: Props) => (
  <span className={cn("inline-flex items-center gap-2", className)}>
    <KaronMark aria-hidden className="size-8 shrink-0 text-primary" />
    <span className="text-lg font-semibold text-foreground">Karon</span>
  </span>
);

export default KaronWordmark;
