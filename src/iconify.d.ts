import type { CSSProperties, DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "iconify-icon": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        icon: string;
        width?: string;
        height?: string;
        style?: CSSProperties;
      };
    }
  }
}

export {};
