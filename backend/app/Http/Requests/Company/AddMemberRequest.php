<?php

namespace App\Http\Requests\Company;

use App\Enums\MembershipRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AddMemberRequest extends FormRequest
{
    /**
     * Authorization is handled by the `company.can:manage-members` route middleware.
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
            'email' => ['required', 'string', 'email', 'max:255'],
            'role' => ['required', Rule::in(array_map(fn (MembershipRole $role) => $role->value, MembershipRole::assignable()))],
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
            'role.in' => 'Choose Admin, Manager or Cashier. Ownership is transferred by a Stockwise administrator.',
        ];
    }

    /**
     * Emails are stored in lowercase (AUTH-1).
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->email)) {
            $this->merge(['email' => Str::lower(trim($this->email))]);
        }
    }
}
