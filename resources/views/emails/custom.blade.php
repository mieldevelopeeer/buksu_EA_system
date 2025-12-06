<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Registrar Credentials</title>
    <style>
        :root {
            color-scheme: light;
        }
        body {
            margin: 0;
            padding: 24px;
            font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f5f6f8;
            color: #1f2933;
        }
        .card {
            max-width: 560px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 28px 32px;
            border-bottom: 1px solid #f0f2f5;
        }
        .brand img {
            height: 48px;
        }
        .brand h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #0f172a;
        }
        .body {
            padding: 28px 32px;
            line-height: 1.6;
        }
        .body p {
            margin: 0 0 12px 0;
            font-size: 15px;
            color: #334155;
        }
        .credentials {
            margin: 24px 0;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 18px;
            background: #fafbfc;
        }
        .credentials dt {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: .08em;
            color: #94a3b8;
            margin-bottom: 4px;
        }
        .credentials dd {
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
            word-break: break-word;
        }
        .credentials dd:last-of-type {
            margin-bottom: 0;
        }
        .cta {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 12px 22px;
            border-radius: 999px;
            background: #1d4ed8;
            color: #ffffff !important;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            margin-top: 12px;
        }
        .footer {
            padding: 20px 32px 28px;
            border-top: 1px solid #f0f2f5;
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.5;
        }
        @media (max-width: 600px) {
            body { padding: 16px; }
            .card { border-radius: 12px; }
            .brand, .body, .footer { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="card">
        <header class="brand">
            <img src="{{ asset('images/buksu_logo2.png') }}" alt="BukSU" />
            <h1>Bukidnon State University · Registrar</h1>
        </header>
        <section class="body">
            <p>Hi {{ ($gender ?? 'Mr./Ms.') }} {{ $fName ?? '' }} {{ $mName ?? '' }} {{ $lName ?? '' }},</p>
            <p>Your registrar access has been provisioned. Use the credentials below to sign in, then change your password right away.</p>
            <dl class="credentials">
                <dt>Username</dt>
                <dd>{{ $username ?? '-' }}</dd>
                <dt>ID Number</dt>
                <dd>{{ $id_number ?? '-' }}</dd>
                <dt>Temporary Password</dt>
                <dd>{{ $password ?? '-' }}</dd>
            </dl>
            <a href="{{ config('app.url', 'http://127.0.0.1:8000') }}" class="cta">Go to Registrar Portal</a>
        </section>
        <footer class="footer">
            Sent by {{ $sender }} · {{ date('Y') }} Bukidnon State University - Alubijid Campus
        </footer>
    </div>
</body>
</html>
