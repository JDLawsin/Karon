import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UTM_STORAGE_KEY } from "./attribution-capture";
import DemoForm from "./demo-form";

describe("founding clinic lead form", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the approved fields in order and reveals demo time only for demos", () => {
    const { container } = render(
      <DemoForm
        contactEmail="hello@example.test"
        initialIntent="application"
        responsePromise="within one business day"
        submissionId="4cf7f7e0-aa10-4fd8-bfff-a4c45d2ec112"
      />
    );

    const labels = [...container.querySelectorAll("label")].map((label) =>
      label.textContent?.trim()
    );
    expect(labels.slice(0, 10)).toEqual([
      "Apply as a founding clinic",
      "Book a demo",
      "Name",
      "Clinic name",
      "Country",
      "State or province (optional)",
      "City or municipality",
      "Email",
      "1",
      "2"
    ]);
    expect(screen.queryByLabelText("Preferred time (optional)")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Book a demo"));

    expect(screen.getByLabelText("Preferred time (optional)")).toBeVisible();
    expect(screen.getByRole("button", { name: "Request a demo" })).toBeVisible();
  });

  it("shows a live 500 character counter and keeps privacy separate from updates", () => {
    render(
      <DemoForm
        contactEmail="hello@example.test"
        initialIntent="application"
        responsePromise="within one business day"
        submissionId="4cf7f7e0-aa10-4fd8-bfff-a4c45d2ec112"
      />
    );

    const message = screen.getByLabelText("Anything we should know before we reply? (optional)");
    fireEvent.change(message, { target: { value: "hello" } });

    expect(screen.getByText("5 / 500")).toBeVisible();
    expect(screen.getByRole("checkbox", { name: /privacy notice/i })).toBeRequired();
    expect(screen.getByRole("checkbox", { name: "Send me launch updates" })).not.toBeChecked();
  });

  it("focuses the error summary after a rejected submission", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
      error: "Check the highlighted fields and try again.",
      fieldErrors: { name: "Enter your name." }
    }, { status: 400 }));
    const { container } = render(
      <DemoForm
        contactEmail="hello@example.test"
        initialIntent="application"
        responsePromise="within one business day"
        submissionId="4cf7f7e0-aa10-4fd8-bfff-a4c45d2ec112"
      />
    );

    fireEvent.submit(container.querySelector("form")!);

    const summary = await screen.findByRole("alert");
    await waitFor(() => expect(summary).toHaveFocus());
  });

  it("links a clinic-size error to the Chairs group", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
      error: "Check the highlighted fields and try again.",
      fieldErrors: { clinicSize: "Choose the number of chairs." }
    }, { status: 400 }));
    const { container } = render(
      <DemoForm
        contactEmail="hello@example.test"
        initialIntent="application"
        responsePromise="within one business day"
        submissionId="4cf7f7e0-aa10-4fd8-bfff-a4c45d2ec112"
      />
    );

    fireEvent.submit(container.querySelector("form")!);

    const errorLink = await screen.findByRole("link", { name: "Choose the number of chairs." });
    const chairs = screen.getByRole("group", { name: "Chairs" });
    expect(errorLink).toHaveAttribute("href", "#clinicSize");
    expect(chairs).toHaveAttribute("id", "clinicSize");
    expect(chairs).toHaveAttribute("aria-describedby", "clinicSize-error");
    expect(chairs).toHaveAttribute("aria-invalid", "true");
  });

  it("ignores malformed stored attribution and still submits", async () => {
    sessionStorage.setItem(UTM_STORAGE_KEY, "null");
    const fetchImpl = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
      submissionId: "4cf7f7e0-aa10-4fd8-bfff-a4c45d2ec112",
      intent: "application",
      clinicSize: "1_chair"
    }, { status: 200 }));
    const { container } = render(
      <DemoForm
        contactEmail="hello@example.test"
        initialIntent="application"
        responsePromise="within one business day"
        submissionId="4cf7f7e0-aa10-4fd8-bfff-a4c45d2ec112"
      />
    );

    fireEvent.submit(container.querySelector("form")!);

    await screen.findByRole("heading", { name: /thank you/i });
    const request = fetchImpl.mock.calls[0]?.[1];
    const payload = JSON.parse(String(request?.body)) as { attribution: Record<string, unknown> };
    expect(payload.attribution).toEqual({ landingPath: "/" });
  });
});
