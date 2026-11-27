<?php

namespace Database\Factories;

use App\Enums\BranchStatus;
use App\Enums\BranchType;
use App\Models\Branch;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Branch>
 */
class BranchFactory extends Factory
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
            'name' => fake()->unique()->city().' Store',
            'code' => strtoupper('BR-'.fake()->unique()->bothify('??##')),
            'type' => BranchType::Store,
            'address' => fake()->address(),
            'phone' => '+62 411 '.fake()->numerify('######'),
        ];
    }

    public function warehouse(): static
    {
        return $this->state(fn (array $attributes) => ['type' => BranchType::Warehouse]);
    }

    public function inactive(string $reason = 'Closed for renovation.'): static
    {
        return $this->afterMaking(function (Branch $branch) use ($reason): void {
            $branch->forceFill([
                'status' => BranchStatus::Inactive,
                'deactivated_at' => now(),
                'deactivation_reason' => $reason,
            ]);
        });
    }
}
