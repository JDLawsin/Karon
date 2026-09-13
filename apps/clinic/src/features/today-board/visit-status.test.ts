import { describe, expect, it } from "vitest";

import { initialVisitStatus, isReverseVisitStatus, transitionVisitStatus } from "./visit-status";

describe("initialVisitStatus", () => {
  it("confirms a new booking when auto-confirm is on", () => {
    expect(initialVisitStatus(true)).toBe("confirmed");
  });

  it("holds a new booking for staff review when auto-confirm is off", () => {
    expect(initialVisitStatus(false)).toBe("pending_review");
  });
});

describe("transitionVisitStatus", () => {
  it("seats a confirmed booking into the waiting room", () => {
    expect(transitionVisitStatus("confirmed", "waiting")).toBe("waiting");
  });

  it("seats a pending-review booking into the waiting room", () => {
    expect(transitionVisitStatus("pending_review", "waiting")).toBe("waiting");
  });

  it("cancels a confirmed booking", () => {
    expect(transitionVisitStatus("confirmed", "cancelled")).toBe("cancelled");
  });

  it("cancels a pending-review booking", () => {
    expect(transitionVisitStatus("pending_review", "cancelled")).toBe("cancelled");
  });

  it("marks a confirmed booking as no-show", () => {
    expect(transitionVisitStatus("confirmed", "no_show")).toBe("no_show");
  });

  it("marks a pending-review booking as no-show", () => {
    expect(transitionVisitStatus("pending_review", "no_show")).toBe("no_show");
  });

  it("moves a waiting patient into the chair", () => {
    expect(transitionVisitStatus("waiting", "in_chair")).toBe("in_chair");
  });

  it("completes a visit that is in the chair", () => {
    expect(transitionVisitStatus("in_chair", "complete")).toBe("complete");
  });

  it("rejects skipping the waiting room from pending review", () => {
    expect(transitionVisitStatus("pending_review", "in_chair")).toBeNull();
  });

  it("moves a visit back to correct a step", () => {
    expect(transitionVisitStatus("waiting", "confirmed")).toBe("confirmed");
    expect(transitionVisitStatus("in_chair", "waiting")).toBe("waiting");
    expect(transitionVisitStatus("complete", "in_chair")).toBe("in_chair");
    expect(transitionVisitStatus("complete", "waiting")).toBe("waiting");
  });

  it("rejects leaving a cancelled visit", () => {
    expect(transitionVisitStatus("cancelled", "waiting")).toBeNull();
  });

  it("rejects leaving a no-show", () => {
    expect(transitionVisitStatus("no_show", "waiting")).toBeNull();
  });
});

describe("isReverseVisitStatus", () => {
  it("treats an earlier pipeline step as reverse", () => {
    expect(isReverseVisitStatus("waiting", "confirmed")).toBe(true);
    expect(isReverseVisitStatus("complete", "in_chair")).toBe(true);
    expect(isReverseVisitStatus("confirmed", "waiting")).toBe(false);
    expect(isReverseVisitStatus("confirmed", "cancelled")).toBe(false);
  });
});
