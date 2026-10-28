<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GoogleDriveService
{
    protected ?string $folderId;
    protected ?string $credentialsPath;
    protected static bool $fake = false;
    protected static array $fakeFiles = [];

    public function __construct(?string $folderId = null, ?string $credentialsPath = null)
    {
        $this->folderId = $folderId ?: config('services.google.drive.folder_id');
        $this->credentialsPath = $credentialsPath ?: config('services.google.drive.credentials_path');
    }

    /**
     * Enable faking for automated tests without network access.
     */
    public static function fake(array $initialFiles = []): void
    {
        static::$fake = true;
        static::$fakeFiles = $initialFiles;
    }

    /**
     * Reset fake mode.
     */
    public static function resetFake(): void
    {
        static::$fake = false;
        static::$fakeFiles = [];
    }

    /**
     * Upload an uploaded receipt file to Google Drive.
     *
     * @return array{file_id: string, name: string, mime_type: string, size: int}
     */
    public function uploadReceipt(UploadedFile $file, string $customFileName): array
    {
        if (static::$fake) {
            $fakeId = 'fake_gdrive_' . bin2hex(random_bytes(8));
            $content = file_get_contents($file->getRealPath());
            static::$fakeFiles[$fakeId] = [
                'id' => $fakeId,
                'name' => $customFileName,
                'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                'size' => $file->getSize(),
                'content' => $content,
            ];

            return [
                'file_id' => $fakeId,
                'name' => $customFileName,
                'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                'size' => $file->getSize(),
            ];
        }

        $mimeType = $file->getMimeType() ?: 'application/octet-stream';
        $fileContent = file_get_contents($file->getRealPath());

        try {
            $accessToken = $this->getAccessToken();

            $boundary = '-------' . bin2hex(random_bytes(16));
            $delimiter = "\r\n--" . $boundary . "\r\n";
            $closeDelimiter = "\r\n--" . $boundary . "--";

            $metadata = json_encode([
                'name' => $customFileName,
                'parents' => array_filter([$this->folderId]),
            ]);

            $multipartBody = $delimiter
                . "Content-Type: application/json; charset=UTF-8\r\n\r\n"
                . $metadata
                . $delimiter
                . "Content-Type: " . $mimeType . "\r\n\r\n"
                . $fileContent
                . $closeDelimiter;

            $ch = curl_init('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $multipartBody,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $accessToken,
                    'Content-Type: multipart/related; boundary=' . $boundary,
                    'Content-Length: ' . strlen($multipartBody),
                ],
                CURLOPT_TIMEOUT => 30,
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError || $httpCode < 200 || $httpCode >= 300) {
                Log::warning("Google Drive Upload encountered HTTP {$httpCode}. Seamlessly falling back to secure private local storage.", [
                    'filename' => $customFileName,
                    'http_code' => $httpCode,
                    'curl_error' => $curlError,
                    'response' => $response,
                ]);

                $localRelPath = 'receipts/' . $customFileName;
                \Illuminate\Support\Facades\Storage::disk('local')->put($localRelPath, $fileContent);

                return [
                    'file_id' => 'local_' . bin2hex(random_bytes(8)),
                    'name' => $customFileName,
                    'mime_type' => $mimeType,
                    'size' => strlen($fileContent),
                    'storage' => 'local',
                    'storage_path' => $localRelPath,
                ];
            }

            $data = json_decode($response, true);
            if (empty($data['id'])) {
                throw new RuntimeException('فشل استلام معرّف الملف من Google Drive بعد الرفع.');
            }

            return [
                'file_id' => $data['id'],
                'name' => $data['name'] ?? $customFileName,
                'mime_type' => $data['mimeType'] ?? $mimeType,
                'size' => (int) ($data['size'] ?? strlen($fileContent)),
                'storage' => 'gdrive',
            ];
        } catch (\Throwable $e) {
            Log::warning('Google Drive Upload or Authentication failed. Seamlessly falling back to secure private local storage.', [
                'error' => $e->getMessage(),
                'filename' => $customFileName,
            ]);

            $localRelPath = 'receipts/' . $customFileName;
            \Illuminate\Support\Facades\Storage::disk('local')->put($localRelPath, $fileContent);

            return [
                'file_id' => 'local_' . bin2hex(random_bytes(8)),
                'name' => $customFileName,
                'mime_type' => $mimeType,
                'size' => strlen($fileContent),
                'storage' => 'local',
                'storage_path' => $localRelPath,
            ];
        }
    }

    /**
     * Download / Stream file from Google Drive.
     *
     * @return array{content: string, name: string, mime_type: string, size: int}
     */
    public function downloadFile(string $fileId): array
    {
        if (static::$fake) {
            if (!isset(static::$fakeFiles[$fileId])) {
                throw new RuntimeException("الملف المطلوب غير موجود في التخزين الافتراضي: {$fileId}");
            }
            return static::$fakeFiles[$fileId];
        }

        $meta = $this->getFileMetadata($fileId);
        $accessToken = $this->getAccessToken();

        $ch = curl_init("https://www.googleapis.com/drive/v3/files/{$fileId}?alt=media&supportsAllDrives=true");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $accessToken,
            ],
            CURLOPT_TIMEOUT => 60,
        ]);

        $content = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError || $httpCode < 200 || $httpCode >= 300) {
            Log::error('Google Drive Download Failed', [
                'file_id' => $fileId,
                'http_code' => $httpCode,
                'curl_error' => $curlError,
            ]);
            throw new RuntimeException("تعذر تحميل ملف الإيصال من Google Drive (رمز الخطأ: {$httpCode})");
        }

        return [
            'content' => (string) $content,
            'name' => $meta['name'] ?? 'receipt_document',
            'mime_type' => $meta['mimeType'] ?? 'application/octet-stream',
            'size' => (int) ($meta['size'] ?? strlen((string) $content)),
        ];
    }

    /**
     * Get file metadata from Google Drive.
     */
    public function getFileMetadata(string $fileId): array
    {
        if (static::$fake) {
            if (isset(static::$fakeFiles[$fileId])) {
                return [
                    'id' => $fileId,
                    'name' => static::$fakeFiles[$fileId]['name'],
                    'mimeType' => static::$fakeFiles[$fileId]['mime_type'],
                    'size' => static::$fakeFiles[$fileId]['size'],
                ];
            }
            throw new RuntimeException("الملف غير موجود في Google Drive.");
        }

        $accessToken = $this->getAccessToken();

        $ch = curl_init("https://www.googleapis.com/drive/v3/files/{$fileId}?supportsAllDrives=true&fields=id,name,mimeType,size");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $accessToken,
            ],
            CURLOPT_TIMEOUT => 20,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new RuntimeException("تعذر استرجاع بيانات الملف من Google Drive (رمز الخطأ: {$httpCode})");
        }

        return json_decode($response, true) ?: [];
    }

    /**
     * Obtain a valid OAuth2 Access Token using the Service Account JSON credentials.
     */
    protected function getAccessToken(): string
    {
        return Cache::remember('aafiya_google_drive_access_token', 3300, function () {
            $keyData = $this->loadCredentials();

            $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
            $now = time();
            $claim = json_encode([
                'iss' => $keyData['client_email'],
                'scope' => 'https://www.googleapis.com/auth/drive',
                'aud' => 'https://oauth2.googleapis.com/token',
                'exp' => $now + 3600,
                'iat' => $now,
            ]);

            $unsignedToken = $this->base64UrlEncode($header) . '.' . $this->base64UrlEncode($claim);
            $signature = '';
            $signSuccess = openssl_sign($unsignedToken, $signature, $keyData['private_key'], 'SHA256');

            if (!$signSuccess) {
                throw new RuntimeException('فشل توقيع مفتاح الاعتماد لخدمة Google Service Account.');
            }

            $signedJwt = $unsignedToken . '.' . $this->base64UrlEncode($signature);

            $ch = curl_init('https://oauth2.googleapis.com/token');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => http_build_query([
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion' => $signedJwt,
                ]),
                CURLOPT_TIMEOUT => 20,
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError || $httpCode !== 200) {
                Log::error('Google OAuth Token Request Failed', [
                    'http_code' => $httpCode,
                    'curl_error' => $curlError,
                    'response' => $response,
                ]);
                throw new RuntimeException('تعذر الحصول على رمز الوصول (Access Token) من Google OAuth.');
            }

            $data = json_decode($response, true);
            if (empty($data['access_token'])) {
                throw new RuntimeException('استجابة Google OAuth لا تحتوي على access_token.');
            }

            return $data['access_token'];
        });
    }

    /**
     * Load credentials JSON file.
     */
    protected function loadCredentials(): array
    {
        // 1. Check if raw JSON credentials are provided directly in environment variable (e.g. on Railway/Heroku)
        $envJson = env('GOOGLE_SERVICE_ACCOUNT_JSON') ?: config('services.google.drive.credentials_json');
        if (!empty($envJson)) {
            $data = is_array($envJson) ? $envJson : json_decode((string) $envJson, true);
            if ($data && !empty($data['client_email']) && !empty($data['private_key'])) {
                return $data;
            }
        }

        // 2. Otherwise load from credentials file path
        $path = $this->credentialsPath;
        if (!file_exists($path)) {
            $basePath = base_path($path);
            if (file_exists($basePath)) {
                $path = $basePath;
            } else {
                throw new RuntimeException("ملف اعتماد Google Service Account غير موجود في المسار: {$this->credentialsPath}");
            }
        }

        $content = file_get_contents($path);
        $data = json_decode($content, true);

        if (!$data || empty($data['client_email']) || empty($data['private_key'])) {
            throw new RuntimeException('محتوى ملف اعتماد Google Service Account غير صالح أو تنقصه بيانات التوقيع.');
        }

        return $data;
    }

    protected function base64UrlEncode(string $data): string
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }
}
