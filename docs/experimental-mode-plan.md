# Experimental Mode Visual Variants Plan

## Roadmap

1. Document visual specs for the themed variants (complete in this doc).
2. Prototype the core calendar styles for each variant behind experimental mode toggles.
3. Polish motion, micro-interactions, and responsiveness per theme.
4. Run an accessibility and usability pass (contrast, focus states, keyboard cues).

## Variant Specs

### Aurora Glass
- **Palette**: Deep indigo base, aurora gradients (teal, violet, magenta), white accents.
- **Typography**: Sans-serif with subtle weight shifts; gradient-filled headers.
- **Key Treatments**:
  - Multi-layered glassmorphic cards with varying blur intensities.
  - Smooth aurora gradient animation in the background.
  - Light refraction hover states and animated focus rings.
  - Floating UI elements with soft shadows; glowing pill buttons.
  - Optional parallax particle layer for depth.

### Paper Atlas
- **Palette**: Cream paper background, ink blues, muted accents.
- **Typography**: Serif headings paired with clean sans-serif body text.
- **Key Treatments**:
  - Textured backgrounds and layered “paper” cards.
  - Soft shadows and ink-like hover states.
  - Sticky-note widgets and hand-drawn iconography.
  - Slightly offset elements to mimic editorial layouts.

### Solar Dawn
- **Palette**: Sunrise gradients (peach to amber), warm neutrals, bold accent yellow.
- **Typography**: Oversized hero headings, rounded sans-serif for body.
- **Key Treatments**:
  - Color-blocked month headers and floating chips.
  - Animated day transitions with fade/slide inspired by dawn light.
  - Rounded geometry and generous corner radii.
  - Ambient glow around “today” indicator.

### Calm Pastels
- **Palette**: Muted pastels (lavender, mint, blush), soft neutrals.
- **Typography**: Light-weight sans-serif, ample line spacing.
- **Key Treatments**:
  - Gentle drop shadows and rounded corners.
  - Meditative animations such as slow pulsing around the current day.
  - Smooth scale transitions on hover.
  - Minimal icon set with softened strokes.

### Zen Monoline
- **Palette**: Monochrome base with minimal accent (charcoal, off-white, muted gold).
- **Typography**: Condensed uppercase for labels, classic sans-serif body.
- **Key Treatments**:
  - Line-art approach with thin strokes and dotted separators.
  - Soft shading to highlight the active week.
  - Low-saturation icons, minimal color density.
  - Focus states indicated via weight and line thickness changes.

### Neomorphic Zen
- **Palette**: Neutral grays (#E5E7EB), soft whites, accent teal (#14B8A6).
- **Typography**: Minimalist sans-serif with variable font weights.
- **Key Treatments**:
  - Neumorphic embossed/debossed calendar cells.
  - Inner/outer shadows for soft depth.
  - Organic rounded corners and ambient light simulation.
  - Subtle tactile feedback animations.

### Paper Craft
- **Palette**: Warm paper tones, ink blues (#1E40AF), red accents (#DC2626).
- **Typography**: Handwritten-style optional accents with clean sans-serif body.
- **Key Treatments**:
  - Layered paper cards with realistic textures.
  - Page flip animations between months.
  - Torn edge effects and paper grain overlays.
  - Ink-style hover/active states.

### Liquid Motion
- **Palette**: Ocean blues (#0891B2), coral (#FB7185), sandy beige (#FEF3C7).
- **Typography**: Rounded sans-serif with playful weight variations.
- **Key Treatments**:
  - Morphing liquid blob shapes on interaction.
  - Wave animations and spring physics transitions.
  - Ripple effects on clicks and flowing gradient transitions.
  - Fluid highlight sweep across the active row.

### Botanical Minimal
- **Palette**: Sage green (#6B8E6F), terracotta (#C2634D), cream (#FAF5F0).
- **Typography**: Serif display headings with clean sans body.
- **Key Treatments**:
  - Subtle leaf pattern overlays and natural texture.
  - Organic, asymmetric shapes framing the calendar.
  - Hand-drawn botanical accents per season.
  - Seasonal color transitions for month headers.

## Implementation Notes

- Build each theme as a variant entry for `useExperimentalMode`, toggled via `data-experimental-variant` attributes.
- Use CSS custom properties to swap palettes, blur strength, and corner radii per theme.
- Layer micro-interactions: hover states, spring animations, and focus cues consistent with each style.
- Ensure responsive layouts adapt gracefully; test keyboard navigation and screen-reader semantics.
