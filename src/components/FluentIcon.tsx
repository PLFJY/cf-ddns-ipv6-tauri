import { createElement } from "react";
import type { CSSProperties } from "react";

interface FluentIconProps {
  icon: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
}

export function FluentIcon(props: FluentIconProps) {
  const { icon, width = 20, height = width, style } = props;
  const normalized = icon.trim();
  const isImageUrl =
    /^https?:\/\//i.test(normalized) ||
    /^data:image\//i.test(normalized) ||
    /^blob:/i.test(normalized);

  if (isImageUrl) {
    return createElement("img", {
      src: normalized,
      width,
      height,
      alt: "",
      style: {
        objectFit: "contain",
        verticalAlign: "middle",
        ...style
      }
    } as Record<string, string | number | CSSProperties>);
  }

  return createElement("iconify-icon", {
    icon: normalized,
    width: String(width),
    height: String(height),
    style
  } as Record<string, string | CSSProperties>);
}
