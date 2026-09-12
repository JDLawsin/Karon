import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fitWithin,
  prepareImageFile,
  sniffImageMime,
  type PrepareImageOptions
} from "./prepare-image";

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const WEBP_HEADER = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50
]);

const tinyOptions = (): PrepareImageOptions => ({
  maxInputBytes: 32,
  maxOutputBytes: 16,
  maxEdge: 64,
  name: "logo"
});

const stubEncode = (blobs: { webp?: Blob | null; jpeg?: Blob | null }) => {
  vi.stubGlobal("createImageBitmap", async () => ({
    width: 2000,
    height: 1000,
    close: () => undefined
  }));
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: () => undefined,
        fillRect: () => undefined,
        fillStyle: "",
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high"
      }),
      toBlob: (callback: BlobCallback, type?: string) => {
        callback(type === "image/jpeg" ? (blobs.jpeg ?? null) : (blobs.webp ?? null));
      }
    })
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sniffImageMime", () => {
  it("reads PNG, JPEG, and WebP magic bytes and rejects the rest", () => {
    expect(sniffImageMime(PNG_HEADER)).toBe("image/png");
    expect(sniffImageMime(JPEG_HEADER)).toBe("image/jpeg");
    expect(sniffImageMime(WEBP_HEADER)).toBe("image/webp");
    expect(sniffImageMime(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))).toBe(
      null
    );
    expect(sniffImageMime(new Uint8Array([0x89, 0x50]))).toBe(null);
  });
});

describe("fitWithin", () => {
  it("downscales the long edge and never upscales", () => {
    expect(fitWithin(800, 600, 1024)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(2000, 1000, 1024)).toEqual({ width: 1024, height: 512 });
    expect(fitWithin(1000, 2000, 1024)).toEqual({ width: 512, height: 1024 });
  });
});

describe("prepareImageFile", () => {
  it("rejects empty, oversized, and spoofed files before decode", async () => {
    const options = tinyOptions();
    const empty = new File([], "logo.png", { type: "image/png" });
    expect((await prepareImageFile(empty, options)).ok).toBe(false);

    const huge = new File([new Uint8Array(33)], "logo.png", { type: "image/png" });
    expect((await prepareImageFile(huge, options)).ok).toBe(false);

    const spoofed = new File([new Uint8Array(12).fill(1)], "logo.png", {
      type: "image/png"
    });
    expect((await prepareImageFile(spoofed, options)).ok).toBe(false);
  });

  it("re-encodes a valid image to a neutral WebP name", async () => {
    stubEncode({ webp: new Blob([new Uint8Array(8)], { type: "image/webp" }) });
    const file = new File([PNG_HEADER], "Clinic Logo.PNG", { type: "text/plain" });
    const result = await prepareImageFile(file, tinyOptions());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.file.name).toBe("logo.webp");
    expect(result.file.type).toBe("image/webp");
  });

  it("falls back to JPEG when WebP encoding is missing", async () => {
    stubEncode({
      webp: null,
      jpeg: new Blob([new Uint8Array(8)], { type: "image/jpeg" })
    });
    const file = new File([JPEG_HEADER], "shot.jpg", { type: "image/jpeg" });
    const result = await prepareImageFile(file, tinyOptions());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.file.name).toBe("logo.jpg");
    expect(result.file.type).toBe("image/jpeg");
  });
});
