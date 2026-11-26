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
     * The permissions this role grants (business rules §4.2: Owner and Admin manage the company
     * and its members; every member can view it).
     *
     * @return list<CompanyPermission>
     */
    public function permissions(): array
    {
        return match ($this) {
            self::Owner, self::Admin => [CompanyPermission::ViewCompany, CompanyPermission::ManageCompany, CompanyPermission::ManageMembers],
            self::Manager, self::Cashier => [CompanyPermission::ViewCompany],
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
