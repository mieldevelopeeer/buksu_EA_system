<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\Users;

class ProgramHeadCreated extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $password;

    /**
     * Create a new message instance.
     */
    public function __construct(Users $user, string $password)
    {
        $this->user = $user;
        $this->password = $password;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->subject('Your Program Head Account Has Been Created')
                    ->view('emails.program_head_created')
                    ->with([
                        'user'     => $this->user,
                        'password' => $this->password,
                    ]);
    }
}
