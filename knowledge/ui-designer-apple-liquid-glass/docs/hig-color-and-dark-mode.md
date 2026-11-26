# Color and Dark Mode

Sources (read 2026-11-26):
- Color: https://developer.apple.com/design/human-interface-guidelines/color
- Dark Mode: https://developer.apple.com/design/human-interface-guidelines/dark-mode

## Color (quoted)
- "Make sure all your app's colors work well in light, dark, and increased contrast contexts." Custom colors need "light and dark
  variants, and an increased contrast option for each variant."
- "Avoid redefining the semantic meanings of dynamic system colors … don't use the separator color as a text color."
- **Liquid Glass color**: "By default, Liquid Glass has no inherent color, and instead takes on colors from the content directly
  behind it." "Apply color sparingly … To emphasize primary actions, apply color to the background rather than to symbols or text."
  "Refrain from adding color to the background of multiple controls."
- "If your app features colorful backgrounds or visually rich content, prefer a monochromatic appearance for toolbars and tab bars."
- "Make sure … its default or resting state — like the top of a screen of scrollable content — maintains clear legibility."
- iOS background sets: system (primary/secondary/tertiary) vs grouped (for grouped lists).

## Dark Mode (quoted)
- "Avoid offering an app-specific appearance setting." Follow the system (`prefers-color-scheme`).
- "At a minimum, make sure the contrast ratio between colors is no lower than 4.5:1."
- Test "in Dark Mode with Increase Contrast and Reduce Transparency turned on (both separately and together)."
- "Soften the color of white backgrounds" in images shown in Dark Mode.

## Hazy consequence
Risk colours exist in light, dark and high-contrast variants; badges are solid fills (not glass) and always carry an icon and a
text label. No in-app theme switch in v1 (HIG); follow the system.
