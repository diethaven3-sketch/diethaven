const { colors } = require("@repo/ui-tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: colors.primary, dark: colors.primaryDark },
        secondary: { DEFAULT: colors.secondary, dark: colors.secondaryDark },
        surface: colors.neutralBackground,
        "surface-alt": colors.neutralBackgroundAlt,
        body: colors.textBody,
        heading: colors.textHeading,
      },
      fontFamily: {
        heading: ["Figtree_600SemiBold"],
        "heading-bold": ["Figtree_700Bold"],
        body: ["NotoSans_400Regular"],
        "body-medium": ["NotoSans_500Medium"],
      },
    },
  },
  plugins: [],
}