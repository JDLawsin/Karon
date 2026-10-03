import { TooltipProvider } from "@karon/design-system";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OverflowTooltipText from "./overflow-tooltip-text";

class ResizeObserverMock {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
}

describe("OverflowTooltipText", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("only exposes a keyboard tooltip when the text is clipped", async () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(20);
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(40);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(100);

    render(
      <TooltipProvider delayDuration={0}>
        <OverflowTooltipText className="line-clamp-2">
          A patient name that is too long for the card
        </OverflowTooltipText>
      </TooltipProvider>
    );

    const text = screen.getByText("A patient name that is too long for the card");
    await waitFor(() => expect(text).toHaveAttribute("tabindex", "0"));

    fireEvent.focus(text);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "A patient name that is too long for the card"
    );
  });

  it("does not add a keyboard stop or tooltip for fully visible text", () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(20);
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(20);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(100);

    render(
      <TooltipProvider delayDuration={0}>
        <OverflowTooltipText>Short name</OverflowTooltipText>
      </TooltipProvider>
    );

    expect(screen.getByText("Short name")).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
