<!DOCTYPE html>
<html lang="{{ $locale }}" dir="{{ $locale === 'ar' ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AAFIYA — Password Reset</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }
        .container {
            max-width: 580px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .header {
            background-color: #0d9488;
            padding: 28px;
            text-align: center;
            color: #ffffff;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        .content {
            padding: 32px 28px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        .message {
            font-size: 15px;
            color: #475569;
            margin-bottom: 24px;
        }
        .button-container {
            text-align: center;
            margin: 32px 0;
        }
        .button {
            display: inline-block;
            background-color: #0d9488;
            color: #ffffff !important;
            padding: 14px 32px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(13, 148, 136, 0.2);
        }
        .notice-box {
            background-color: #f1f5f9;
            border-left: 4px solid #0d9488;
            padding: 14px 18px;
            border-radius: 4px;
            font-size: 13px;
            color: #64748b;
            margin-bottom: 24px;
        }
        [dir="rtl"] .notice-box {
            border-left: none;
            border-right: 4px solid #0d9488;
        }
        .raw-link {
            word-break: break-all;
            font-size: 12px;
            color: #94a3b8;
            margin-top: 16px;
        }
        .footer {
            background-color: #f8fafc;
            padding: 20px 28px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AAFIYA | عافية</h1>
        </div>
        <div class="content">
            @if($locale === 'ar')
                <div class="greeting">مرحباً {{ $user->name }}،</div>
                <div class="message">
                    تلقينا طلباً لاستعادة كلمة المرور الخاصة بحسابك في منصة <strong>عافية</strong>.
                    يمكنك إعادة تعيين كلمة المرور الخاصة بك من خلال النقر على الزر أدناه:
                </div>
                <div class="button-container">
                    <a href="{{ $resetUrl }}" class="button" target="_blank">إعادة تعيين كلمة المرور</a>
                </div>
                <div class="notice-box">
                    <strong>تنبيه أمني:</strong> هذا الرابط صالح للاستخدام <strong>مرة واحدة فقط</strong> وتنتهي صلاحيته تلقائياً بعد <strong>{{ $expiresMinutes }} دقيقة</strong>. في حال طلبت رابطاً جديداً، سيتم إلغاء هذا الرابط فوراً.
                </div>
                <div class="message">
                    إذا لم تقم بطلب استعادة كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان وستظل كلمة مرورك الحالية دون أي تغيير.
                </div>
                <div class="raw-link">
                    إذا تعذر النقر على الزر، يمكنك نسخ الرابط التالي ولصقه في متصفحك:<br>
                    <a href="{{ $resetUrl }}" style="color: #0d9488;">{{ $resetUrl }}</a>
                </div>
            @elseif($locale === 'fr')
                <div class="greeting">Bonjour {{ $user->name }},</div>
                <div class="message">
                    Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte sur la plateforme <strong>AAFIYA</strong>.
                    Vous pouvez réinitialiser votre mot de passe en cliquant sur le bouton ci-dessous :
                </div>
                <div class="button-container">
                    <a href="{{ $resetUrl }}" class="button" target="_blank">Réinitialiser le mot de passe</a>
                </div>
                <div class="notice-box">
                    <strong>Avis de sécurité :</strong> Ce lien est à <strong>usage unique</strong> et expirera automatiquement dans <strong>{{ $expiresMinutes }} minutes</strong>. Si vous demandez un nouveau lien, celui-ci sera immédiatement invalidé.
                </div>
                <div class="message">
                    Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.
                </div>
                <div class="raw-link">
                    Si le bouton ne fonctionne pas, copiez-collez l'adresse suivante dans votre navigateur :<br>
                    <a href="{{ $resetUrl }}" style="color: #0d9488;">{{ $resetUrl }}</a>
                </div>
            @else
                <div class="greeting">Hello {{ $user->name }},</div>
                <div class="message">
                    We received a request to reset your password for your <strong>AAFIYA</strong> platform account.
                    You can reset your password by clicking the button below:
                </div>
                <div class="button-container">
                    <a href="{{ $resetUrl }}" class="button" target="_blank">Reset Password</a>
                </div>
                <div class="notice-box">
                    <strong>Security Notice:</strong> This link is valid for <strong>single use only</strong> and will expire automatically in <strong>{{ $expiresMinutes }} minutes</strong>. Requesting a new link will immediately invalidate this link.
                </div>
                <div class="message">
                    If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </div>
                <div class="raw-link">
                    If you have trouble clicking the button, copy and paste the URL below into your web browser:<br>
                    <a href="{{ $resetUrl }}" style="color: #0d9488;">{{ $resetUrl }}</a>
                </div>
            @endif
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} AAFIYA Health Ecosystem. All rights reserved.
        </div>
    </div>
</body>
</html>
