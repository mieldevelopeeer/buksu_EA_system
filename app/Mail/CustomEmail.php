<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CustomEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $sender;
    public $messageContent;

    public function __construct($sender, $messageContent)
    {
        $this->sender = $sender;
        $this->messageContent = $messageContent;
    }

    public function build()
    {
        return $this->from($this->sender)
                    ->subject('Message from ' . $this->sender)
                    ->view('emails.custom')
                    ->with([
                        'sender' => $this->sender,
                        'messageContent' => $this->messageContent
                    ]);
    }
}
