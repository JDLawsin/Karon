import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/images/prepare-image", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/images/prepare-image")>();
  return {
    ...actual,
    prepareImageFile: vi.fn()
  };
});

import { LOGO_IMAGE_OPTIONS, prepareImageFile } from "@/lib/images/prepare-image";

import ImageUploadField from "./image-upload-field";

const mockedPrepare = vi.mocked(prepareImageFile);

const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "Clinic Logo.PNG", {
  type: "image/png"
});

describe("ImageUploadField", () => {
  it("shows the dropzone and passes a prepared file to the parent", async () => {
    const onFileChange = vi.fn();
    mockedPrepare.mockResolvedValue({
      ok: true,
      file: new File(["ok"], "logo.webp", { type: "image/webp" })
    });

    render(
      <ImageUploadField
        emptyLabel="Drop a logo here, or choose an image"
        error={null}
        file={null}
        id="clinic-logo"
        label="Logo"
        onFileChange={onFileChange}
        optional
        options={LOGO_IMAGE_OPTIONS}
        previewAlt="Clinic logo preview"
        remoteUrl={null}
      />
    );

    expect(screen.getByRole("button", { name: "Choose image" })).toBeVisible();
    fireEvent.change(document.getElementById("clinic-logo") as HTMLInputElement, {
      target: { files: [png] }
    });

    await waitFor(() => {
      expect(onFileChange).toHaveBeenCalledWith(
        expect.objectContaining({ name: "logo.webp", type: "image/webp" }),
        null
      );
    });
  });
});
