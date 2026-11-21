<?php

namespace App\Models;

use App\Enums\OneTimeCodePurpose;
use Database\Factories\OneTimeCodeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A short-lived emailed code for email verification or password reset.
 * See docs/features/auth/erd.md.
 */
#[Fillable(['purpose', 'code_hash', 'attempts', 'expires_at', 'consumed_at'])]
#[Hidden(['code_hash'])]
class OneTimeCode extends Model
{
    /** @use HasFactory<OneTimeCodeFactory> */
    use HasFactory, MassPrunable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'purpose' => OneTimeCodePurpose::class,
            'attempts' => 'integer',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Codes that expired more than a day ago are removed by `model:prune`.
     *
     * @return Builder<static>
     */
    public function prunable(): Builder
    {
        return static::query()->where('expires_at', '<', now()->subDay());
    }
}
