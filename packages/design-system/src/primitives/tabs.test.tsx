import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

describe("Tabs", () => {
  it("renders clinic-sized tab triggers", () => {
    render(
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="clinic">Clinic</TabsTrigger>
        </TabsList>
        <TabsContent value="account">Password</TabsContent>
        <TabsContent value="clinic">Details</TabsContent>
      </Tabs>
    );

    const account = screen.getByRole("tab", { name: "Account" });
    const list = screen.getByRole("tablist");
    const root = list.closest("[data-slot='tabs']");

    expect(root?.className).toContain("flex-col");
    expect(list.className).toContain("flex-row");
    expect(account.className).toContain("h-(--control-min-height)");
    expect(account.className).not.toContain("flex-1");
    expect(screen.getByRole("tab", { name: "Clinic" })).toBeTruthy();
  });
});
