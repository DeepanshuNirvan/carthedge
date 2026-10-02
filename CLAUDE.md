# Front-End Workflow & Quality Control

## Active UI Tools
- Architecture & Tokens: @claude-plugins-official/frontend-design
- Spatial Reasoning & Layout: design-taste-frontend (TasteSkill)
- Quality Control & Auditing: Impeccable CLI

## The Anti-Slop Workflow
Before modifying or creating any user interface element, follow this 3-step pipeline:

1. **PLANNING (frontend-design + taste-skill):**
   - Analyze the target component. Intercept generic layouts (e.g., symmetric 3-card grids, purple/cyan neon hero glows).
   - Use `design-taste-frontend` rules to draft asymmetric layouts, tight typography scaling, and deliberate negative space.

2. **EXECUTION:**
   - Style with Tailwind utilities from the token preset (`frontend/src/theme/preset.ts` → `tokens.css`). No raw hex, no arbitrary values (`text-[#...]`, `p-[13px]`); missing value → add a token first.
   - Restrict the color palette to strict brand neutrals with a single accent color (the brand jade).

3. **AUDITING (Impeccable):**
   - Run the `/impeccable critique` routine on the file.
   - Run `/impeccable polish` to lock down precise spacing grids and eliminate raw, unstyled elements.
