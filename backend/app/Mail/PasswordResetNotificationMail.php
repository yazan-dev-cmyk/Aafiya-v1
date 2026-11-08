<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetNotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * The plain reset token.
     */
    public string $token;

    /**
     * Absolute reset link URL.
     */
    public string $resetUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public User $user,
        #[\SensitiveParameter]
        string $token,
        string $locale = 'ar'
    ) {
        $this->token = $token;
        $this->locale = in_array($locale, ['ar', 'fr', 'en'], true) ? $locale : 'ar';

        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
        $this->resetUrl = "{$frontendUrl}/{$this->locale}/reset-password?token=" . urlencode($token) . '&email=' . urlencode($user->email);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = match ($this->locale) {
            'fr' => 'AAFIYA — Réinitialisation de votre mot de passe',
            'en' => 'AAFIYA — Password Reset Request',
            default => 'عافية — طلب استعادة كلمة المرور',
        };

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.password-reset',
            with: [
                'user' => $this->user,
                'resetUrl' => $this->resetUrl,
                'locale' => $this->locale,
                'expiresMinutes' => 60,
            ],
        );
    }
}
