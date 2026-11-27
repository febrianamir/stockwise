<?php

namespace App\Enums;

/**
 * Branch lifecycle: an inactive branch rejects operational writes but stays readable (BR-4, BM-6).
 */
enum BranchStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
}
