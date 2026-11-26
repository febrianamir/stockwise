<?php

namespace Database\Factories;

use App\Enums\CompanyStatus;
use App\Enums\MembershipRole;
use App\Models\Company;
use App\Models\CompanyMembership;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'code' => 'co-'.fake()->unique()->lexify('????????'),
            'legal_name' => 'PT '.$name,
            'email' => fake()->companyEmail(),
            'phone' => '+62 411 '.fake()->numerify('######'),
            'address' => fake()->address(),
            'timezone' => 'Asia/Makassar',
            'currency' => 'IDR',
        ];
    }

    /**
     * Give the company an owner membership (every real company has exactly one, CM-3).
     */
    public function withOwner(?User $owner = null): static
    {
        return $this->afterCreating(function (Company $company) use ($owner): void {
            CompanyMembership::factory()->for($company)->for($owner ?? User::factory()->create())->create([
                'role' => MembershipRole::Owner,
            ]);
        });
    }

    /**
     * Indicate that the company is suspended.
     */
    public function suspended(string $reason = 'Suspended for testing purposes.'): static
    {
        return $this->afterMaking(function (Company $company) use ($reason): void {
            $company->forceFill([
                'status' => CompanyStatus::Suspended,
                'suspended_at' => now(),
                'suspension_reason' => $reason,
            ]);
        });
    }
}
