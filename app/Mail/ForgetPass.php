<?php

namespace App\Mail;

use App\Models\Users;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ForgetPass extends Mailable
{
    use Queueable, SerializesModels;

    public Users $user;

    public string $resetUrl;

    public function __construct(Users $user, string $resetUrl)
    {
        $this->user = $user;
        $this->resetUrl = $resetUrl;
    }

    public function build(): self
    {
        return $this
            ->subject('Reset Your BukSU Account Password')
            ->view('emails.forgot-password')
            ->with([
                'name'     => trim($this->user->getFullNameAttribute() ?? $this->user->username),
                'resetUrl' => $this->resetUrl,
            ]);
    }
}
