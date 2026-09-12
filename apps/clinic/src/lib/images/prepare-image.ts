const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_PIXELS = 16_000_000;
const QUALITY_STEPS = [0.92, 0.84, 0.76, 0.68, 0.6, 0.52];

type ImageMime = "image/png" | "image/jpeg" | "image/webp";
type OutputMime = "image/webp" | "image/jpeg";

type PrepareImageOptions = {
  maxInputBytes: number;
  maxOutputBytes: number;
  maxEdge: number;
  name?: string;
};

type PrepareImageResult =
  | { ok: true; file: File }
  | { ok: false; error: string };

const DEFAULT_IMAGE_OPTIONS: PrepareImageOptions = {
  maxInputBytes: 8 * 1024 * 1024,
  maxOutputBytes: 512 * 1024,
  maxEdge: 1024,
  name: "image"
};

const LOGO_IMAGE_OPTIONS: PrepareImageOptions = {
  ...DEFAULT_IMAGE_OPTIONS,
  name: "logo"
};

const formatBytes = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const sniffImageMime = (bytes: Uint8Array): ImageMime | null => {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
};

const fitWithin = (width: number, height: number, maxEdge: number) => {
  const longest = Math.max(width, height);

  if (longest <= maxEdge) {
    return { width, height };
  }

  const scale = maxEdge / longest;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: OutputMime, quality: number) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });

const flattenOnWhite = (source: HTMLCanvasElement) => {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0);
  return canvas;
};

const encodeUnderCap = async (
  canvas: HTMLCanvasElement,
  type: OutputMime,
  maxOutputBytes: number
) => {
  const source = type === "image/jpeg" ? flattenOnWhite(canvas) : canvas;

  if (!source) {
    return null;
  }

  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(source, type, quality);

    if (!blob) {
      return null;
    }

    if (blob.size <= maxOutputBytes) {
      return blob;
    }
  }

  return null;
};

const drawBitmap = (bitmap: ImageBitmap, maxEdge: number) => {
  if (bitmap.width * bitmap.height > MAX_PIXELS) {
    return { ok: false as const, error: "Use a smaller image." };
  }

  if (typeof document === "undefined") {
    return { ok: false as const, error: "Could not process that image." };
  }

  const size = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");

  if (!context) {
    return { ok: false as const, error: "Could not process that image." };
  }

  const downscaling = size.width < bitmap.width || size.height < bitmap.height;
  context.imageSmoothingEnabled = downscaling;

  if (downscaling) {
    context.imageSmoothingQuality = "high";
  }

  context.drawImage(bitmap, 0, 0, size.width, size.height);
  return { ok: true as const, canvas };
};

const prepareImageFile = async (
  file: File,
  options: PrepareImageOptions
): Promise<PrepareImageResult> => {
  if (file.size === 0) {
    return { ok: false, error: "Choose an image file." };
  }

  if (file.size > options.maxInputBytes) {
    return {
      ok: false,
      error: `Use an image smaller than ${formatBytes(options.maxInputBytes)}.`
    };
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (!sniffImageMime(header)) {
    return { ok: false, error: "Use a PNG, JPEG, or WebP image." };
  }

  if (typeof createImageBitmap !== "function") {
    return { ok: false, error: "Could not process that image." };
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, error: "That file is not a valid image." };
  }

  try {
    const drawn = drawBitmap(bitmap, options.maxEdge);

    if (!drawn.ok) {
      return drawn;
    }

    for (const type of ["image/webp", "image/jpeg"] as const) {
      const blob = await encodeUnderCap(drawn.canvas, type, options.maxOutputBytes);

      if (!blob) {
        continue;
      }

      const extension = type === "image/webp" ? "webp" : "jpg";
      const name = `${options.name ?? "image"}.${extension}`;

      return {
        ok: true,
        file: new File([blob], name, { type, lastModified: Date.now() })
      };
    }

    return {
      ok: false,
      error: `Could not shrink that image under ${formatBytes(options.maxOutputBytes)}.`
    };
  } finally {
    bitmap.close();
  }
};

export {
  DEFAULT_IMAGE_OPTIONS,
  IMAGE_ACCEPT,
  LOGO_IMAGE_OPTIONS,
  fitWithin,
  prepareImageFile,
  sniffImageMime
};
export type { PrepareImageOptions, PrepareImageResult };
