"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormProps
} from "react-hook-form";
import type { z } from "zod";

const markHydrated = (node: HTMLFormElement | null) => {
  if (node) {
    node.dataset.hydrated = "true";
  }
};

const useClinicForm = <TFieldValues extends FieldValues>(
  schema: z.ZodType<TFieldValues>,
  options?: Omit<UseFormProps<TFieldValues>, "resolver">
) =>
  useForm<TFieldValues>({
    mode: "onSubmit",
    reValidateMode: "onChange",
    ...options,
    // ponytail: Zod 4 + RHF resolver generics don't unify; drop the casts when they do.
    resolver: zodResolver(schema as never) as Resolver<TFieldValues>
  });

export { markHydrated, useClinicForm };
