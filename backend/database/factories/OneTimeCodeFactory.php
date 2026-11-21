<?php

namespace Database\Factories;

use App\Enums\OneTimeCodePurpose;
use App\Models\OneTimeCode;
use App\Models\User;
use App\Services\OneTimeCodeService;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OneTimeCode>
 */
class OneTimeCodeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'purpose' => OneTimeCodePurpose::EmailVerification,
            'code_hash' => OneTimeCodeService::hash('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(config('auth.one_time_codes.ttl_minutes')),
            'consumed_at' => null,
        ];
    }

    /**
     * Use the given plain code.
     */
    public function withCode(string $code): static
    {
        return $this->state(fn (array $attributes) => [
            'code_hash' => OneTimeCodeService::hash($code),
        ]);
    }

    /**
     * Indicate that the code is for a password reset.
     */
    public function passwordReset(): static
    {
        return $this->state(fn (array $attributes) => [
            'purpose' => OneTimeCodePurpose::PasswordReset,
        ]);
    }

    /**
     * Indicate that the code has expired.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'expires_at' => now()->subMinute(),
        ]);
    }
}
