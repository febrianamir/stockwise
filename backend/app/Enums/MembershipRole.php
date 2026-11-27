<?php

namespace App\Enums;

/**
 * Company roles held through a membership (business rules §4.1). Exactly one owner per company (CM-3).
 */
enum MembershipRole: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Manager = 'manager';
    case Cashier = 'cashier';

    /**
     * The permissions this role grants (business rules §4.2: Owner and Admin manage the company,
     * its members, its branches and branch access; every member can view the company and the
     * branches they have access to).
     *
     * @return list<CompanyPermission>
     */
    public function permissions(): array
    {
        return match ($this) {
            self::Owner, self::Admin => [
                CompanyPermission::ViewCompany,
                CompanyPermission::ManageCompany,
                CompanyPermission::ManageMembers,
                CompanyPermission::ViewBranches,
                CompanyPermission::ManageBranches,
                CompanyPermission::ManageBranchAccess,
            ],
            self::Manager, self::Cashier => [CompanyPermission::ViewCompany, CompanyPermission::ViewBranches],
        };
    }

    /**
     * The branch scope a new membership with this role starts with (BM-4): Owners and Admins get
     * every branch, Managers and Cashiers none until someone assigns them.
     */
    public function defaultBranchScope(): BranchScope
    {
        return match ($this) {
            self::Owner, self::Admin => BranchScope::All,
            self::Manager, self::Cashier => BranchScope::Selected,
        };
    }

    /**
     * Roles a member can be given through member management. Ownership only moves through a
     * platform ownership transfer (CM-13).
     *
     * @return list<self>
     */
    public static function assignable(): array
    {
        return [self::Admin, self::Manager, self::Cashier];
    }
}
