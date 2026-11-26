<?php

namespace App\Http\Requests\Company;

use App\Http\Requests\Admin\UpdateCompanyRequest;

/**
 * Company profile edits by its Owner or Admin (CW-2): the same fields and rules as the
 * platform edit. `code` and `status` stay prohibited.
 */
class UpdateCompanyProfileRequest extends UpdateCompanyRequest
{
    /**
     * Authorization is handled by the `company.can:manage-company` route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }
}
