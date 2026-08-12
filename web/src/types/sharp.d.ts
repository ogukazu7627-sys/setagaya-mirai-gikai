declare module "sharp" {
  type SharpFailOn = "none" | "truncated" | "error" | "warning";

  type SharpInput = Buffer | Uint8Array | ArrayBuffer | string;

  type SharpOptions = {
    failOn?: SharpFailOn;
  };

  type ResizeOptions = {
    width?: number;
    withoutEnlargement?: boolean;
  };

  type WebpOptions = {
    quality?: number;
    effort?: number;
  };

  interface Sharp {
    resize(options: ResizeOptions): Sharp;
    rotate(): Sharp;
    toBuffer(): Promise<Buffer>;
    webp(options: WebpOptions): Sharp;
  }

  export default function sharp(
    input?: SharpInput,
    options?: SharpOptions
  ): Sharp;
}
