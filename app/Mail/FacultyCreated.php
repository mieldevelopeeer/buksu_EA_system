<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\Users;

class FacultyCreated extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $password;
    public $type; // 'created' or 'updated'

    /**
     * Create a new message instance.
     *
     * @param Users $user
     * @param string|null $password
     * @param string $type 'created' or 'updated'
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
            ? 'Your Faculty Account Has Been Updated' 
            : 'Your Faculty Account Has Been Created';

        return $this->from('admin@buksualubijidcampus.com', 'BukSU Admin')
                    ->subject($subject)
                    ->view('emails.email_faculty_created')
                    ->with([
                        'user'     => $this->user,
                        'password' => $this->password,
                        'type'     => $this->type,
                    ]);
    }
}
