<?php

namespace App\Http\Requests\Company;

use App\Enums\BranchType;
use App\Models\Branch;
use App\Models\Company;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Create a branch (docs/features/branch-management/prd.md §5). The company is the resolved tenant;
 * a `company_id` in the body is ignored (SEC-3).
 */
class StoreBranchRequest extends FormRequest
{
    /**
     * Authorization is handled by the `company.can:manage-branches` route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Rules shared with UpdateBranchRequest. `$ignore` is the branch being edited.
     *
     * @return array<string, array<mixed>>
     */
    public static function profileRules(Company $company, ?Branch $ignore = null): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:100', self::uniqueNameRule($company, $ignore)],
            'type' => ['required', Rule::enum(BranchType::class)],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:30'],
            'timezone' => ['nullable', 'string', 'timezone:all'],
        ];
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $company = $this->company();

        return [
            ...self::profileRules($company),
            // Uppercase letters, digits and hyphens; unique within the company (BR-2, BM-2).
            'code' => ['required', 'string', 'min:2', 'max:20', 'regex:/^[A-Z0-9][A-Z0-9-]*$/', Rule::unique('branches', 'code')->where('company_id', $company->getKey())],
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
            'code.regex' => 'The code may only contain letters, numbers and hyphens, and must start with a letter or number.',
            'code.unique' => 'Another branch in this company already uses this code.',
        ];
    }

    /**
     * Codes are stored uppercase; names are trimmed. `type` defaults to store.
     */
    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'code' => is_string($this->code) ? Str::upper(trim($this->code)) : null,
            'name' => is_string($this->name) ? trim($this->name) : null,
            'type' => $this->has('type') ? null : BranchType::Store->value,
        ], fn ($value) => $value !== null));
    }

    protected function company(): Company
    {
        return $this->attributes->get('company');
    }

    /**
     * Branch names are unique within a company, ignoring case (BM-2).
     */
    private static function uniqueNameRule(Company $company, ?Branch $ignore): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($company, $ignore): void {
            $taken = $company->branches()
                ->whereRaw('lower(name) = lower(?)', [(string) $value])
                ->when($ignore, fn ($query) => $query->whereKeyNot($ignore->getKey()))
                ->exists();

            if ($taken) {
                $fail('Another branch in this company already uses this name.');
            }
        };
    }
}
