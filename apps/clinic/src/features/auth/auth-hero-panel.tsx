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
    </div>
  </aside>
);

export default AuthHeroPanel;
