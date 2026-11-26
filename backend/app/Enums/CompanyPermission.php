<?php

namespace App\Enums;

/**
 * Company-level permissions (business rules §4.2). Code checks these, never role names.
 * Roles map to permissions in MembershipRole::permissions().
 */
enum CompanyPermission: string
{
    case ViewCompany = 'view-company';
    case ManageCompany = 'manage-company';
    case ManageMembers = 'manage-members';
}
