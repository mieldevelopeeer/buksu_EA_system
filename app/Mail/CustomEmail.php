<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CustomEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $sender;
    public $fName;
    public $mName;
    public $lName;
    public $username;
    public $id_number;
    public $password;

    public function __construct(
        string $sender,
        string $fName,
        ?string $mName,
        string $lName,
        string $username,
        string $id_number,
        string $password
    ) {
        $this->sender = $sender;
        $this->fName = $fName;
        $this->mName = $mName;
        $this->lName = $lName;
        $this->username = $username;
        $this->id_number = $id_number;
        $this->password = $password;
    }

    public function build()
    {
        return $this->from($this->sender)
                    ->subject('Your Account Credentials from Bukidnon State University')
                    ->view('emails.custom')
                    ->with([
                        'sender' => $this->sender,
                        'fName' => $this->fName,
                        'mName' => $this->mName,
                        'lName' => $this->lName,
                        'username' => $this->username,
                        'id_number' => $this->id_number,
                        'password' => $this->password,
                    ]);
    }
}

