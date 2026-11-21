# Stockwise UI Guidelines

**Version:** 1.0 Draft  
**Status:** Approved  
**Audience:** Developers and AI coding agents

---

## 1. Purpose

This document defines how frontend interfaces must be designed and implemented in Stockwise.

The goal is to keep the application consistent, usable, accessible, and maintainable as the number of pages increases.

This document complements:

- `design-system.md` — visual rules
- `dashboard-spec.md` — dashboard requirements

---

## 2. Core UI Principles

### 2.1 Reuse Before Creation

Before creating a component:

1. Search the existing codebase.
2. Identify a similar component.
3. Check whether it can be reused.
4. Extend it only when necessary.

Do not create duplicate components for the same purpose.

### 2.2 Consistent Patterns

Similar operations must behave similarly.

For example:

- Product search must follow the same pattern as supplier search.
- Status badges must use the same colors.
- Create and edit forms must share the same field patterns.
- Confirmation dialogs must follow the same layout.
- Pagination must work consistently.

### 2.3 Functional UI

A UI must not be considered complete only because it looks correct.

Important controls must perform their intended actions.

Do not leave:

- Fake buttons.
- Dead dropdowns.
- Decorative search inputs.
- Filters that do not filter.
- Pagination that does not change data.
- Actions without feedback.

If backend integration is unavailable, clearly separate temporary mock behavior from production behavior.

---

## 3. Page Structure

Use a consistent page structure.

### Standard management page

1. Page header.
2. Main action area.
3. Optional summary metrics.
4. Search and filter toolbar.
5. Main content.
6. Pagination if applicable.

### Page header

The page header should contain:

- Page title.
- Short description when needed.
- Primary action.
- Optional secondary actions.

Avoid descriptions that repeat the page title.

### Section structure

Group content by business purpose.

Do not place unrelated content into one large card.

Avoid unnecessary nested cards.

---

## 4. Navigation

### Sidebar

Navigation must be grouped by business domain.

Suggested groups:

- Overview
- Sales
- Inventory
- Products
- Procurement
- Locations
- People
- Reports
- Settings

The exact navigation items depend on permissions and project stages.

### Rules

- Keep navigation labels short.
- Use consistent icons.
- Clearly identify the active route.
- Keep active states subtle but visible.
- Avoid deeply nested navigation.
- Do not show inaccessible navigation items as active.
- Do not rely on icon-only navigation on desktop unless the sidebar is intentionally collapsed.

### Tenant context

Users may belong to more than one company.

The interface must support an explicit company context.

Company switching must:

1. Display available companies.
2. Allow selection.
3. Validate the user's membership on the backend.
4. Update the active tenant context.
5. Refresh tenant-dependent data.
6. Avoid displaying data from the previous company after switching.

Branch context must also be clear when the current page is branch-scoped.

Never assume that selecting a company or branch in the frontend grants access.

---

## 5. Dashboard Guidelines

The dashboard is an overview of business performance.

It should not replace detailed management pages.

### Dashboard content

- Sales overview.
- Transaction count.
- Average transaction value.
- Inventory alerts.
- Top-selling products.
- Recent sales.
- Sales trend.

### Rules

- Show important information first.
- Use realistic and meaningful metrics.
- Avoid excessive cards.
- Avoid redundant data.
- Do not use charts without a purpose.
- Do not display fake live data as real information.
- Show the selected date range.
- Show the relevant company and branch context.
- Show empty states when the company has no data.

---

## 6. Data Tables

### Table layout

- Keep rows compact.
- Keep column widths reasonable.
- Avoid excessively tall rows.
- Use consistent cell padding.
- Keep the header readable.
- Use subtle borders.
- Use alignment based on content type.

### Alignment

| Content      | Alignment                         |
| ------------ | --------------------------------- |
| Names        | Left                              |
| Descriptions | Left                              |
| Dates        | Left or consistent date alignment |
| Currency     | Right                             |
| Quantity     | Right                             |
| Percentages  | Right                             |
| Status       | Left                              |
| Actions      | Right                             |

### Actions

Row actions should use a consistent pattern.

Use a dropdown menu for secondary actions when multiple actions exist.

Do not display destructive actions prominently unless they are frequently required.

### Search and filtering

- Search should have a clear scope.
- Filters must show their active state.
- Users must be able to clear filters.
- Filters should not unexpectedly reset unrelated controls.
- Use server-side filtering for large datasets.

### Pagination

- Use predictable pagination.
- Preserve filters when changing pages.
- Display the current page when appropriate.
- Avoid loading all records for large datasets.

---

## 7. Forms

### Form structure

Forms must be divided into logical sections.

Use a single-column layout for most forms.

Use multiple columns only when the fields are related and the layout improves efficiency.

### Field rules

Each field should have:

- Label.
- Input.
- Optional helper text.
- Validation message when required.

### Validation

- Validate on the backend.
- Use frontend validation for immediate feedback.
- Backend validation remains authoritative.
- Preserve user input after validation errors.
- Avoid vague errors.

### Form submission

When submitting:

1. Validate the form.
2. Disable duplicate submission when necessary.
3. Show progress.
4. Display the result.
5. Preserve input if submission fails.
6. Close the dialog or navigate only after successful submission.

### Destructive operations

Actions such as deleting or deactivating records require appropriate confirmation.

Confirmation messages must explain the operation.

Do not use generic messages such as "Are you sure?"

---

## 8. Feedback and States

Every page must handle the following states where applicable.

### Loading

Use skeletons or a compact loading indicator.

Do not show misleading placeholder values as actual data.

### Empty

Explain why the area is empty.

Provide a useful next action when possible.

Example:

"No products yet."

"Add your first product to start managing your inventory."

### Error

Explain what failed in clear language.

Provide a retry action when possible.

Avoid exposing internal stack traces.

### Success

Use appropriate confirmation.

Avoid unnecessary success dialogs for routine actions.

Use toast notifications where appropriate.

### Partial failure

If one section fails but the entire page is not blocked, preserve the working sections and explain the failed section.

---

## 9. Confirmation and Dialogs

Use dialogs for:

- Confirming destructive operations.
- Short forms.
- Important decisions.
- Focused workflows.

Do not use dialogs for:

- Large forms.
- Complex multi-step workflows.
- Content that requires extensive navigation.

For complex workflows, use a dedicated page.

Dialogs must:

- Have a clear title.
- Explain the purpose.
- Have clearly labeled actions.
- Support keyboard interaction.
- Close predictably.
- Prevent accidental destructive actions.

---

## 10. Permissions and Visibility

Frontend permissions improve usability, but backend permissions provide security.

The UI should:

- Hide actions the user cannot perform when appropriate.
- Avoid showing restricted navigation.
- Handle unauthorized responses.
- Avoid assuming that hidden controls provide security.
- Refresh permissions when company context changes.

Do not hardcode role-based UI logic throughout the application.

Use a centralized permission-aware approach.

---

## 11. Branch Scope

Stockwise supports company-wide and branch-scoped operations.

The UI must make the scope clear.

Examples:

- Company-wide inventory overview.
- Branch inventory.
- Branch sales.
- Branch users.
- Branch transfers.

A user must not confuse a company-wide value with a branch-specific value.

Use explicit labels such as:

- All branches
- Makassar Branch
- Central Warehouse

Do not rely on context that is only visible on another page.

---

## 12. Responsive Behavior

### Desktop

- Use the full sidebar.
- Use multi-column layouts when appropriate.
- Keep tables readable.

### Tablet

- Collapse or reduce the sidebar.
- Reduce unnecessary spacing.
- Keep page actions accessible.

### Mobile

- Use a compact navigation pattern.
- Stack sections.
- Keep controls usable.
- Support table overflow where required.
- Avoid tiny buttons.
- Do not force desktop layouts into narrow screens.

---

## 13. Accessibility

All interfaces must:

- Use semantic elements.
- Support keyboard navigation.
- Have visible focus states.
- Use accessible labels.
- Maintain adequate contrast.
- Support screen readers where practical.
- Avoid color-only status communication.
- Respect reduced-motion settings.

---

## 14. React Implementation Guidelines

### Components

- Keep components focused.
- Prefer reusable components for repeated patterns.
- Avoid overly abstract components.
- Avoid unnecessarily large page components.
- Separate presentational UI from business logic.

### State

Use the correct state management approach.

- Local state for local UI behavior.
- TanStack Query for server state.
- URL state for shareable filters and pagination where appropriate.
- Form state for form interactions.

Do not duplicate server data in local state without a clear reason.

### API

- Centralize API communication.
- Reuse typed API functions.
- Handle errors consistently.
- Avoid fetch logic scattered across components.
- Never trust client-side tenant IDs for authorization.

### TypeScript

- Avoid `any`.
- Use meaningful types.
- Type API responses.
- Avoid unnecessary type complexity.
- Use shared types only when the sharing boundary is clear.

### Dependencies

Do not install new packages without a clear reason.

Use the existing stack.

---

## 15. AI Agent Workflow

Before implementing a page, the AI agent must:

1. Read `CLAUDE.md`.
2. Read `docs/design/design-system.md`.
3. Read `docs/design/ui-guidelines.md`.
4. Read the relevant page specification.
5. Inspect existing components.
6. Identify reusable patterns.
7. Plan the implementation.

During implementation:

1. Reuse existing components.
2. Follow established tokens.
3. Implement real interactions.
4. Handle all required states.
5. Avoid unnecessary dependencies.

After implementation:

1. Run the development server.
2. Inspect the page in the browser.
3. Test interactions.
4. Check console errors.
5. Check desktop and mobile layouts.
6. Fix visible problems.
7. Run relevant tests.

The agent must not report a UI task as complete based only on successful compilation.

---

## 16. Definition of Done

A UI task is complete when:

- [ ] Requirements are implemented.
- [ ] Existing components were reused where appropriate.
- [ ] Design tokens were followed.
- [ ] All controls work.
- [ ] Loading state exists where needed.
- [ ] Empty state exists where needed.
- [ ] Error state exists where needed.
- [ ] Success feedback exists where needed.
- [ ] Permission behavior is handled.
- [ ] Responsive layout was checked.
- [ ] No unintended overflow exists.
- [ ] No console errors remain.
- [ ] Tests pass where applicable.
- [ ] Browser verification is complete.
- [ ] Remaining limitations are documented.

---

## 17. Updating UI Guidelines

Update this document when a new project-wide UI pattern is introduced.

Do not create new conventions for a single page unless the page genuinely requires them.

Stockwise must remain visually and behaviorally consistent as new modules are introduced.
