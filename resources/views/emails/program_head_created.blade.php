<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Program Head Account Created</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; background-color: #f4f6f8; padding: 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <tr>
            <td style="text-align: center; padding: 20px; background: #003366; color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <h1 style="margin: 0; font-size: 20px;">Bukidnon State University</h1>
                <p style="margin: 0; font-size: 14px;">Program Head Account Notification</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px; color: #333;">
                <h2 style="margin-top: 0;">Hello {{ $user->fName }} {{ $user->mName ?? '' }} {{ $user->lName }}{{ $user->suffix ? ', ' . $user->suffix : '' }},</h2>
                
                <p>We are pleased to inform you that your <strong>Program Head</strong> account has been created successfully.</p>

                <p><strong>Account Details:</strong></p>
                <ul>
                    <li><strong>ID Number:</strong> {{ $user->id_number }}</li>
                    <li><strong>Username:</strong> {{ $user->username }}</li>
                    <li><strong>Email:</strong> {{ $user->email }}</li>
                    <li><strong>Password:</strong> {{ $password }}</li>
                </ul>

                <p style="color: red;"><strong>Important:</strong> Please log in and change your password immediately to ensure account security.</p>

                <p>If you have any questions or issues, please contact the administrator.</p>

                <p>Welcome aboard,<br><strong>BukSU Admin Team</strong></p>
            </td>
        </tr>
        <tr>
            <td style="text-align: center; padding: 15px; background: #f1f1f1; font-size: 12px; color: #666; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
                &copy; {{ date('Y') }} Bukidnon State University. All rights reserved.
            </td>
        </tr>
    </table>
</body>
</html>
