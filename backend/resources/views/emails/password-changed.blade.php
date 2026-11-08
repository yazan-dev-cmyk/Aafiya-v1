<!DOCTYPE html>
<html lang="{{ $locale }}" dir="{{ $locale === 'ar' ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AAFIYA — Security Alert</title>
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
            background-color: #0284c7;
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
            margin-bottom: 20px;
        }
        .alert-box {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 16px 20px;
            margin: 24px 0;
            color: #166534;
            font-size: 14px;
        }
        .warning-box {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 16px 20px;
            margin: 24px 0;
            color: #991b1b;
            font-size: 14px;
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
                <div class="alert-box">
                    <strong>تأكيد أمني:</strong> تم تغيير كلمة المرور لحسابك في منصة <strong>عافية</strong> بنجاح.
                </div>
                <div class="message">
                    <strong>تاريخ ووقت الإجراء:</strong> {{ $timestamp }}
                </div>
                <div class="message">
                    كإجراء احترازي لضمان أمان حسابك، تم إنهاء جميع جلسات تسجيل الدخول النشطة على كافة أجهزتك السابقة. سيتعين عليك تسجيل الدخول مجدداً باستخدام كلمة المرور الجديدة.
                </div>
                <div class="warning-box">
                    <strong>تنبيه هام:</strong> إذا لم تقم بتغيير كلمة المرور بنفسك، فهذا يعني أن حسابك قد يكون معرضاً للاختراق. يرجى التواصل مع الدعم الفني وإدارة المنصة فوراً لحماية بياناتك الطبية.
                </div>
            @elseif($locale === 'fr')
                <div class="greeting">Bonjour {{ $user->name }},</div>
                <div class="alert-box">
                    <strong>Alerte de sécurité :</strong> Le mot de passe de votre compte <strong>AAFIYA</strong> a été modifié avec succès.
                </div>
                <div class="message">
                    <strong>Date et heure :</strong> {{ $timestamp }}
                </div>
                <div class="message">
                    Par mesure de sécurité, toutes les sessions actives sur vos autres appareils ont été déconnectées. Vous devez vous reconnecter manuellement avec votre nouveau mot de passe.
                </div>
                <div class="warning-box">
                    <strong>Important :</strong> Si vous n'êtes pas à l'origine de cette modification, votre compte est peut-être compromis. Veuillez contacter immédiatement notre équipe de support.
                </div>
            @else
                <div class="greeting">Hello {{ $user->name }},</div>
                <div class="alert-box">
                    <strong>Security Confirmation:</strong> The password for your <strong>AAFIYA</strong> account has been changed successfully.
                </div>
                <div class="message">
                    <strong>Timestamp:</strong> {{ $timestamp }}
                </div>
                <div class="message">
                    As a security precaution, all existing active sessions across your devices have been revoked. You must log in again manually using your new password.
                </div>
                <div class="warning-box">
                    <strong>Important:</strong> If you did not make this change, your account may be compromised. Please contact AAFIYA support immediately.
                </div>
            @endif
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} AAFIYA Health Ecosystem. All rights reserved.
        </div>
    </div>
</body>
</html>
