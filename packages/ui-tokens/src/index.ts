// DietHaven brand palette (CLAUDE.md §7). Hex values are approximations
// pending confirmation against DietHaven's brand sheet (§9 open item).
export const colors = {
  primary: "#2E6B3E", // green — nav bars, primary buttons, headers, active states
  primaryDark: "#21502E", // hover/active state for primary surfaces
  secondary: "#E07A1F", // orange — CTAs, alerts, active tab indicators (used sparingly)
  secondaryDark: "#B8620F", // hover/active state for secondary surfaces
  neutralBackground: "#F5F5F0", // card backgrounds, table stripes, section backgrounds
  neutralBackgroundAlt: "#E6F0E8",
  textBody: "#222222",
  textHeading: "#1F4A2C",
} as const;

export type ColorToken = keyof typeof colors;
