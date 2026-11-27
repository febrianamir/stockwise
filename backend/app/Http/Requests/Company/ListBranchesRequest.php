<?php

namespace App\Http\Requests\Company;

use App\Enums\BranchStatus;
use App\Enums\BranchType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListBranchesRequest extends FormRequest
{
    public const SORTABLE = ['name', 'code', 'created_at'];

    public const DEFAULT_PER_PAGE = 25;

    public const MIN_PER_PAGE = 5;

    public const MAX_PER_PAGE = 100;

    /**
     * Authorization is handled by the `company.can:view-branches` route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request (PRD §9).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(BranchStatus::class)],
            'type' => ['nullable', Rule::enum(BranchType::class)],
            'sort' => ['nullable', Rule::in(self::SORTABLE)],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'between:'.self::MIN_PER_PAGE.','.self::MAX_PER_PAGE],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
