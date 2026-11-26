<?php

namespace App\Http\Requests\Company;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberRequest extends FormRequest
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
            'role' => ['required_without:status', Rule::in(array_map(fn (MembershipRole $role) => $role->value, MembershipRole::assignable()))],
            'status' => ['required_without:role', Rule::enum(MembershipStatus::class)],
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
}
