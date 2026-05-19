/** BMC: Channels (experience layer) — how value is experienced visually/interactively. */

export type UiUxConstraints = {
  brandTone: string;
  accessibilityLevel: "wcag-a" | "wcag-aa" | "wcag-aaa" | "unspecified";
  designConstraints: string[];
  supportedLocales: string[];
};

export function emptyUiUxConstraints(): UiUxConstraints {
  return {
    brandTone: "",
    accessibilityLevel: "unspecified",
    designConstraints: [],
    supportedLocales: [],
  };
}
