import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import Odontogram from "./odontogram";

vi.mock("react-advanced-odontogram", async () => {
  const { createContext, useContext, useState } = await import("react");
  const ReadOnlyContext = createContext(false);

  return {
    OdontogramProvider: ({
      children,
      readOnly = false
    }: {
      children?: ReactNode;
      readOnly?: boolean;
    }) => (
      <ReadOnlyContext.Provider value={readOnly}>{children}</ReadOnlyContext.Provider>
    ),
    OdontogramChartSurface: () => {
      const readOnly = useContext(ReadOnlyContext);
      const [selected, setSelected] = useState<string | null>(null);

      return (
        <div>
          <div
            aria-label="16"
            aria-selected={selected === "16"}
            data-tooth="16"
            onClick={(event) => {
              const next = event.ctrlKey && selected === "16" ? null : "16";
              event.currentTarget.setAttribute(
                "aria-selected",
                String(next === "16")
              );
              setSelected(next);
            }}
            role="option"
            tabIndex={readOnly ? -1 : 0}
          />
          <div
            aria-label="26"
            aria-selected={selected === "26"}
            data-tooth="26"
            id="mock-tooth-26"
            onClick={(event) => {
              event.currentTarget.setAttribute("aria-selected", "true");
              setSelected("26");
            }}
            role="option"
            tabIndex={readOnly ? -1 : 0}
          />
          <button
            onClick={() => {
              document
                .querySelector("#mock-tooth-26")
                ?.setAttribute("aria-selected", "true");
              setSelected("26");
            }}
            type="button"
          >
            Select 26 from touch overlay
          </button>
        </div>
      );
    }
  };
});

describe("Odontogram", () => {
  it("requires a tooth, controlled finding, and note before appending", async () => {
    const onAppend = vi.fn().mockResolvedValue(undefined);
    render(
      <Odontogram
        canChart
        entries={[]}
        onAppend={onAppend}
        saving={false}
        visitLabels={{}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add chart entry" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a tooth and finding, then add a note."
    );
    expect(onAppend).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("option", { name: "16" }));
    fireEvent.change(screen.getByLabelText("Condition or procedure"), {
      target: { value: "procedure:filling" }
    });
    fireEvent.change(screen.getByLabelText("Visit note"), {
      target: { value: "Composite restoration placed." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add chart entry" }));

    expect(onAppend).toHaveBeenCalledWith({
      toothCode: "16",
      finding: { kind: "procedure", code: "filling" },
      note: "Composite restoration placed."
    });
  });

  it("keeps tooth controls visible but disables writing outside an in-chair visit", async () => {
    render(
      <Odontogram
        canChart={false}
        entries={[]}
        onAppend={vi.fn()}
        saving={false}
        visitLabels={{}}
      />
    );

    expect(await screen.findByRole("option", { name: "16" })).toHaveAttribute(
      "tabindex",
      "-1"
    );
    expect(screen.queryByRole("button", { name: "Add chart entry" })).not.toBeInTheDocument();
    expect(screen.getByText("Move the visit to In chair to add a chart entry.")).toBeVisible();
  });

  it("does not append against a tooth deselected with a modifier click", async () => {
    const onAppend = vi.fn().mockResolvedValue(undefined);
    render(
      <Odontogram
        canChart
        entries={[]}
        onAppend={onAppend}
        saving={false}
        visitLabels={{}}
      />
    );

    const tooth = await screen.findByRole("option", { name: "16" });
    fireEvent.click(tooth);
    fireEvent.click(tooth, { ctrlKey: true });
    fireEvent.change(screen.getByLabelText("Condition or procedure"), {
      target: { value: "condition:caries" }
    });
    fireEvent.change(screen.getByLabelText("Visit note"), {
      target: { value: "Occlusal lesion noted." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add chart entry" }));

    expect(onAppend).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a tooth and finding, then add a note."
    );
  });

  it("tracks selection changes made by the library touch overlay", async () => {
    const onAppend = vi.fn().mockResolvedValue(undefined);
    render(
      <Odontogram
        canChart
        entries={[]}
        onAppend={onAppend}
        saving={false}
        visitLabels={{}}
      />
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Select 26 from touch overlay" })
    );
    await act(async () => Promise.resolve());
    fireEvent.change(screen.getByLabelText("Condition or procedure"), {
      target: { value: "condition:caries" }
    });
    fireEvent.change(screen.getByLabelText("Visit note"), {
      target: { value: "Occlusal lesion noted." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add chart entry" }));

    expect(onAppend).toHaveBeenCalledWith({
      toothCode: "26",
      finding: { kind: "condition", code: "caries" },
      note: "Occlusal lesion noted."
    });
  });
});
