<?php

namespace App\Enums;

/**
 * Tenant lifecycle: docs/features/company-management/prd.md §4.
 */
enum CompanyStatus: string
{
    case Active = 'active';
    case Suspended = 'suspended';
}
