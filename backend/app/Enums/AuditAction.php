<?php

namespace App\Enums;

/**
 * Actions recorded in `audit_logs` (SEC-5, UM-10).
 */
enum AuditAction: string
{
    case UserRegistered = 'user.registered';
    case UserCreated = 'user.created';
    case UserEmailVerified = 'user.email_verified';
    case UserDeactivated = 'user.deactivated';
    case UserReactivated = 'user.reactivated';
    case UserSuperadminGranted = 'user.superadmin_granted';
    case UserSuperadminRevoked = 'user.superadmin_revoked';
    case CompanyCreated = 'company.created';
    case CompanyUpdated = 'company.updated';
    case CompanySuspended = 'company.suspended';
    case CompanyReactivated = 'company.reactivated';
    case CompanyOwnershipTransferred = 'company.ownership_transferred';
    case CompanyMemberAdded = 'company.member_added';
    case CompanyMemberRoleChanged = 'company.member_role_changed';
    case CompanyMemberDeactivated = 'company.member_deactivated';
    case CompanyMemberReactivated = 'company.member_reactivated';
    case BranchCreated = 'branch.created';
    case BranchUpdated = 'branch.updated';
    case BranchDeactivated = 'branch.deactivated';
    case BranchReactivated = 'branch.reactivated';
    case BranchAccessUpdated = 'branch_access.updated';
}
