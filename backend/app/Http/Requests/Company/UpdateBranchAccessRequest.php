<?php

namespace App\Http\Requests\Company;

use App\Enums\BranchScope;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Replace a member's branch access: `{ scope: "all" }` or `{ scope: "selected", branch_ids: [...] }`
 * with branch public IDs (BM-5). Whether the IDs belong to this company is checked by
 * App\Services\BranchAccessService.
 */
class UpdateBranchAccessRequest extends FormRequest
{
    /**
     * Authorization is handled by the `company.can:manage-branch-access` route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'scope' => ['required', Rule::enum(BranchScope::class)],
            'branch_ids' => ['exclude_unless:scope,selected', 'required', 'array', 'min:1', 'max:500'],
            'branch_ids.*' => ['string', 'ulid'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'branch_ids.required' => 'Choose at least one branch, or give access to all branches.',
            'branch_ids.min' => 'Choose at least one branch, or give access to all branches.',
            'branch_ids.*.ulid' => 'Choose branches of this company.',
        ];
    }
}
