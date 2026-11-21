<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyEmailCode extends Notification implements ShouldQueue
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
            ->subject("{$this->code} is your Stockwise verification code")
            ->greeting('Verify your email')
            ->line('Enter this code in Stockwise to verify your email address:')
            ->line("**{$this->code}**")
            ->line("The code expires in {$minutes} minutes.")
            ->line("If you didn't create a Stockwise account, you can ignore this email.");
    }
}
