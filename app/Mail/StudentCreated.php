<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\Users;

class StudentCreated extends Mailable
{
    use Queueable, SerializesModels;

    public Users $user;
    public ?string $password;
    public string $type; // 'created' or 'updated'

    /**
     * Create a new message instance.
     *
     * @param Users $user
     * @param string|null $password
     * @param string $type
     */
    public function __construct(Users $user, ?string $password = null, string $type = 'created')
    {
        $this->user = $user;
        $this->password = $password;
        $this->type = $type;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        $subject = $this->type === 'updated'
            ? 'Your Student Account Has Been Updated'
            : 'Your Student Account Has Been Created';

        return $this->from(config('mail.from.address', 'registrar@buksualubijidcampus.com'), config('mail.from.name', 'BukSU Admin'))
                    ->subject($subject)
                    ->view('emails.email_student_created')
                    ->with([
                        'user'     => $this->user,
                        'password' => $this->password,
                        'type'     => $this->type,
                    ]);
    }
}
