<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * An API error the client must recognise by its machine-readable `code`
 * (docs/architecture/api-conventions.md#errors). Rendered as `{ message, code }`.
 */
class ApiException extends Exception
{
    public const COMPANY_SUSPENDED = 'COMPANY_SUSPENDED';

    public const BRANCH_ACCESS_DENIED = 'BRANCH_ACCESS_DENIED';

    public const BRANCH_INACTIVE = 'BRANCH_INACTIVE';

    public const INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION';

    public const STALE_RECORD = 'STALE_RECORD';

    public function __construct(public readonly int $status, public readonly string $errorCode, string $message)
    {
        parent::__construct($message);
    }

    public static function companySuspended(): self
    {
        return new self(403, self::COMPANY_SUSPENDED, 'This company is suspended. Contact your Stockwise administrator.');
    }

    public static function branchAccessDenied(): self
    {
        return new self(403, self::BRANCH_ACCESS_DENIED, "You don't have access to this branch.");
    }

    public static function branchInactive(): self
    {
        return new self(403, self::BRANCH_INACTIVE, 'This branch is inactive. Reactivate it before making changes in it.');
    }

    public static function invalidStatusTransition(string $message): self
    {
        return new self(409, self::INVALID_STATUS_TRANSITION, $message);
    }

    public static function staleRecord(): self
    {
        return new self(409, self::STALE_RECORD, 'This record was changed by someone else. Reload it and try again.');
    }

    /**
     * Expected client errors aren't logged.
     */
    public function report(): void {}

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), 'code' => $this->errorCode], $this->status);
    }
}
