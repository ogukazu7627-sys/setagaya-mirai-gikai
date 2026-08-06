"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { DEFAULT_COUNCILOR_ICON_URL } from "@/lib/markdown/councilor-icon-config";

type CouncilorAvatarImageProps = Omit<
  ImageProps,
  "alt" | "height" | "src" | "width"
> & {
  alt?: string;
  fallbackSrc?: string;
  size: number;
  src: string | null | undefined;
};

export function CouncilorAvatarImage({
  alt = "",
  fallbackSrc = DEFAULT_COUNCILOR_ICON_URL,
  loading = "lazy",
  onError,
  priority,
  size,
  sizes = `${size}px`,
  src,
  unoptimized = true,
  ...props
}: CouncilorAvatarImageProps) {
  const resolvedSrc = src || fallbackSrc;
  const [currentSrc, setCurrentSrc] = useState(resolvedSrc);

  useEffect(() => {
    setCurrentSrc(resolvedSrc);
  }, [resolvedSrc]);

  const handleError: NonNullable<ImageProps["onError"]> = (event) => {
    onError?.(event);

    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    }
  };

  return (
    <Image
      {...props}
      alt={alt}
      height={size}
      loading={priority ? undefined : loading}
      onError={handleError}
      priority={priority}
      sizes={sizes}
      src={currentSrc}
      unoptimized={unoptimized}
      width={size}
    />
  );
}
