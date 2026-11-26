# Typography

Source: https://developer.apple.com/design/human-interface-guidelines/typography (read 2026-11-26)

## Sizes (quoted)
| Platform | Default size | Minimum size |
|---|---|---|
| iOS, iPadOS | 17 pt | 11 pt |

## iOS Dynamic Type — "Large (default)" (verbatim table)
| Style | Weight | Size (pt) | Leading (pt) | Emphasized weight |
|---|---|---|---|---|
| Large Title | Regular | 34 | 41 | Bold |
| Title 1 | Regular | 28 | 34 | Bold |
| Title 2 | Regular | 22 | 28 | Bold |
| Title 3 | Regular | 20 | 25 | Semibold |
| Headline | Semibold | 17 | 22 | Semibold |
| Body | Regular | 17 | 22 | Semibold |
| Callout | Regular | 16 | 21 | Semibold |
| Subhead | Regular | 15 | 20 | Semibold |
| Footnote | Regular | 13 | 18 | Semibold |
| Caption 1 | Regular | 12 | 16 | Semibold |
| Caption 2 | Regular | 11 | 13 | Semibold |

## Guidance (quoted)
- "If you use a custom font with a thin weight, aim for larger than the recommended sizes to increase legibility."
- "Keep text truncation to a minimum as font size increases."
- Accessibility page: "give people the option to enlarge text by at least 200 percent."

## Web mapping for Hazy
1 pt ≈ 1 CSS px on iOS Safari at default zoom. Express sizes in `rem` with 17px Body (`html { font-size: 106.25% }` → 1rem = 17px),
use `-apple-system, BlinkMacSystemFont, system-ui` (SF on Apple devices, no font download), and on iOS Safari consider
`font: -apple-system-body` to inherit Dynamic Type.
