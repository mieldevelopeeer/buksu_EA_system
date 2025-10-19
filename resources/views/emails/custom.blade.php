<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Registrar Account from {{ $sender }}</title>
    <style>
        body {
            font-family: 'Helvetica', Arial, sans-serif;
            background-color: #f4f6f8;
            margin: 0;
            padding: 0;
            color: #333333;
        }
        .container {
            max-width: 600px;
            margin: 30px auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            border: 1px solid #e0e0e0;
        }
        .header {
            background-color: #1d72b8;
            color: #ffffff;
            text-align: center;
            padding: 25px;
            font-size: 22px;
            font-weight: bold;
        }
        .header img {
            max-height: 60px;
            margin-bottom: 10px;
        }
        .content {
            padding: 25px;
            line-height: 1.6;
            font-size: 16px;
        }
        .account-card {
            background-color: #f0f4ff;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .account-item {
            background-color: #ffffff;
            border: 1px solid #d0d7e5;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            margin-bottom: 15px;
        }
        .account-item h4 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #555555;
            font-weight: normal;
        }
        .account-item span {
            font-size: 16px;
            font-weight: bold;
            color: #1d72b8;
            word-break: break-word;
        }
        .button {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 25px;
            background-color: #1d72b8;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
        }
        .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999999;
            border-top: 1px solid #e0e0e0;
        }
        @media only screen and (max-width: 480px) {
            .account-card { padding: 15px; }
            .account-item { padding: 12px; }
            .header img { max-height: 50px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{{ asset('images/buksu_logo2.png') }}" alt="BUKSU Logo">
            <div>Welcome to the Registrar Portal from {{ $sender }}</div>
        </div>
        <div class="content">
            <p>Hi {{ ($gender ?? 'Mr./Ms.') }} {{ $fName ?? '' }} {{ $mName ?? '' }} {{ $lName ?? '' }},</p>
            <p>Your Registrar account has been successfully created. Please keep the information below secure, as it allows access to the Bukidnon State University Registrar Portal.</p>
            
            <div class="account-card">
                <div class="account-item">
                    <h4>Username</h4>
                    <span>{{ $username ?? '-' }}</span>
                </div>
                <div class="account-item">
                    <h4>ID Number</h4>
                    <span>{{ $id_number ?? '-' }}</span>
                </div>
                <div class="account-item">
                    <h4>Password</h4>
                    <span>{{ $password ?? '-' }}</span>
                </div>
            </div>

            <p>For security reasons, it is highly recommended to change your password after your first login.</p>
            <a href="http://127.0.0.1:8000/" class="button">Access Registrar Portal</a>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Bukidnon State University - Alubijid Campus. All rights reserved.
        </div>
    </div>
</body>
</html>
