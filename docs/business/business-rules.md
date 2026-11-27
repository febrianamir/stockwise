# Stockwise business overview and rules

This document describes the business domain Stockwise is built for: who uses it, the main entities, and the rules every feature must respect. It is the source of truth for domain behaviour, for both `backend/` and `frontend/`.

Read it before designing or building any feature. If a feature changes a rule, settles an open question or defines a new one, update this document in the same piece of work.

Rules have IDs (for example `CO-1`, `SEC-2`) so that specs, tests, reviews and commit bodies can refer to them.

## 1. What Stockwise is

Stockwise is a retail management platform with point-of-sale (POS). Businesses use it to manage products, inventory, sales, purchases, stores and warehouses from one system, with many cashiers across many locations.

It must work for businesses of different sizes:

| Business type | Shape |
| --- | --- |
| Single-store business | One company, one branch, a few employees |
| Growing retail business | One company, several stores, centralised management |
| Multi-branch business | Several branches and warehouses, each with its own employees, inventory and operations |
| Owner or manager | Monitors and manages operations across locations |

A single-store business must not feel the weight of multi-branch features. Multi-branch and warehouse capabilities should stay out of the way until a company needs them.

## 2. Main entities

```
User ──< Company membership >── Company ──< Branch
                │                   │
                │                   └──< Warehouse
                │
                └──< Branch / warehouse access >── Branch or Warehouse
```

- A **user** joins a **company** through a **company membership**, which carries the user's role in that company.
- A **company** owns zero or more **branches** and **warehouses**. Together these are the company's **locations**. A warehouse is stored as a branch of type `warehouse` (§2.3).
- **Branch access** links a membership to the locations that user may work in. Because warehouses are branches, the same access covers them.

### 2.1 Company (tenant)

A company is a business that uses Stockwise. "Tenant" and "company" mean the same thing. Examples: ABC Retail, XYZ Mart.

Each company has its own products, branches, warehouses, employees, suppliers, inventory, sales, purchases and settings. One company must never access another company's data.

### 2.2 Branch

A branch is a physical store owned by a company, where customers are served and sales happen.

| Company | Branch |
| --- | --- |
| ABC Retail | Makassar Store |
| ABC Retail | Gowa Store |
| ABC Retail | Maros Store |

A branch may have its own inventory, sales, employees, cash registers and stock movements.

### 2.3 Warehouse

A warehouse is a physical location owned by a company that stores stock and supplies branches. It is not a store front.

| Company | Warehouse |
| --- | --- |
| ABC Retail | Central Warehouse |
| ABC Retail | Makassar Warehouse |

A warehouse may have its own inventory, employees and stock movements: receiving purchases from suppliers, transferring stock to branches or other warehouses, and stock adjustments.

**Model.** A warehouse is a branch with `type = warehouse`: the same table, the same code and status rules, and the same access model ([branch management](../features/branch-management/prd.md)). The WH rules below apply to branches of that type. Later modules decide what a warehouse can't do, for example processing sales.

Some resources are company-wide and others belong to a branch or warehouse. The scope of each resource is decided when its module is designed and recorded in [section 5](#5-resource-scope).

### 2.4 User

A user is a person who can log in to Stockwise. A user is not owned by any one company. The same person can work for several businesses with a different role in each:

| User | Company | Role |
| --- | --- | --- |
| Rina | ABC Retail | Manager |
| Rina | XYZ Mart | Cashier |

### 2.5 Company membership

A company membership connects a user to a company and defines the user's role there (Owner, Admin, Manager or Cashier). Memberships are the foundation of authorisation. Belonging to one company never grants access to another.

### 2.6 Branch and warehouse access

A membership does not automatically give access to every location. Each membership has a **branch scope**: `all` (every location, including ones added later) or `selected` (only the locations granted to it). The **Owner** has implicit access to every branch and warehouse of their company (BR-3), whatever is stored. New Admins start with `all` and can be restricted; new Managers and Cashiers start with `selected` and no locations until someone assigns them ([branch management](../features/branch-management/prd.md) BM-3, BM-4).

| User | Company | Role | Location access |
| --- | --- | --- | --- |
| John | ABC Retail | Owner | All branches and warehouses (implicit) |
| Alice | ABC Retail | Manager | Makassar Store |
| Bob | ABC Retail | Cashier | Gowa Store |
| Dewi | ABC Retail | Manager | Central Warehouse |

## 3. Business rules

### Company

| ID | Rule |
| --- | --- |
| CO-1 | A company always has exactly one owner. The database enforces at most one; a company is created with its owner and ownership only moves (CM-3). |
| CO-2 | Company data is isolated from every other company. |
| CO-3 | A user needs a valid membership to access any of a company's resources. The only exception is a **Superadmin**, who acts at platform level without a membership (see [4.1](#41-initial-roles)). |
| CO-4 | Membership is checked on the backend, on every request that touches company data. |
| CO-5 | Knowing or guessing a company's ID is never enough to access it. |
| CO-6 | A suspended company cannot perform normal business operations: every company-scoped request is rejected for every member, including the owner. Its data is kept unchanged, and a Superadmin can reactivate it (CM-5, CM-7). |

### Branch

| ID | Rule |
| --- | --- |
| BR-1 | A branch belongs to exactly one company. |
| BR-2 | Branch codes are unique within a company. Different companies may reuse the same code. |
| BR-3 | A user cannot access a branch without valid branch access. An Owner has implicit access to every branch of their company, including branches created later, without explicit branch-access records. |
| BR-4 | An inactive branch cannot process normal sales or stock operations: those writes are rejected with `BRANCH_INACTIVE`. Its data stays readable, and members with "Manage branches" can still edit and reactivate it. Deactivation needs a reason and keeps location access (BM-6). |
| BR-5 | Branch data is never exposed across company boundaries. |

### Warehouse

| ID | Rule |
| --- | --- |
| WH-1 | A warehouse belongs to exactly one company. |
| WH-2 | Warehouse codes are unique within a company. |
| WH-3 | A user cannot access a warehouse without valid warehouse access. An Owner has implicit access to every warehouse of their company, as in BR-3. |
| WH-4 | An inactive warehouse cannot process normal stock operations (receiving, transfers, adjustments), as for BR-4. |
| WH-5 | Warehouse data is never exposed across company boundaries. |
| WH-6 | Stock moves only between locations of the same company. |

### Membership

| ID | Rule |
| --- | --- |
| MB-1 | A user can belong to several companies. |
| MB-2 | A user's role can differ between companies. |
| MB-3 | A user can have access to several branches and warehouses within a company. |
| MB-4 | Removing a membership immediately revokes the user's access to that company, including all of its branches and warehouses. |
| MB-5 | No action may leave a company without an owner. This covers removing, demoting or deactivating an owner's membership, and deleting or deactivating the owner's user account. Since each company has exactly one owner (CO-1), these actions are blocked while the user owns any company; transfer ownership first. Platform user deactivation enforces this (CM-14). |
| MB-6 | Ownership is transferred in one transaction: the previous owner becomes Admin and an active member with an active account becomes owner. Committed data never has zero or two owners (CM-13). |

### Security

| ID | Rule |
| --- | --- |
| SEC-1 | Tenant isolation is enforced by the backend. |
| SEC-2 | Frontend filters, hidden buttons and disabled fields are not security controls. |
| SEC-3 | Every company, branch and warehouse ID sent by the frontend is validated against the user's memberships and location access. |
| SEC-4 | A denied request reveals nothing about another company's data, including whether a record exists: company-scoped routes answer `404` to non-members ([tenancy](../architecture/tenancy.md)). |
| SEC-5 | Critical actions are recorded in an audit trail (`audit_logs`, introduced by [platform user management](../features/user-management/erd.md)). |

## 4. Roles and permissions

### 4.1 Initial roles

| Role | Level | Responsibility |
| --- | --- | --- |
| Superadmin | Platform | Administers the Stockwise platform itself, across all businesses |
| Owner | Company, all locations | Full business access and ownership-level control |
| Admin | Company | Manages company settings, users and operations |
| Manager | Company, assigned locations | Manages assigned branches or warehouses and their operations |
| Cashier | Company, assigned branches | Handles sales and checkout |

Superadmin is a platform role held by Stockwise operators, stored as `users.is_superadmin` and created by `SuperadminSeeder` from `SUPERADMIN_*` in `backend/.env`. It is not a company membership, and it is the only role that may act on a company without one (CO-3). Today a Superadmin can administer every user account: list, search and inspect users, create users, deactivate and reactivate accounts, and grant or revoke Superadmin ([user management PRD](../features/user-management/prd.md)). A Superadmin also manages companies as tenants: creates them with an owner, edits their profile, suspends and reactivates them, transfers ownership, and reads their members and activity ([company management PRD](../features/company-management/prd.md)). These are the only cross-company reads (CM-12). A Superadmin has **no access to a company's business data** through company-scoped routes unless they hold a membership in that company (CM-15). Owner, Admin, Manager and Cashier are company roles held through a membership.

### 4.2 Roles map to permissions

These roles are a starting point, not the final permission model. Code checks **permissions** (for example "create sales"), not role names. The company permissions implemented so far are `view-company`, `manage-company` and `manage-members` ("Manage company" and "Manage users" below, [company workspace](../features/company-workspace/prd.md)), and `view-branches`, `manage-branches` and `manage-branch-access` ("Manage branches and warehouses" and branch access, [branch management](../features/branch-management/prd.md)), in `App\Enums\MembershipRole::permissions()`. Roles map to permissions so the model can grow, for example with custom roles, without rewriting authorisation checks.

**Exception: ownership invariants.** CO-1, MB-5 and MB-6, and the Owner's implicit location access (BR-3, WH-3), are about who is an Owner, not about what someone may do. They check the Owner role directly. No permission can stand in for ownership, because other roles such as Admin also hold broad permissions.

Initial mapping, to be refined when the permission system is designed:

| Permission | Owner | Admin | Manager | Cashier |
| --- | --- | --- | --- | --- |
| View dashboard | ✓ | ✓ | ✓ | Limited |
| Manage company | ✓ | ✓ | — | — |
| View branches and warehouses | ✓ | ✓ | Assigned | Assigned |
| Manage branches and warehouses | ✓ | ✓ | — | — |
| Manage branch access | ✓ | ✓ | — | — |
| Manage users | ✓ | ✓ | — | — |
| Manage products | ✓ | ✓ | ✓ | — |
| View inventory | ✓ | ✓ | ✓ | Limited |
| Adjust inventory | ✓ | ✓ | ✓ | — |
| Create sales | ✓ | ✓ | ✓ | ✓ |
| View sales history | ✓ | ✓ | ✓ | Limited |
| Manage suppliers | ✓ | ✓ | ✓ | — |

- **Assigned**: only for locations in the user's branch or warehouse access.
- **Limited**: a reduced view, still to be defined (see [open questions](#6-open-questions)).
- Location-level permissions also require access to that location (BR-3, WH-3). Owners have it implicitly.

## 5. Resource scope

Each module decides whether its data is company-wide or belongs to a location. Record the decision here when the module is designed.

| Resource | Scope | Status |
| --- | --- | --- |
| Products | Company-wide (suggested by the overview) | To be confirmed |
| Suppliers | Company-wide (suggested by the overview) | To be confirmed |
| Settings | Company-wide, possibly with location overrides | To be confirmed |
| Branches and warehouses | Company-owned locations; one table, `type` store or warehouse | Decided ([branch management](../features/branch-management/prd.md)) |
| Employees | Company membership plus branch access (scope `all` or `selected`) | Decided ([branch management](../features/branch-management/prd.md)) |
| Inventory | Per location: branch or warehouse | To be confirmed |
| Stock movements | Per location; transfers link two locations of one company (WH-6) | To be confirmed |
| Sales | Branch-specific | To be confirmed |
| Cash registers | Branch-specific | To be confirmed |
| Purchases | Received at a branch or warehouse | To be confirmed |

## 6. Open questions

Resolve these when the related feature is designed, then move the answer into the rules above.

1. ~~**Superadmin inside company data.**~~ Answered: Superadmins manage companies through platform routes only and have no access to business data without a membership (§4.1, CM-12, CM-15).
2. ~~**Admin location access.**~~ Answered: Admins start with every location (scope `all`) but can be restricted; only the Owner's access is implicit and fixed (§2.6, BM-4).
3. **"Limited" for Cashier.** What exactly can a cashier see on the dashboard, in inventory and in sales history? For example: only their own branch, only their own sales, only the current shift.
4. ~~**Inactive locations.**~~ Answered: operational writes are rejected, data stays readable, and members with "Manage branches" reactivate (BR-4, WH-4, BM-6). For companies, CO-6: suspension blocks everything and a Superadmin reactivates.
5. **Critical actions.** Which actions go to the audit trail (SEC-5)? Already recorded: user registration, creation, email verification, deactivation, reactivation and Superadmin changes; company creation, edits, suspension, reactivation and ownership transfers; members added, role changes, deactivation and reactivation; branch creation, edits, deactivation and reactivation, and branch access changes ([audit logging](../architecture/audit-logging.md)). Remaining candidates: inventory adjustments, stock transfers, voided or refunded sales and price changes.
6. ~~**Response to out-of-scope IDs.**~~ Answered: company-scoped routes return `404` to non-members (SEC-4). Platform (`/admin`) routes return `403` to non-Superadmins without looking records up.
7. **Roles per membership.** Does a membership hold exactly one role, or can a user hold several roles in one company?
8. ~~**Active location context.**~~ Answered: in the URL as well, `/api/v1/companies/{company}/branches/{branch}/…`, resolved and authorised by the `company.branch` middleware ([tenancy](../architecture/tenancy.md), BM-10).
9. ~~**Warehouse model.**~~ Answered: a warehouse is a branch with `type = warehouse` (§2.3). Still open for the sales and stock modules: whether a warehouse can ever process sales, and whether a store can keep backroom stock that acts like a warehouse.
