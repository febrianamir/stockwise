<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use RuntimeException;

/**
 * Creates the platform Superadmin (business rules §4.1) from the `auth.superadmin` config,
 * already verified. Safe to run again: an existing account keeps its password.
 */
class SuperadminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $credentials = [
            'name' => config('auth.superadmin.name'),
            'email' => Str::lower(trim((string) config('auth.superadmin.email'))),
            'password' => config('auth.superadmin.password'),
        ];

        $validator = Validator::make($credentials, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', Password::defaults()],
        ]);

        if ($validator->fails()) {
            throw new RuntimeException('Set SUPERADMIN_NAME, SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in .env: '.implode(' ', $validator->errors()->all()));
        }

        $superadmin = User::query()->firstOrNew(['email' => $credentials['email']]);

        if (! $superadmin->exists) {
            $superadmin->name = $credentials['name'];
            $superadmin->password = $credentials['password'];
        }

        $superadmin->is_superadmin = true;
        $superadmin->email_verified_at ??= now();
        $superadmin->save();

        $this->command?->info("Superadmin ready: {$superadmin->email}");
    }
}
