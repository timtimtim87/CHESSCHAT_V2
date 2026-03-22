# Obsidian Slate: Design System

### 1. Overview & Creative North Star
**Creative North Star: The Grandmaster’s Study**
Obsidian Slate is a high-performance design system built for focus, strategy, and intellectual depth. It moves away from the generic "SaaS Blue" aesthetic toward a deep, ink-like darkness punctuated by "Electric Mint" accents. The system leverages high-contrast typography and a dense but breathable editorial layout to convey authority and precision. It avoids traditional structural boundaries, instead using tonal shifts and "ghost" containers to organize information.

### 2. Colors
The palette is rooted in an ultra-dark neutral core (#050608), allowing the primary Teal (#2DD4BF) to function as a surgical highlight rather than a dominant wash.

*   **Primary (Electric Mint):** Used for critical actions, status indicators, and branding.
*   **Surface Hierarchy:**
    *   **Level 0 (Deep Background):** #050608 - The base canvas.
    *   **Level 1 (Subtle Inset):** #0b0c10 - Used for secondary cards and sidebar backgrounds.
    *   **Level 2 (Active Surface):** #1a1c20 - Used for floating elements and high-tier containers.
*   **The "No-Line" Rule:** Sectioning is achieved through color shifts (e.g., a Level 1 container on a Level 0 background). When borders are unavoidable, they must use `outline-variant` (#1f2126) or a 10-20% opacity white/gray to maintain a soft, non-rigid feel.
*   **The Glass & Gradient Rule:** Navigation headers must utilize a 80% opacity background with a 12px+ backdrop blur to create a sense of floating layers.

### 3. Typography
Obsidian Slate utilizes a dual-font strategy to balance character with readability.

*   **Display & Headlines:** *Plus Jakarta Sans*. This typeface is used in heavy weights (800) with tight tracking (-0.02em to -0.05em) to create an editorial, punchy impact.
    *   **Hero Size:** 3rem (48px) - Extrabold.
    *   **Section Headers:** 1.875rem (30px) - Black.
*   **Body & Labels:** *Inter*. Chosen for its technical clarity and legibility at small sizes.
    *   **Standard Body:** 0.875rem (14px) - Medium.
    *   **Utility/Label:** 10px - Black (Uppercase, 0.2em tracking). This "Micro-Label" style is a signature element of the system, used for metadata and eyebrow text.

### 4. Elevation & Depth
Depth in Obsidian Slate is realized through physical layering and lighting rather than simple dropshadows.

*   **The Layering Principle:** Surfaces are stacked from #050608 (Bottom) to #1a1c20 (Top).
*   **Shadow System:**
    *   **Shadow-SM:** Subtle definition for small cards.
    *   **Shadow-XL/2XL:** Used for primary content sections and floating panels.
    *   **Shadow-Inner:** Used for "punched-out" utility icons to create a tactile, recessed feel.
*   **The "Ghost Border" Fallback:** A soft `border-gray-800/20` is the standard for separating major UI zones, ensuring the darkness doesn't become a "black hole."

### 5. Components
*   **Buttons:**
    *   **Primary:** High-contrast Teal (#2DD4BF) with black text. Sharp 0.5rem (8px) corners.
    *   **Ghost Utility:** Transparent background with `outline-variant` border and micro-label text.
*   **Input Fields:** Deep recessed backgrounds (#050608 at 50% opacity) with 1px `outline-variant` borders. Focus states introduce a subtle `ring-primary/10`.
*   **Profile Avatars:** Square-rounded (8px) rather than circles to maintain the architectural feel of the system.
*   **Navigation:** Vertical sidebar with 80px width, utilizing high-contrast active states (Teal background tint) and tooltips for minimized cognitive load.

### 6. Do's and Don'ts
**Do:**
*   Use uppercase 10px labels with high letter-spacing for all metadata.
*   Apply `backdrop-blur` to any sticky or floating header element.
*   Use primary teal for "positive" achievements (e.g., Wins) and high-contrast red for "danger" zones.

**Don't:**
*   Never use standard 1px #000 borders; they break the "Obsidian" immersion.
*   Avoid using large blocks of white text; use `on_surface_variant` (Slate Gray) for long-form body text to reduce eye strain.
*   Do not use rounded-full (pill) shapes for anything other than status badges or toggles.