<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Password Reset</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f5f7fa;
        margin: 0;
        padding: 0;
      }
      .wrapper {
        max-width: 520px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 18px;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #1d4ed8, #312e81);
        color: #ffffff;
        padding: 28px 32px;
      }
      .header h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
      }
      .content {
        padding: 32px;
        color: #1f2937;
        font-size: 15px;
        line-height: 1.6;
      }
      .cta {
        text-align: center;
        margin: 32px 0 12px;
      }
      .cta a {
        display: inline-block;
        padding: 12px 32px;
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: #ffffff;
        border-radius: 9999px;
        text-decoration: none;
        font-weight: 600;
        box-shadow: 0 12px 24px rgba(37, 99, 235, 0.28);
      }
      .cta a:hover {
        background: linear-gradient(135deg, #1d4ed8, #1e3a8a);
      }
      .meta {
        font-size: 13px;
        color: #6b7280;
        margin-top: 24px;
      }
      .footer {
        padding: 24px 32px;
        background: #f3f4f6;
        font-size: 12px;
        color: #6b7280;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <h1>Password Reset Request</h1>
      </div>
      <div class="content">
        <p>Hi {{ $name }},</p>
        <p>
          We received a request to reset the password for your Bukidnon State University Alubijid Campus account. If you
          made this request, click the button below to choose a new password.
        </p>
        <div class="cta">
          <a href="{{ $resetUrl }}" target="_blank" rel="noopener">Reset Password</a>
        </div>
        <p class="meta">
          This link will expire in 60 minutes and can be used only once. If you did not request a password reset, please
          ignore this email or contact the Registrar's office immediately.
        </p>
        <p>Stay safe and see you soon!</p>
        <p><strong>BukSU Enrollment &amp; Academic Management System</strong></p>
      </div>
      <div class="footer">
        You are receiving this email because you requested a password reset for your account. If this wasn't you, no
        further action is required.
      </div>
    </div>
  </body>
</html>
