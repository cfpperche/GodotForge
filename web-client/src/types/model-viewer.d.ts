import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        alt?: string;
        poster?: string;
        "auto-rotate"?: boolean;
        "camera-controls"?: boolean;
        "shadow-intensity"?: string;
        loading?: "auto" | "lazy" | "eager";
      };
    }
  }
}
