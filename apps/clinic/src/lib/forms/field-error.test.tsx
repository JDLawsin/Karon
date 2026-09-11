import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FieldError from "./field-error";

describe("FieldError", () => {
  it("renders the message as an alert", () => {
    render(<FieldError id="email-error" message="Enter a valid email." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email.");
  });

  it("renders nothing without a message", () => {
    const { container } = render(<FieldError id="email-error" />);

    expect(container).toBeEmptyDOMElement();
  });
});
