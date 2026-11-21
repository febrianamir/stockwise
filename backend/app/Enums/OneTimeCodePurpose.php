<?php

namespace App\Enums;

enum OneTimeCodePurpose: string
{
    case EmailVerification = 'email_verification';
    case PasswordReset = 'password_reset';
}
