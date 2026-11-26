# Materials and Liquid Glass

Source: Apple Human Interface Guidelines, Materials: https://developer.apple.com/design/human-interface-guidelines/materials
(read 2026-11-26; page change log notes "December 16, 2025: Updated guidance for Liquid Glass")

## What it is (quoted)
- "Liquid Glass forms a distinct functional layer for controls and navigation elements — like tab bars and sidebars — that floats
  above the content layer."
- "Liquid Glass allows content to scroll and peek through from beneath these elements … while maintaining legibility."

## Rules (quoted)
- "**Don't use Liquid Glass in the content layer.**" Use standard materials for content-layer elements. Exception: transient
  controls such as sliders and toggles take on Liquid Glass "when a person activates it."
- "**Use Liquid Glass effects sparingly.** … Limit these effects to the most important functional elements in your app."
- Two variants: **regular** ("blurs and adjusts the luminosity of background content to maintain legibility … Use the regular
  variant when … components have a significant amount of text, such as alerts, sidebars, or popovers") and **clear** ("highly
  translucent … for components that float above media backgrounds").
- Clear over bright content: "consider adding a dark dimming layer of 35% opacity."
- Appearance adapts to system settings, "like if people … turn on accessibility settings that reduce transparency or increase contrast".

## Standard materials (iOS)
Four: ultra-thin, thin, regular (default), thick. "Thicker materials, which are more opaque, can provide better contrast for text
and other elements with fine features. Thinner materials … help people retain their context." "Avoid using quaternary on top of
the thin and ultraThin materials, because the contrast is too low."

## Translating to Hazy (web)
| HIG concept | Hazy web implementation |
|---|---|
| Liquid Glass functional layer | tab bar, sheet chrome, toolbar only: `backdrop-filter: blur() saturate()` + translucent tint |
| Content layer | forecast cards on solid or near-solid surfaces (no glass) |
| Regular variant | default glass, with enough tint for text |
| Clear variant + 35% dim | only over the radar/hero image, if any |
| Reduce Transparency | `@media (prefers-reduced-transparency: reduce)` → solid surface |
| Increase Contrast | `@media (prefers-contrast: more)` → stronger borders and solid fills |
