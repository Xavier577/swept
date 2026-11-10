# Swept — Brand and interface system

## Identity

**Swept** makes space for the work that comes next. It is a precise, approachable developer utility: quiet when idle, clear when scanning, and explicit when changing files.

**Primary line:** A little room to build.
**Product description:** A local Mac cleaner for developer caches, build artifacts, and the files you no longer need.
**Action language:** Scan my Mac → Review cleanup → Clean now.

The existing broom and sparkle mark is the canonical identity. Its blue and cyan are the foundation of the product. Earlier abstract-S, wind, and negative-space ideas are exploration history, not competing production logos.

## Mark

Use the supplied light/dark rounded-square app icons. Preserve the broom's angled handle and five sweeping bristles. Cyan sparkles communicate the result of cleaning, not magic or automatic safety.

- Keep one-quarter of the mark's width as clear space around a standalone mark.
- Use the complete app icon at 32 px and above. At smaller sizes, use a simple broom glyph rather than shrinking fine details.
- Keep the wordmark in the native system sans, semibold, with slightly tight tracking. Do not add a separate display typeface.
- Decorative sparkles are sparse. Never use them to label destructive actions or imply a file is safe to remove.
- Pair the mark with a dark or light surface that preserves its silhouette. Do not place it on busy imagery.

## Color

The logo's blue/cyan identity takes precedence over the original purple-first exploration. Purple remains available for category differentiation.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| Canvas | `#F6F8FB` | `#151C26` | Main workspace |
| Surface | `#FFFFFF` | `#1D2633` | Cards and dialogs |
| Sidebar | `#F0F3F8` | `#18212D` | Navigation |
| Primary text | `#192A3E` | `#E5EDF8` | Headings and content |
| Secondary text | `#516177` | `#AEBDD0` | Supporting descriptions |
| Muted text | `#778498` | `#8A9AB1` | Metadata |
| Action blue | `#2764D8` | `#6A9DF4` | Primary actions, selected navigation |
| Spark cyan | `#21A7C7` | `#67D8ED` | Small accents and capacity visualization |
| Violet | `#8B5CF6` | `#8B5CF6` | Secondary category accent |
| Success | `#237954` | `#7ACBA1` | Completed outcomes, rebuildable labels |
| Caution | `#98621C` | `#E4B86F` | Review-required states |
| Destructive | `#C44347` | `#ED797E` | Permanent actions and failures |

Use semantic variables from `desktop/frontend/src/tokens.css`, never copied colors in individual view styles. Category colors identify tools; they do not communicate cleanup risk. Pair status colors with words/icons.

The only major gradient is the blue-to-cyan disk-capacity visualization. Surfaces remain quiet. Avoid purple/pink gradient hero panels and decorative glow around controls.

## Typography and spacing

- Native SF/system stack for all UI. Native monospace for paths and command output.
- Page heading: 30 px / 1.2, semibold, −1.1 px tracking.
- Section heading: 15–16 px, semibold.
- Main UI text: 12–13 px; compact metadata: 10–11 px. Reserve 9 px for nonessential sidebar labels and supplementary details.
- Metrics use tabular figures where useful. Format binary sizes as KiB/MiB/GiB; do not label binary units as decimal GB.
- Spacing uses a 4 px foundation with 8, 12, 16, 24, and 32 px steps. Keep screen margins and repeated row padding consistent.
- Radius: 7 px for controls, 11 px for compact panels, 15 px for cards, 18 px for dialogs.
- Shadows are subtle. Borders and spacing establish hierarchy before elevation.

## Reusable primitives

`UiButton`, `UiCard`, `UiBadge`, `UiField`, and `UiDialog` define the shared behavior and presentation. Feature components compose these primitives.

- **Buttons:** primary blue for the next useful step, neutral for alternatives, ghost for tertiary actions, red only for confirmed permanent removal. Labels contain verbs. Busy states disable duplicate actions.
- **Fields:** visible labels, native controls, useful hints, persistent focus indication. Paths are selectable text.
- **Cards:** common surface, border, padding, and radii. Clickable category cards look interactive without turning every panel into a button.
- **Badges:** Rebuildable, Review first, Personal data, Protected. “Rebuildable” does not mean unused or consequence-free.
- **Dialogs:** native modal focus handling, descriptive heading, complete review list, explicit result of each action, non-destructive escape/cancel. During cleanup, closing is disabled.
- **File rows:** checkbox, identity/path, reason, modified date, size, and Show in Finder. Avoid hiding the information needed to make a cleanup decision.

Shared feature components include ItemTable, CleanupReview, and ScanProgress. New views reuse these rather than recreating similar controls with local styling.

## Experience

The overview answers: how much space is available, what a scan found, and where to look next. A first-run screen offers one useful action without requiring Full Disk Access before any value is available.

Categories explain developer-specific content. Space explorer supports deliberate discovery of personal files. Preferences control project roots, exclusions, and appearance. History records per-item filesystem outcomes.

- Start scans on request. Show real progress, never a fabricated percentage.
- Never preselect data. Explicitly selecting rebuildable items is allowed.
- Show incomplete scans and permission failures as incomplete, not as zero usage.
- Distinguish estimated size, removed file size, and observed free-space change.
- Permanent cleanup is the primary review mode. It requires acknowledgement; personal data requires typing CLEAN. Optional Trash uses its own description and action label.
- Tool-owned storage uses the owning tool with a separate review. Docker volumes and simulator data receive explicit data-loss wording.
- Do not describe modification time as last use, or all detected bytes as junk.

## Voice

Be calm, specific, and brief. Speak about the user's files and choices rather than implementation details.

Prefer: “Your first sweep starts here.” “Select the items you no longer need.” “This item changed since the scan. Scan again.” “Some items need attention.”

Avoid: “Your Mac is dangerously cluttered.” “100% safe cleanup.” “We found 45 GB of junk.” “Space reclaimed” when files only moved to Trash.

## Accessibility and motion

Use native controls, keyboard-visible focus, labelled icon buttons, and readable contrast. Keep navigation and action areas stable while scanning. Include risk words as well as colors. Dialogs trap focus through the browser's native modal behavior. Honor reduced-motion preferences. Animation is reserved for indeterminate work and small state transitions.

Treat contrast, text scaling, keyboard navigation, and minimum-window layout as continuing release checks. Do not claim an accessibility certification without an audit.
