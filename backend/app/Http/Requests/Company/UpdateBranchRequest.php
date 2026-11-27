<?php

namespace App\Http\Requests\Company;

use App\Models\Branch;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Edit a branch's profile. `code` is immutable (BM-2) and status changes go through deactivate and
 * reactivate, so both are rejected with 422. Requires the `updated_at` the client loaded.
 */
class UpdateBranchRequest extends StoreBranchRequest
{
    private const IMMUTABLE = ['code', 'status', 'deactivated_at', 'deactivation_reason', 'company_id', 'created_by', 'public_id'];

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = array_map(
            fn (array $fieldRules): array => ['sometimes', ...$fieldRules],
            self::profileRules($this->company(), $this->attributes->get('branch')),
        );

        foreach (self::IMMUTABLE as $field) {
            $rules[$field] = ['prohibited'];
        }

        return [
            ...$rules,
            'updated_at' => ['required', 'date'],
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
            'code.prohibited' => "The branch code can't be changed.",
            'status.prohibited' => 'Use deactivate or reactivate to change the status.',
            'company_id.prohibited' => "A branch can't move to another company.",
            'updated_at.required' => 'Reload the branch and try again.',
        ];
    }

    /**
     * Only trim the name; don't default `type` on a partial edit.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->name)) {
            $this->merge(['name' => trim($this->name)]);
        }
    }

    /**
     * The branch resolved by `company.branch`.
     */
    public function branch(): Branch
    {
        return $this->attributes->get('branch');
    }
}
