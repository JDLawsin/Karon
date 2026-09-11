import { CircleAlert } from "lucide-react";

type Props = {
  id: string;
  message?: string;
};

const FieldError = ({ id, message }: Props) =>
  message ? (
    <p
      className="flex items-start gap-2 text-sm text-destructive"
      id={id}
      role="alert"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  ) : null;

export default FieldError;
