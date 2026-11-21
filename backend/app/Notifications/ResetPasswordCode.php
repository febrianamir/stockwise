<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordCode extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public string $code) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $minutes = config('auth.one_time_codes.ttl_minutes');

        return (new MailMessage)
            ->subject("{$this->code} is your Stockwise password reset code")
            ->greeting('Reset your password')
            ->line('Enter this code in Stockwise to choose a new password:')
            ->line("**{$this->code}**")
            ->line("The code expires in {$minutes} minutes.")
            ->line("If you didn't ask to reset your password, you can ignore this email. Your password won't change.");
    }
}
