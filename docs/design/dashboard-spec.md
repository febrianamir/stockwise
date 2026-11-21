# Stockwise Dashboard Specification

**Version:** 1.0 Draft  
**Status:** Approved for initial UI design  
**Module:** Dashboard  
**Route:** `/dashboard`  
**Audience:** Product, frontend, backend, and AI coding agents

---

## 1. Overview

The Stockwise dashboard provides a quick overview of a retail business's operational and sales performance.

It helps company owners and managers answer:

1. How much did we sell?
2. How many transactions did we process?
3. How are sales performing over time?
4. Which products sell the most?
5. Which products need attention because of low stock?
6. What happened recently?

The dashboard is an overview.

It must not replace detailed sales, inventory, product, or reporting pages.

---

## 2. Goals

### Primary goals

- Provide a quick view of business performance.
- Highlight problems that require attention.
- Provide access to important operational pages.
- Reduce the time needed to understand daily performance.
- Support company-wide and branch-level visibility.

### Non-goals

The initial dashboard will not:

- Provide advanced analytics.
- Perform inventory adjustments.
- Process sales.
- Process purchase orders.
- Process refunds.
- Replace the reporting module.
- Provide complex financial accounting.
- Display predictive analytics.
- Display unsupported metrics.

---

## 3. Target Users

### Owner

Needs an overview of the entire company.

Typical questions:

- How is the business performing?
- How much revenue did we generate?
- Which branches are performing well?
- Which products are selling?
- What needs attention?

### Admin

Needs company-wide visibility and access to operational information.

### Manager

Needs information relevant to assigned branches.

The dashboard must respect user permissions and branch assignments.

### Other roles

Cashiers and inventory staff may receive a simplified dashboard or be redirected to their primary workflow in later stages.

The initial dashboard is primarily designed for owners, admins, and managers.

---

## 4. Context and Scope

The dashboard operates within an active company context.

A user may belong to multiple companies.

The dashboard must display the active company.

If the user has branch-level access, the dashboard must respect their authorized branches.

### Scope selector

Depending on user access, the dashboard may support:

- All branches.
- A specific branch.

The default selection:

- Users with company-wide access: All branches.
- Users with restricted branch access: Their authorized branch or branches.

The backend must validate the scope.

The frontend must not be trusted to define access permissions.

---

## 5. Page Layout

### Desktop layout

The dashboard uses the standard Stockwise application shell.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Sidebar     │ Header: Company | Branch | Notifications | Profile   │
│            ├──────────────────────────────────────────────────────┤
│            │ Dashboard                    [Date range] [Export*]  │
│            │ Overview of your business performance                 │
│            │                                                      │
│            │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│            │ │ Revenue  │ │ Orders   │ │ Avg Sale │ │ Products │ │
│            │ │          │ │          │ │          │ │          │ │
│            │ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│            │                                                      │
│            │ ┌──────────────────────────────┐ ┌───────────────────┐ │
│            │ │                            │ │ Inventory Alerts  │ │
│            │ │     Sales Overview          │ │                   │ │
│            │ │     Chart                  │ │ Low stock          │ │
│            │ │                            │ │ Out of stock      │ │
│            │ └──────────────────────────────┘ └───────────────────┘ │
│            │                                                      │
│            │ ┌──────────────────────────────┐ ┌───────────────────┐ │
│            │ │ Top-selling products        │ │ Recent sales      │ │
│            │ │                              │ │                   │ │
│            │ └──────────────────────────────┘ └───────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

\* Export is optional and may be excluded from the initial implementation.

### Layout rules

- Page title at the top.
- Date range and branch filters in the page toolbar.
- KPI cards below the page header.
- Main sales chart and inventory alerts below the KPIs.
- Top products and recent sales in the lower section.
- Avoid unnecessary nesting.
- Maintain consistent spacing.
- Use responsive columns.

---

## 6. Page Header

### Title

Dashboard

### Description

"Overview of your business performance."

### Controls

- Date range selector.
- Branch selector when applicable.
- Optional export action in a future iteration.

### Date range presets

- Today
- Yesterday
- Last 7 days
- Last 30 days
- This month
- Last month
- Custom range

### Default range

Last 7 days.

### Behavior

Changing the date range must update all date-dependent dashboard data.

Changing the branch must update all branch-dependent dashboard data.

The dashboard must clearly display the selected filters.

---

## 7. KPI Cards

The dashboard initially contains four KPI cards.

### 7.1 Total Sales

Purpose:

Show the total value of completed sales during the selected period.

Display:

- Total sales amount.
- Comparison with the previous equivalent period.
- Percentage change when calculation is valid.

Example:

Rp12,450,000

+12.4% compared with previous period

Rules:

- Use the company's currency.
- Do not include cancelled sales.
- Refund handling must follow the sales reporting rules.
- The comparison period must have the same duration as the selected period.
- Do not calculate a percentage change from zero without a defined rule.

### 7.2 Transactions

Purpose:

Show the number of completed sales transactions.

Display:

- Transaction count.
- Comparison with previous period.

Rules:

- Count completed transactions.
- Exclude cancelled transactions.
- Use consistent transaction status rules.

### 7.3 Average Transaction Value

Purpose:

Show the average value per completed transaction.

Formula:

Average Transaction Value = Net Sales / Completed Transaction Count

Display:

- Currency amount.
- Comparison with previous period where meaningful.

If the transaction count is zero, display a clear empty value such as `—`.

### 7.4 Products Sold

Purpose:

Show the total quantity of product units sold.

Display:

- Total quantity.
- Comparison with previous period.

Rules:

- Use sale item quantities.
- Apply return handling consistently.
- Support different units of measure in future iterations.

---

## 8. Sales Overview Chart

### Purpose

Show sales performance over the selected period.

### Chart type

Initial implementation: line chart or area chart.

Preferred: clean line chart with a subtle fill, if the chart library supports it without visual clutter.

### Data

- Sales amount.
- Time interval based on selected date range.

Suggested intervals:

| Date range     | Interval      |
| -------------- | ------------- |
| Today          | Hour          |
| Yesterday      | Hour          |
| Last 7 days    | Day           |
| Last 30 days   | Day           |
| This month     | Day           |
| Last month     | Day           |
| Longer periods | Week or month |

### Requirements

- Display readable labels.
- Show tooltip values.
- Avoid overcrowding the X-axis.
- Use the company currency.
- Handle periods with zero sales.
- Use the same date range as the dashboard.
- Support branch filtering.
- Avoid misleading chart scales.

### Empty state

When no sales exist:

"Sales data will appear here once your business starts processing transactions."

---

## 9. Inventory Alerts

### Purpose

Highlight products that need attention.

### Summary

Display:

- Low-stock product count.
- Out-of-stock product count.

### Low stock

A product is considered low stock when:

Available stock is greater than zero and below its configured reorder threshold.

### Out of stock

A product is out of stock when its available quantity is zero or below, subject to the inventory policy.

### Widget contents

- Product name.
- SKU.
- Branch or warehouse.
- Available quantity.
- Reorder threshold.
- Status.

### Behavior

- Show a limited number of products.
- Prioritize out-of-stock products.
- Provide a link to inventory management.
- Allow the user to navigate to the product or inventory detail.

### Rules

- Inventory must be scoped to the selected branch or authorized branches.
- Do not show inventory from inaccessible branches.
- Products without a configured reorder threshold must not automatically be considered low stock unless a defined business rule applies.

---

## 10. Top-Selling Products

### Purpose

Identify products with the highest sales volume during the selected period.

### Initial ranking

Rank by quantity sold.

### Display

- Product name.
- SKU.
- Quantity sold.
- Sales value.
- Optional thumbnail.

### Rules

- Exclude cancelled sales.
- Apply returns consistently.
- Respect the selected date range.
- Respect branch scope.
- Limit the initial list to five products.

### Empty state

"No sales data available for this period."

---

## 11. Recent Sales

### Purpose

Provide quick visibility into recent transactions.

### Display

- Receipt or transaction number.
- Date and time.
- Branch.
- Cashier.
- Total amount.
- Status.

### Initial behavior

Display the five most recent completed sales.

### Actions

- View sale details.
- Navigate to the sales module.

### Rules

- Respect user permissions.
- Do not expose data from unauthorized branches.
- Do not display unnecessary customer information.

---

## 12. Dashboard Navigation

The dashboard should provide links to relevant modules.

Examples:

- View all sales.
- View inventory.
- View products.
- View reports.
- View branches.

Navigation must respect permissions.

---

## 13. Data and API Requirements

The dashboard must consume aggregated backend data.

The frontend must not load all sales or inventory records and calculate dashboard metrics locally.

### Suggested endpoint

`GET /api/dashboard/overview`

### Query parameters

| Parameter    | Description                          |
| ------------ | ------------------------------------ |
| `date_from`  | Start of selected period             |
| `date_to`    | End of selected period               |
| `branch_id`  | Optional branch scope                |
| `comparison` | Whether comparison data is requested |

The backend must validate branch access.

### Suggested response structure

```json
{
  "period": {
    "from": "2026-11-12",
    "to": "2026-11-19"
  },
  "comparison_period": {
    "from": "2026-11-05",
    "to": "2026-11-12"
  },
  "summary": {
    "total_sales": 12450000,
    "transaction_count": 384,
    "average_transaction_value": 32421.88,
    "products_sold": 921,
    "sales_change_percent": 12.4,
    "transactions_change_percent": 8.2,
    "average_transaction_change_percent": 3.9,
    "products_sold_change_percent": -2.1
  },
  "sales_chart": [
    {
      "date": "2026-11-12",
      "sales": 1420000
    },
    {
      "date": "2026-11-13",
      "sales": 1780000
    }
  ],
  "inventory_alerts": {
    "low_stock_count": 12,
    "out_of_stock_count": 4,
    "items": []
  },
  "top_products": [],
  "recent_sales": []
}
```

This is an illustrative contract. It must be reviewed against the actual sales and inventory models before implementation.

### API rules

- All amounts must use the company's currency.
- Tenant isolation must be enforced.
- Branch restrictions must be enforced.
- Date filtering must use the company's timezone consistently.
- Aggregation must happen on the backend.
- The frontend must handle missing or empty datasets.
- Comparison values must follow defined reporting rules.

---

## 14. Business Rules

### Sales

- Only eligible completed sales are included.
- Cancelled sales are excluded.
- Returns and refunds must be treated consistently.
- The dashboard must not count cancelled transactions as revenue.

### Branch scope

- All-branch totals must include only authorized branches.
- Branch totals must not accidentally duplicate transactions.
- Branch selection must be validated server-side.

### Date handling

- Use the company's timezone for reporting boundaries.
- Store timestamps consistently in UTC.
- Convert reporting boundaries appropriately.
- Prevent off-by-one-day errors.

### Inventory

- Inventory metrics must reflect the selected location scope.
- Low-stock rules must use configured thresholds.
- Stock adjustments must not silently alter historical sales metrics.

### Comparison

- Compare against the immediately preceding equivalent period.
- Percentage change must follow a consistent formula.
- If the previous period is zero, show an appropriate value rather than infinity or a misleading percentage.

---

## 15. UI States

### Loading

Display skeletons for:

- KPI cards.
- Sales chart.
- Inventory alerts.
- Top products.
- Recent sales.

Avoid blocking the entire page if sections can load independently.

### Empty dashboard

When no sales exist:

- Show zero or empty metrics as appropriate.
- Show a helpful message.
- Provide navigation to relevant setup or operational pages.
- Do not fabricate sales data.

### Error

If the overview request fails:

- Display a clear error.
- Provide a retry action.
- Avoid showing stale data as if it were current.

If a specific widget fails:

- Keep other working widgets visible.
- Display the error inside the affected widget.

### Filter changes

When the date or branch changes:

- Update the active filter immediately.
- Fetch the correct data.
- Prevent stale data from being mistaken for current results.
- Avoid unnecessary duplicate requests.

---

## 16. Responsive Layout

### Desktop

KPI cards:

Four columns when sufficient space is available.

Main section:

- Sales chart: approximately two-thirds width.
- Inventory alerts: approximately one-third width.

Bottom section:

- Top-selling products.
- Recent sales.

### Tablet

- KPI cards: two columns.
- Main section may stack.
- Keep filters accessible.

### Mobile

- KPI cards: one or two columns depending on available width.
- Chart takes full width.
- Inventory alerts take full width.
- Bottom widgets stack.
- Tables must remain usable.
- Avoid horizontal page overflow.

---

## 17. Suggested Frontend Component Structure

```text
src/
├── features/
│   └── dashboard/
│       ├── api/
│       │   └── getDashboardOverview.ts
│       ├── components/
│       │   ├── DashboardHeader.tsx
│       │   ├── DashboardFilters.tsx
│       │   ├── DashboardKpiGrid.tsx
│       │   ├── SalesOverviewChart.tsx
│       │   ├── InventoryAlertsWidget.tsx
│       │   ├── TopProductsWidget.tsx
│       │   ├── RecentSalesWidget.tsx
│       │   └── DashboardSkeleton.tsx
│       ├── hooks/
│       │   └── useDashboardOverview.ts
│       ├── types/
│       │   └── dashboard.ts
│       └── pages/
│           └── DashboardPage.tsx
```

Use existing shared components where appropriate.

Do not create separate implementations of shared cards, tables, badges, or loading states.

---

## 18. Acceptance Criteria

### Layout

- [ ] Dashboard uses the standard Stockwise application shell.
- [ ] Sidebar and header are consistent with other pages.
- [ ] Page title and description are visible.
- [ ] Layout is responsive.
- [ ] No unintended overflow.

### Filters

- [ ] Date range is visible.
- [ ] Date presets work.
- [ ] Custom date range works.
- [ ] Branch filter works when permitted.
- [ ] Data updates after filter changes.
- [ ] Unauthorized branch access is prevented.

### Metrics

- [ ] Total sales is correct.
- [ ] Transaction count is correct.
- [ ] Average transaction value is correct.
- [ ] Products sold is correct.
- [ ] Comparisons are calculated correctly.
- [ ] Empty periods are handled.

### Sales chart

- [ ] Chart uses the selected date range.
- [ ] Chart uses the selected branch scope.
- [ ] Tooltips are readable.
- [ ] Empty state is implemented.

### Inventory alerts

- [ ] Low-stock count is correct.
- [ ] Out-of-stock count is correct.
- [ ] Alert list is scoped correctly.
- [ ] Product navigation works.

### Top products

- [ ] Ranking is correct.
- [ ] Return handling is correct.
- [ ] Branch and date filters apply.
- [ ] Empty state is implemented.

### Recent sales

- [ ] Recent transactions are correctly sorted.
- [ ] Transaction data is accurate.
- [ ] Sale details navigation works.
- [ ] Branch restrictions are respected.

### Quality

- [ ] Loading states are implemented.
- [ ] Error states are implemented.
- [ ] Empty states are implemented.
- [ ] Permission handling is implemented.
- [ ] Browser verification is complete.
- [ ] Tests pass.

---

## 19. Implementation Order

The dashboard should be built in the following order:

### Phase 1 — Static UI

- Application shell.
- Sidebar.
- Header.
- Dashboard layout.
- KPI cards.
- Widget layout.
- Responsive behavior.

Use clearly identified mock data.

### Phase 2 — Dashboard API

- Define response contract.
- Implement backend aggregation.
- Validate tenant context.
- Validate branch scope.
- Implement reporting date logic.

### Phase 3 — Integration

- Connect frontend to API.
- Add loading states.
- Add empty states.
- Add error handling.
- Add filters.

### Phase 4 — Verification

- Compare displayed values with known test data.
- Verify tenant isolation.
- Verify branch access.
- Verify date boundaries.
- Verify responsive layout.
- Verify performance.

---

## 20. Future Enhancements

These features are not part of the initial dashboard.

- Branch performance comparison.
- Revenue versus cost analysis.
- Gross profit.
- Gross margin.
- Inventory valuation.
- Cash flow overview.
- Sales by category.
- Sales by payment method.
- Hourly sales heatmap.
- Forecasting.
- Advanced filtering.
- Dashboard customization.
- Widget rearrangement.
- Export dashboard reports.

Add these features only after their underlying business data is reliable.

---

## 21. Definition of Done

The initial dashboard is complete when:

- It provides an accurate overview of business performance.
- All widgets follow the Stockwise design system.
- Data respects tenant and branch access rules.
- Filters work correctly.
- Loading, empty, and error states are implemented.
- Widgets navigate to their relevant modules.
- The interface works on desktop and mobile.
- Backend aggregation is verified against known data.
- Integration tests pass.
- Browser inspection is complete.

The dashboard must provide reliable information.

Visual polish must not hide incorrect business data.
