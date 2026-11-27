<?php

namespace App\Enums;

/**
 * Which branches a membership may work in (BM-3): `all`, including branches created later, or
 * only the `selected` ones in `membership_branch_access`. The Owner has implicit access to every
 * branch whatever is stored (BR-3).
 */
enum BranchScope: string
{
    case All = 'all';
    case Selected = 'selected';
}
