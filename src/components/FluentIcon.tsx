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
  return createElement("iconify-icon", {
    icon,
    width: String(width),
    height: String(height),
    style
  } as Record<string, string | CSSProperties>);
}
