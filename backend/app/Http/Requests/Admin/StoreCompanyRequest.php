<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreCompanyRequest extends FormRequest
{
    /**
     * Authorization is handled by the `can:administer-platform` route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Profile rules shared with UpdateCompanyRequest (PRD §4).
     *
     * @return array<string, array<mixed>>
     */
    public static function profileRules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'legal_name' => ['nullable', 'string', 'max:200'],
            'tax_id' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'timezone' => ['required', 'string', 'timezone:all'],
            'currency' => ['required', 'string', Rule::in(config('stockwise.currencies'))],
        ];
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...self::profileRules(),
            // Lowercase, starts with a letter, globally unique (CM-8). Stored lowercase, so the
            // unique check is effectively case-insensitive; the database also has a lower(code) index.
            'code' => ['required', 'string', 'min:3', 'max:40', 'regex:/^[a-z][a-z0-9-]*$/', Rule::unique('companies', 'code')],
            'owner_user_id' => ['required', 'integer'],
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
            'code.regex' => 'The code may only contain lowercase letters, numbers and hyphens, and must start with a letter.',
            'code.unique' => 'Another company already uses this code.',
            'currency.in' => 'Choose a valid ISO 4217 currency.',
            'owner_user_id.required' => 'Choose an owner for the company.',
        ];
    }

    /**
     * Codes are lowercase (CM-8); currencies are uppercase ISO codes.
     */
    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'code' => is_string($this->code) ? Str::lower(trim($this->code)) : null,
            'currency' => is_string($this->currency) ? Str::upper(trim($this->currency)) : null,
        ], fn ($value) => $value !== null));
    }
}
