# Stockwise Design System

**Version:** 1.0 Draft  
**Status:** Approved direction — implementation values may evolve  
**Product:** Stockwise  
**Purpose:** Define a consistent visual language for Stockwise's retail management application.

---

## 1. Product Identity

Stockwise is a retail operations platform for businesses that manage products, inventory, branches, suppliers, sales, and employees.

The interface must feel:

- Professional
- Reliable
- Calm
- Efficient
- Modern
- Practical

The interface must prioritize operational clarity over decoration.

Stockwise is a business tool. Users may spend several hours per day using it. The interface must reduce fatigue and make information easy to scan.

### Design principles

1. Clarity over decoration.
2. Consistency over novelty.
3. Information density without clutter.
4. Meaningful colors only.
5. Predictable interactions.
6. Responsive layouts.
7. Accessible contrast and interaction states.

---

## 2. Visual Direction

### General style

- Modern SaaS admin interface.
- Light theme as the default.
- Neutral surfaces.
- Dark, understated sidebar.
- Green as the primary brand accent.
- Minimal shadows.
- Thin borders.
- Small and consistent corner radii.
- Compact, readable tables.
- Clear typography hierarchy.

Avoid:

- Excessive gradients.
- Glassmorphism.
- Decorative backgrounds.
- Excessive rounded cards.
- Oversized headings.
- Unnecessary animations.
- Colorful interfaces without meaning.
- Large empty areas that reduce information density.

---

## 3. Color System

Use semantic color tokens instead of raw color values in components.

### Brand

| Token                | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `primary`            | Primary actions, active elements, brand emphasis |
| `primary-foreground` | Text/icons on primary surfaces                   |
| `primary-hover`      | Hover state for primary actions                  |

Brand direction: muted emerald green.

### Neutral

| Token                | Purpose                      |
| -------------------- | ---------------------------- |
| `background`         | Application background       |
| `foreground`         | Main text                    |
| `surface`            | Cards, panels, dialogs       |
| `surface-muted`      | Subtle secondary surfaces    |
| `border`             | Borders and separators       |
| `muted`              | Secondary text               |
| `muted-foreground`   | Supporting text              |
| `sidebar`            | Sidebar background           |
| `sidebar-foreground` | Sidebar text                 |
| `sidebar-active`     | Active navigation background |

Neutral colors must carry most of the interface.

### Semantic colors

| Token           | Meaning                       |
| --------------- | ----------------------------- |
| `success`       | Completed, healthy, positive  |
| `warning`       | Attention required            |
| `danger`        | Destructive, failed, critical |
| `info`          | Informational                 |
| `success-muted` | Soft success background       |
| `warning-muted` | Soft warning background       |
| `danger-muted`  | Soft danger background        |
| `info-muted`    | Soft information background   |

Semantic colors must not be used for decoration.

### Usage rules

- Green: primary actions and positive states.
- Red: errors, destructive actions, critical stock conditions.
- Amber: warnings and pending conditions.
- Blue: informational conditions.
- Gray: neutral states.

Do not use color alone to communicate meaning. Include text, icons, or labels.

### Implementation mapping

Tokens live in `frontend/src/index.css` and are used through Tailwind utilities. Most names come from shadcn/ui.

| Design token | Tailwind utility |
| --- | --- |
| `primary`, `primary-foreground`, `primary-hover` | `bg-primary`, `text-primary-foreground`, `hover:bg-primary-hover` |
| `background`, `foreground` | `bg-background`, `text-foreground` |
| `surface` | `bg-card` (also `bg-popover` for menus) |
| `surface-muted`, `muted` | `bg-muted` |
| `muted-foreground` | `text-muted-foreground` |
| `border` | `border-border` (default border colour) |
| `danger` | `text-destructive` / `bg-destructive` (alias `text-danger`) |
| `success`, `warning`, `info` | `text-success`, `text-warning`, `text-info` |
| `*-muted` | `bg-success-muted`, `bg-warning-muted`, `bg-danger-muted`, `bg-info-muted` |
| `sidebar`, `sidebar-foreground`, `sidebar-active` | `bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-accent` |

Status badges use the `Badge` variants `success`, `warning`, `info` and `destructive`, which pair the muted background with the base colour.

---

## 4. Typography

### Font

Preferred font: **Inter**.

Use a clean sans-serif font suitable for data-heavy applications.

### Typography hierarchy

| Style            | Usage                                  |
| ---------------- | -------------------------------------- |
| Page title       | Main page heading                      |
| Section title    | Major content sections                 |
| Subheading       | Secondary sections                     |
| Body             | Normal content                         |
| Body small       | Supporting information                 |
| Caption          | Metadata and secondary labels          |
| Numeric emphasis | Important financial or quantity values |

### Typography rules

- Page titles must be clear and compact.
- Avoid oversized headings.
- Use medium or semibold weights for emphasis.
- Use regular weight for most text.
- Do not use bold for every table value.
- Use tabular numerals for financial and quantity data where possible.
- Maintain consistent line height.

Suggested font sizes:

| Token       | Size |
| ----------- | ---: |
| `text-xs`   | 12px |
| `text-sm`   | 14px |
| `text-base` | 16px |
| `text-lg`   | 18px |
| `text-xl`   | 20px |
| `text-2xl`  | 24px |
| `text-3xl`  | 30px |

Use 14px as the common size for admin interface content. Use 16px for standard body text where readability requires it.

### Capitalization

- **Title Case** for short UI text: page and section headings, card and dialog titles, buttons, action links, form labels, column headers, menu and navigation items, badges, select options and stat labels. Examples: "Add User", "Created At", "Forgot Password?", "Deactivate This User?".
- Keep minor words lowercase unless they come first: a, an, the, and, or, of, to, in, on, for, by, with. Example: "Log In to Stockwise", "Back to Log In".
- **Sentence case** for longer copy: descriptions, helper text, placeholders, empty-state text, alerts, toasts and error messages. Example: "Manage all registered users across the Stockwise platform."
- Sidebar group labels are written in Title Case and displayed in uppercase with CSS.

---

## 5. Spacing

Use a consistent spacing scale based on 4px.

| Token      | Value |
| ---------- | ----: |
| `space-1`  |   4px |
| `space-2`  |   8px |
| `space-3`  |  12px |
| `space-4`  |  16px |
| `space-5`  |  20px |
| `space-6`  |  24px |
| `space-8`  |  32px |
| `space-10` |  40px |
| `space-12` |  48px |

### Usage

- Between icon and label: 8px.
- Between form fields: 16px.
- Inside compact components: 8–12px.
- Between content sections: 24–32px.
- Page padding: 24px desktop.
- Compact page padding: 16px.
- Card padding: 16–20px.

Avoid arbitrary spacing values unless the layout requires them.

---

## 6. Borders, Radius, and Shadows

### Border radius

| Token       | Value | Usage                               |
| ----------- | ----: | ----------------------------------- |
| `radius-sm` |   4px | Small controls, compact elements    |
| `radius-md` |   6px | Inputs, buttons, dropdowns          |
| `radius-lg` |   8px | Panels, cards                       |
| `radius-xl` |  12px | Large dialogs or special containers |

Avoid excessively rounded components.

**Implementation mapping.** shadcn components use one Tailwind step larger than the design name, so the utilities are set to give the design values:

| Tailwind utility | Value | Used by |
| --- | ---: | --- |
| `rounded-sm`, `rounded-md` | 4px | Menu items, badges (`radius-sm`) |
| `rounded-lg` | 6px | Buttons, inputs, dropdowns (`radius-md`) |
| `rounded-xl` | 8px | Cards, panels (`radius-lg`) |
| `rounded-2xl` and larger | 12px | Large dialogs (`radius-xl`) |

Stockwise should look like a professional business application, not a mobile social app.

### Borders

- Use 1px borders for separation.
- Prefer borders over shadows.
- Use subtle neutral borders.
- Do not outline every nested element.

### Shadows

Use shadows sparingly.

Recommended uses:

- Dropdown menus.
- Popovers.
- Dialogs.
- Floating elements.

Cards should usually rely on surface color and border, not heavy shadows.

---

## 7. Layout

### Application shell

Stockwise uses a consistent application shell:

- Sidebar navigation.
- Top header.
- Main content area.
- Optional contextual actions.
- Optional page-level filters.

### Sidebar

- Dark neutral background.
- Fixed width on desktop.
- Collapsible when appropriate.
- Clear active navigation state.
- Consistent icon alignment.
- Company and branch context visible.
- Navigation grouped by business domain.

### Header

The header may contain:

- Sidebar toggle.
- Breadcrumbs.
- Current company context.
- Current branch context when applicable.
- Notifications.
- User menu.

Do not add header elements without a clear purpose.

### Main content

- Use a consistent page container.
- Keep content aligned to a common left edge.
- Avoid unnecessary nested containers.
- Use responsive widths.
- Tables should use available space efficiently.

---

## 8. Buttons

### Variants

- Primary
- Secondary
- Outline
- Ghost
- Destructive
- Link

### Rules

- Primary buttons represent the main action on a page.
- Do not use multiple competing primary buttons in the same action group.
- Destructive actions must use the destructive variant.
- Icon-only buttons must have accessible labels.
- Buttons must show disabled and loading states when appropriate.
- Button sizes must remain consistent.

### Hierarchy

Use one main action per context whenever possible.

Example:

Product list:

- Primary: Add product
- Secondary: Import
- Ghost: Row actions

---

## 9. Inputs and Forms

Form elements include:

- Text inputs.
- Number inputs.
- Selects.
- Comboboxes.
- Search inputs.
- Checkboxes.
- Radio groups.
- Switches.
- Date pickers.
- Textareas.

### Rules

- Labels must be visible.
- Required fields must be identifiable.
- Errors must be close to the affected field.
- Placeholder text must not replace labels.
- Inputs must have consistent heights.
- Validation must be understandable.
- Disabled and read-only states must be visually distinct.

---

## 10. Data Tables

Tables are a core part of Stockwise.

They must support efficient scanning and daily operations.

### Rules

- Compact but readable rows.
- Consistent column alignment.
- Left-align descriptive text.
- Right-align numeric values.
- Use tabular numerals for numbers.
- Keep actions predictable.
- Use subtle row separators.
- Avoid unnecessary decoration.
- Support horizontal overflow when required.
- Preserve important columns when possible.

### Table elements

- Toolbar.
- Search.
- Filters.
- Column headers.
- Rows.
- Row actions.
- Pagination.
- Empty state.
- Loading state.
- Error state.

---

## 11. Status Indicators

Use badges for statuses such as:

- Active
- Inactive
- Draft
- Pending
- Completed
- Failed
- Low stock
- Out of stock
- Paid
- Unpaid
- Cancelled

Statuses must use consistent colors across the application.

Do not create page-specific status colors.

Current mapping (`Badge` variant, always with an icon and text):

| Status | Variant |
| --- | --- |
| Active, Verified, Completed, Paid | `success` |
| Pending, Unverified, Draft | `warning` |
| Inactive, Failed, Cancelled, Out of stock | `destructive` |
| Platform roles and informational labels (e.g. Superadmin, Platform Admin) | `info` |

---

## 12. Icons

Use Lucide icons.

Rules:

- Use icons from the same icon library.
- Keep icon sizes consistent.
- Use icons with a clear meaning.
- Do not use emojis as interface icons.
- Do not use icons only for decoration.
- Icon-only controls must have accessible labels.

---

## 13. Charts

Charts must support decisions.

They should:

- Use a clear title.
- Use readable axes.
- Use tooltips where useful.
- Avoid unnecessary visual elements.
- Use consistent color semantics.
- Include an empty state when no data exists.
- Avoid misleading scales.

Do not add charts only to make the dashboard look impressive.

---

## 14. Responsive Design

Stockwise must support:

- Desktop.
- Laptop.
- Tablet.
- Mobile.

### Desktop

Use the full application layout.

### Tablet

- Reduce spacing.
- Allow sidebar collapse.
- Keep important actions visible.
- Avoid excessive horizontal scrolling.

### Mobile

- Sidebar becomes a mobile navigation pattern.
- Cards stack.
- Tables may scroll horizontally or use an appropriate compact layout.
- Important actions remain accessible.
- Avoid overflowing content.

Responsive design must be intentional. Do not simply shrink the desktop layout.

---

## 15. Interaction States

Every interactive component must support the appropriate states:

- Default.
- Hover.
- Focus.
- Active.
- Disabled.
- Loading.
- Success.
- Error.

Use consistent transitions.

Avoid unnecessary animation. Transitions should communicate state changes or improve feedback.

---

## 16. Accessibility

- Use semantic HTML.
- Support keyboard navigation.
- Provide visible focus states.
- Use accessible labels.
- Maintain readable contrast.
- Do not rely only on color.
- Use appropriate dialog behavior.
- Support screen readers where practical.
- Respect reduced-motion preferences.

---

## 17. Design System Enforcement

- Reuse existing components.
- Reuse design tokens.
- Do not introduce arbitrary colors.
- Do not create new spacing scales.
- Do not create page-specific button styles.
- Do not duplicate existing components.
- New components must follow existing conventions.
- Update this document when the design system changes intentionally.

---

## 18. Design System Status

This is the initial Stockwise design system.

Values and components may evolve during implementation. However, changes must be intentional and applied consistently.

The objective is not to prevent design improvements.

The objective is to prevent inconsistent design decisions.
