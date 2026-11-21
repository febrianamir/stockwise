<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
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
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9][0-9 ()\-]{5,28}$/'],
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
            'phone.regex' => 'Enter a valid phone number, for example +62 812 3456 7890.',
        ];
    }

    /**
     * Trim values and store an empty phone as null.
     */
    protected function prepareForValidation(): void
    {
        $phone = is_string($this->phone) ? trim($this->phone) : $this->phone;

        $this->merge([
            'name' => is_string($this->name) ? trim($this->name) : $this->name,
            'phone' => $phone === '' ? null : $phone,
        ]);
    }
}
