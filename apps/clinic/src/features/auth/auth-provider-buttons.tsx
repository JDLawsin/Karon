"use client";

import { Button } from "@karon/design-system";
import { Mail } from "lucide-react";

import GoogleMark from "@/features/auth/google-mark";

type Props = {
  pending: boolean;
  onMagicLink: () => void;
  onGoogle: () => void;
};

const AuthProviderButtons = ({ pending, onMagicLink, onGoogle }: Props) => (
  <div className="flex min-w-0 flex-col gap-3">
    <p className="flex items-center gap-3 text-sm text-muted-foreground">
      <span aria-hidden className="h-px min-w-0 flex-1 bg-border" />
      or
      <span aria-hidden className="h-px min-w-0 flex-1 bg-border" />
    </p>
    <Button
      disabled={pending}
      onClick={onMagicLink}
      type="button"
      variant="outline"
    >
      <Mail aria-hidden className="size-5" />
      Email me a link
    </Button>
    <Button disabled={pending} onClick={onGoogle} type="button" variant="outline">
      <GoogleMark />
      Continue with Google
    </Button>
  </div>
);

export default AuthProviderButtons;
