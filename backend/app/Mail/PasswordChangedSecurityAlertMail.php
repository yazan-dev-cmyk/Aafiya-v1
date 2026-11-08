<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordChangedSecurityAlertMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * Timestamp of password modification.
     */
    public string $timestamp;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public User $user,
        string $locale = 'ar'
    ) {
        $this->locale = in_array($locale, ['ar', 'fr', 'en'], true) ? $locale : 'ar';
        $this->timestamp = now()->timezone('Africa/Algiers')->format('Y-m-d H:i:s T');
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = match ($this->locale) {
            'fr' => 'AAFIYA — Alerte de sécurité : Mot de passe modifié',
            'en' => 'AAFIYA — Security Alert: Password Changed',
            default => 'عافية — تنبيه أمني: تم تغيير كلمة المرور بنجاح',
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
            view: 'emails.password-changed',
            with: [
                'user' => $this->user,
                'locale' => $this->locale,
                'timestamp' => $this->timestamp,
            ],
        );
    }
}
