import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  metadata: {} as Record<string, unknown>,
  updateError: null as { message: string } | null,
  pendingUser: null as Promise<void> | null
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabase: () => ({
    auth: {
      get metadata() {
        return auth.metadata;
      },
      async getUser() {
        if (auth.pendingUser) {
          await auth.pendingUser;
        }

        return {
          data: { user: { user_metadata: this.metadata } }
        };
      },
      async getSession() {
        return { data: { session: { user: { email: "owner@example.com" } } } };
      },
      async updateUser({ data }: { data: Record<string, unknown> }) {
        if (auth.updateError) {
          return { error: auth.updateError };
        }

        auth.metadata = { ...auth.metadata, ...data };
        return { error: null };
      }
    }
  })
}));

import { ClinicSessionProvider } from "@/lib/auth/clinic-session";

import ClinicStaffAvatar from "./clinic-staff-avatar";
import { staffAvatarDataUri } from "./staff-avatar";
import { StaffAvatarPreferenceProvider } from "./staff-avatar-preference";

const renderMenu = () =>
  render(
    <ClinicSessionProvider
      membership={{
        tenantId: "11111111-1111-4111-8111-111111111111",
        role: "owner"
      }}
      userId="22222222-2222-4222-8222-222222222222"
    >
      <StaffAvatarPreferenceProvider userId="22222222-2222-4222-8222-222222222222">
        <ClinicStaffAvatar
          editable
          role="owner"
          userId="22222222-2222-4222-8222-222222222222"
        />
      </StaffAvatarPreferenceProvider>
    </ClinicSessionProvider>
  );

const openMenu = async () => {
  const trigger = await screen.findByRole("button", { name: "Change avatar" });
  fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
  fireEvent.click(trigger);

  await waitFor(() => {
    expect(screen.getByRole("menu")).toBeTruthy();
  });
};

describe("StaffAvatarMenu", () => {
  beforeEach(() => {
    auth.metadata = {};
    auth.updateError = null;
    auth.pendingUser = null;
  });

  it("shows a pulsing circle until the saved avatar is ready", async () => {
    let release = () => {};
    auth.pendingUser = new Promise<void>((resolve) => {
      release = resolve;
    });

    renderMenu();

    expect(screen.getByLabelText("Loading owner avatar")).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Owner avatar" })).toBeNull();

    release();

    expect(await screen.findByRole("img", { name: "Owner avatar" })).toBeTruthy();
  });

  it("saves a chosen avatar from the dropdown menu", async () => {
    renderMenu();
    await openMenu();

    fireEvent.click(screen.getByRole("button", { name: "Avatar option 2" }));

    await waitFor(() => {
      expect(auth.metadata.avatar_seed).toBe("blake");
      expect(auth.metadata.avatar_style).toBe("notionists-neutral");
    });
  });

  it("loads the saved avatar after the preference provider remounts", async () => {
    const view = renderMenu();
    await openMenu();

    fireEvent.click(screen.getByRole("button", { name: "Avatar option 2" }));

    await waitFor(() => {
      expect(auth.metadata.avatar_seed).toBe("blake");
    });

    view.unmount();
    renderMenu();

    await waitFor(() => {
      expect(
        screen.getByRole("img", { name: "Owner avatar" }).getAttribute("src")
      ).toBe(staffAvatarDataUri("blake", "notionists-neutral"));
    });
  });

  it("shows an error when the avatar update fails", async () => {
    auth.updateError = { message: "failed" };
    renderMenu();
    await openMenu();

    fireEvent.click(screen.getByRole("button", { name: "Avatar option 2" }));

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Could not update your avatar.");
  });

  it("updates avatar previews when a style tab is selected", async () => {
    const userId = "22222222-2222-4222-8222-222222222222";
    renderMenu();
    await openMenu();

    const defaultAvatar = screen.getByRole("button", { name: "Default avatar" });

    expect(defaultAvatar.querySelector("img")?.getAttribute("src")).toBe(
      staffAvatarDataUri(userId, "notionists-neutral")
    );

    fireEvent.pointerDown(screen.getByRole("tab", { name: "Notionists" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Notionists" })).toHaveAttribute(
        "aria-selected",
        "true"
      );

      const preview = screen
        .getByRole("button", { name: "Default avatar" })
        .querySelector("img");

      expect(preview?.getAttribute("src")).toBe(
        staffAvatarDataUri(userId, "notionists")
      );
    });
  });
});
