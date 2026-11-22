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
}
