<?php

namespace Database\Factories;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyMembership>
 */
class CompanyMembershipFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'user_id' => User::factory(),
            'role' => MembershipRole::Cashier,
            'status' => MembershipStatus::Active,
            // The role's default (BM-4), worked out after any role override.
            'branch_scope' => fn (array $attributes) => ($attributes['role'] instanceof MembershipRole ? $attributes['role'] : MembershipRole::from($attributes['role']))->defaultBranchScope(),
        ];
    }

    public function role(MembershipRole $role): static
    {
        return $this->state(fn (array $attributes) => ['role' => $role]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => ['status' => MembershipStatus::Inactive]);
    }
}
