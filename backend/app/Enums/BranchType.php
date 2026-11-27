<?php

namespace App\Enums;

/**
 * What a branch is (business rules §2.3): a store serves customers; a warehouse stores stock and
 * supplies other locations (WH-*). See docs/features/branch-management/prd.md §4.
 */
enum BranchType: string
{
    case Store = 'store';
    case Warehouse = 'warehouse';
}
