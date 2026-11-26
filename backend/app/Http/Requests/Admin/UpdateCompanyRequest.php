<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class UpdateCompanyRequest extends FormRequest
{
    /** Fields that can't change through edit (CM-8; status via suspend/reactivate). */
    private const IMMUTABLE = ['code', 'status', 'suspended_at', 'suspension_reason', 'created_by', 'public_id', 'owner_user_id'];

    /**
     * Authorization is handled by the `can:administer-platform` route middleware.
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
        $rules = array_map(
            fn (array $fieldRules): array => ['sometimes', ...$fieldRules],
            StoreCompanyRequest::profileRules(),
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
            'code.prohibited' => "The company code can't be changed.",
            'status.prohibited' => 'Use suspend or reactivate to change the status.',
            'currency.in' => 'Choose a valid ISO 4217 currency.',
            'updated_at.required' => 'Reload the company and try again.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->currency)) {
            $this->merge(['currency' => Str::upper(trim($this->currency))]);
        }
    }
}
