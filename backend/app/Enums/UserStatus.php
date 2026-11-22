<?php

namespace App\Enums;

/**
 * Account lifecycle: docs/features/user-management/prd.md §3.
 */
enum UserStatus: string
{
    /** Registered or created, email not verified yet. May log in only to verify. */
    case Pending = 'pending';

    /** Email verified and not deactivated. */
    case Active = 'active';

    /** Deactivated by a Superadmin. Cannot authenticate (UM-3). */
    case Inactive = 'inactive';
}
