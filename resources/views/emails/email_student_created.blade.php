<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Student Account Notification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; background-color: #f4f6f8; padding: 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <tr>
            <td style="text-align: center; padding: 20px; background: #004080; color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <h1 style="margin: 0; font-size: 20px;">Bukidnon State University</h1>
                <p style="margin: 0; font-size: 14px;">Registrar’s Office • Student Account Notification</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px; color: #333;">
                <h2 style="margin-top: 0;">
                    Hello {{ $user->fName ?? '' }} {{ $user->mName ?? '' }} {{ $user->lName ?? '' }}{{ $user->suffix ? ', ' . $user->suffix : '' }},
                </h2>
                
                @if($type === 'updated')
                    <p>The <strong>Registrar’s Office</strong> has updated your <strong>Student</strong> account. Please find your current login credentials below:</p>
                @else
                    <p>The <strong>Registrar’s Office</strong> has created your <strong>Student</strong> account successfully. Here are your login credentials:</p>
                @endif

                <p><strong>Account Details:</strong></p>
                <ul>
                    @if(!empty($user->id_number))
                        <li><strong>ID Number:</strong> {{ $user->id_number }}</li>
                    @endif
                    <li><strong>Email:</strong> {{ $user->email }}</li>
                    @if(!empty($password))
                        <li><strong>Password:</strong> {{ $password }}</li>
                    @endif
                </ul>

                <p style="color: red;"><strong>Important:</strong> Please log in and change your password immediately to secure your account.</p>

                <p>If you encounter any issues, please contact the <strong>Registrar’s Office</strong> for assistance.</p>

                <p>Best regards,<br>
                <strong>BukSU Registrar’s Office</strong></p>
            </td>
        </tr>
        <tr>
            <td style="text-align: center; padding: 15px; background: #f1f1f1; font-size: 12px; color: #666; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
                &copy; {{ date('Y') }} Bukidnon State University - Alubijid Campus. All rights reserved.
            </td>
        </tr>
    </table>
</body>
</html>
