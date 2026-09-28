'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
  Clipboard, 
  X, 
  Search, 
  AlertCircle,
  Loader2, 
  Scan, 
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  User,
  Clock,
  Building2,
  VideoOff,
  RefreshCw,
  CameraIcon,
  ImagePlus,
  FlaskConical,
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsQR from 'jsqr';
import { prescriptionService, PrescriptionVerificationData } from '@/services/prescriptionService';
import { appointmentService, AppointmentItem } from '@/services/appointmentService';
import { diagnosticService, DiagnosticOrderPublicData } from '@/services/diagnosticService';

export type QrPayloadType = 'PATIENT_IDENTITY' | 'APPOINTMENT' | 'PRESCRIPTION' | 'DIAGNOSTIC_ORDER' | 'UNKNOWN';

export interface DetectedQrPayload {
  type: QrPayloadType;
  rawValue: string;
  extractedToken?: string;
}

/**
 * Architectural QR Payload Classifier
 * Decouples Patient MRN, Appointment Pass tokens, Prescription URLs, and Diagnostic Order URLs.
 */
export function detectQrPayloadType(rawValue: string): DetectedQrPayload {
  const trimmed = rawValue.trim();

  // 1. APPOINTMENT PASS URL: .../appointment/pass/{token}
  if (trimmed.includes('/appointment/pass/') || trimmed.includes('/appointments/pass/')) {
    const parts = trimmed.split(/\/appointments?\/pass\//);
    const token = parts[1]?.split('?')[0].split('#')[0].replace(/\/$/, '');
    if (token && token.length >= 20) {
      return { type: 'APPOINTMENT', rawValue: trimmed, extractedToken: token };
    }
  }

  // 2. DIAGNOSTIC ORDER VERIFICATION URL: .../diagnostic/order/{token} or .../diagnostics/order/{token}
  if (trimmed.includes('/diagnostic/order/') || trimmed.includes('/diagnostics/order/')) {
    const parts = trimmed.split(/\/diagnostics?\/order\//);
    const token = parts[1]?.split('?')[0].split('#')[0].replace(/\/$/, '');
    if (token && token.length >= 20 && !token.includes('/')) {
      return { type: 'DIAGNOSTIC_ORDER', rawValue: trimmed, extractedToken: token };
    }
  }

  // 3. PRESCRIPTION VERIFICATION URL: .../verify/{token} or .../v/{token}
  if (trimmed.includes('/verify/')) {
    const token = trimmed.split('/verify/')[1]?.split('?')[0].split('#')[0].replace(/\/$/, '');
    if (token && token.length >= 5) {
      return { type: 'PRESCRIPTION', rawValue: trimmed, extractedToken: token };
    }
  }
  if (trimmed.includes('/v/')) {
    const token = trimmed.split('/v/')[1]?.split('?')[0].split('#')[0].replace(/\/$/, '');
    if (token && token.length >= 5) {
      return { type: 'PRESCRIPTION', rawValue: trimmed, extractedToken: token };
    }
  }
  if (trimmed.startsWith('MEDI://')) {
    const parts = trimmed.split('/');
    const token = parts[parts.length - 1];
    if (token && token.length >= 5) {
      return { type: 'PRESCRIPTION', rawValue: trimmed, extractedToken: token };
    }
  }

  // 4. PATIENT IDENTITY MRN: Matches MRN-YYYY-XXXX or MRN-*
  if (/^MRN-[A-Za-z0-9\-]+$/i.test(trimmed)) {
    return { type: 'PATIENT_IDENTITY', rawValue: trimmed, extractedToken: trimmed };
  }

  // 5. Raw 64-character token (legacy Prescription QR fallback)
  if (/^[A-Za-z0-9]{64}$/.test(trimmed)) {
    return { type: 'PRESCRIPTION', rawValue: trimmed, extractedToken: trimmed };
  }

  return { type: 'UNKNOWN', rawValue: trimmed };
}

interface DocumentScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (code: string, appData?: any) => void;
  isDarkMode?: boolean;
  locale?: string;
}

type ScanMode = 'camera' | 'upload' | 'paste';
type ProcessingState = null | 'decoding' | 'verifying';

export const DocumentScanner: React.FC<DocumentScannerProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  isDarkMode = false,
  locale = 'ar'
}) => {
  const isRtl = locale === 'ar';
  const [mode, setMode] = useState<ScanMode>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>(null);
  const [result, setResult] = useState<PrescriptionVerificationData | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticOrderPublicData | null>(null);
  const [detectedPayload, setDetectedPayload] = useState<DetectedQrPayload | null>(null);
  const [appointmentPreview, setAppointmentPreview] = useState<AppointmentItem | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInSuccessData, setCheckInSuccessData] = useState<AppointmentItem | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [detectedToken, setDetectedToken] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (_) { /* ignore */ }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Handle Real Appointment Check-in Execution
  const handleConfirmCheckIn = async () => {
    if (!detectedPayload || detectedPayload.type !== 'APPOINTMENT') return;
    const token = detectedPayload.extractedToken || detectedPayload.rawValue;
    setIsCheckingIn(true);
    setCheckInError(null);
    try {
      const res = await appointmentService.checkIn(token);
      if (res.data) {
        setCheckInSuccessData(res.data);
        setAppointmentPreview(res.data);
        if (onScanSuccess) {
          onScanSuccess(token, res.data);
        }
      }
    } catch (err: any) {
      console.warn('Appointment Check-in API failed:', err);
      const errMsg = err?.data?.message || err?.data?.errors?.token?.[0] || err?.message || '';
      if (errMsg.includes('مسبقاً') || errMsg.includes('already') || err?.status === 422) {
        setCheckInError(isRtl
          ? 'تم تسجيل حضور هذا الموعد مسبقاً ولا يمكن استخدام التذكرة مرة أخرى.'
          : 'This appointment has already been checked in. The pass cannot be reused.');
      } else {
        setCheckInError(errMsg || (isRtl ? 'تعذر تأكيد حضور الموعد.' : 'Check-in failed.'));
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Perform Context-Aware Verification
  const executeVerification = useCallback(async (tokenOrId: string) => {
    setIsScanning(true);
    setProcessingState('verifying');
    setError(null);
    setResult(null);
    setDiagnosticResult(null);
    setDetectedPayload(null);
    setCheckInError(null);
    setCheckInSuccessData(null);
    setAppointmentPreview(null);

    const detected = detectQrPayloadType(tokenOrId);
    setDetectedPayload(detected);

    // 1. UNKNOWN QR TYPE
    if (detected.type === 'UNKNOWN') {
      setError(isRtl
        ? 'نوع رمز الاستجابة السريعة (QR) غير مدعوم في هذا الماسح.'
        : 'QR code format is not supported by this scanner.');
      setIsScanning(false);
      setProcessingState(null);
      return;
    }

    // 2. PATIENT IDENTITY QR (MRN)
    if (detected.type === 'PATIENT_IDENTITY') {
      setIsScanning(false);
      setProcessingState(null);
      if (onScanSuccess) {
        onScanSuccess(detected.rawValue);
      }
      return;
    }

    // 3. APPOINTMENT PASS QR
    if (detected.type === 'APPOINTMENT') {
      setIsScanning(false);
      setProcessingState(null);
      const token = detected.extractedToken || detected.rawValue;
      setDetectedToken(token);
      
      // Resolve appointment preview data
      try {
        const appsRes = await appointmentService.getAppointments();
        if (appsRes.data && Array.isArray(appsRes.data)) {
          const matched = appsRes.data.find((a: AppointmentItem) => a.secure_token === token);
          if (matched) {
            setAppointmentPreview(matched);
            if (matched.status === 'attended' || matched.checked_in_at) {
              setCheckInError(isRtl
                ? 'تم تسجيل حضور هذا الموعد مسبقاً ولا يمكن استخدام التذكرة مرة أخرى.'
                : 'This appointment has already been checked in. The pass cannot be reused.');
            }
          }
        }
      } catch (e) {
        console.warn('Appointment lookup error in scanner:', e);
      }
      return;
    }

    // 4. DIAGNOSTIC ORDER VERIFICATION
    if (detected.type === 'DIAGNOSTIC_ORDER') {
      const token = detected.extractedToken || detected.rawValue;
      setDetectedToken(token);

      try {
        const res = await diagnosticService.verifyToken(token);
        if (res.data) {
          setDiagnosticResult(res.data);
          if (onScanSuccess) onScanSuccess(token, res.data);
        } else {
          setError(isRtl
            ? 'الطلب التشخيصي غير موجود أو أن رمز التحقق غير صالح.'
            : 'Diagnostic order not found or invalid token.');
        }
      } catch (err: any) {
        const status = err?.status || err?.response?.status;
        if (status === 404) {
          setError(isRtl
            ? 'الطلب التشخيصي غير موجود أو أن رمز التحقق غير مسجل في شبكة عافية.'
            : 'Diagnostic order is invalid or not registered in Aafiya.');
        } else if (status === 429) {
          setError(isRtl
            ? 'تم تجاوز عدد محاولات التحقق المسموح بها. يرجى المحاولة لاحقاً.'
            : 'Too many verification requests. Please try again later.');
        } else {
          setError(isRtl
            ? 'تعذر التحقق من الطلب التشخيصي عبر قاعدة البيانات السحابية.'
            : 'Cloud diagnostic verification failed.');
        }
      } finally {
        setIsScanning(false);
        setProcessingState(null);
      }
      return;
    }

    // 5. PRESCRIPTION VERIFICATION
    const token = detected.extractedToken || detected.rawValue;
    setDetectedToken(token);

    try {
      const res = await prescriptionService.verifyToken(token);
      if (res.data) {
        setResult(res.data);
        if (onScanSuccess) onScanSuccess(token);
      } else {
        setError(isRtl
          ? 'لم يتم العثور على وثيقة مطابقة في سجلات المنظومة.'
          : 'No document found matching this token.');
      }
    } catch (err: any) {
      if (err?.status === 404) {
        setError(isRtl
          ? 'رمز التحقق غير مسجل أو غير صالح في شبكة عافية.'
          : 'Verification code is invalid or not registered in Aafiya.');
      } else if (err?.status === 0 || err?.message?.includes('Network')) {
        setError(isRtl
          ? 'تعذر الاتصال بخادم عافية. تحقق من اتصال الشبكة ثم أعد المحاولة.'
          : 'Unable to reach Aafiya server. Check your connection and retry.');
      } else {
        setError(isRtl
          ? 'تعذر التحقق من قاعدة البيانات السحابية.'
          : 'Cloud verification failed.');
      }
    } finally {
      setIsScanning(false);
      setProcessingState(null);
    }
  }, [isRtl, onScanSuccess]);

  // Frame processing loop for Live Camera
  const processFrame = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      scanLoopRef.current = requestAnimationFrame(processFrame);
      return;
    }
    const video = videoRef.current;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (code?.data) {
        stopCamera();
        executeVerification(code.data);
        return;
      }
    }
    scanLoopRef.current = requestAnimationFrame(processFrame);
  }, [executeVerification, stopCamera]);

  // Start Live Camera (Secure Context only)
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    const getMediaStream = async (): Promise<MediaStream> => {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      }
      // Legacy fallback
      const legacyGUM =
        (navigator as any)?.getUserMedia ||
        (navigator as any)?.webkitGetUserMedia ||
        (navigator as any)?.mozGetUserMedia;
      if (legacyGUM) {
        return new Promise((resolve, reject) => {
          legacyGUM.call(navigator, { video: { facingMode: { ideal: 'environment' } }, audio: false }, resolve, reject);
        });
      }
      const e = new Error('INSECURE_CONTEXT');
      e.name = 'SecurityError';
      throw e;
    };

    try {
      const stream = await getMediaStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanLoopRef.current = requestAnimationFrame(processFrame);
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(isRtl
          ? 'تم رفض إذن الكاميرا. يرجى تفعيله من إعدادات المتصفح ثم الضغط على إعادة المحاولة.'
          : 'Camera permission denied. Enable it in browser settings then tap Retry.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError(isRtl
          ? 'لم يتم العثور على كاميرا في هذا الجهاز.'
          : 'No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError(isRtl
          ? 'الكاميرا قيد الاستخدام من تطبيق آخر. أغلقه ثم أعد المحاولة.'
          : 'Camera is in use by another application.');
      } else {
        // SecurityError or Insecure Context
        setCameraError(isRtl
          ? 'يتطلب البث المباشر اتصالاً مشفراً (HTTPS). استخدم زر التقاط الصورة للمسح بكاميرا الهاتف فوراً.'
          : 'Live stream requires HTTPS. Use the Camera Snapshot button to scan directly.');
      }
    }
  }, [isRtl, processFrame, stopCamera]);

  // Effect: manage camera lifecycle
  useEffect(() => {
    if (isOpen && mode === 'camera' && !result && !diagnosticResult && !isScanning) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [isOpen, mode, result, diagnosticResult, isScanning, startCamera, stopCamera]);

  // ─── Internal: run BarcodeDetector or jsQR on a canvas source (ImageBitmap or HTMLImageElement) ───
  // Primary attempt: Native BarcodeDetector (hardware-accelerated, robust on high-res camera photos)
  // Secondary fallback: Two-pass jsQR strategy (Pass 1: MAX=1920 resize, Pass 2: full resolution)
  const decodeFromSource = useCallback(async (
    source: ImageBitmap | HTMLImageElement,
    naturalW: number,
    naturalH: number,
  ): Promise<boolean> => {
    try {
      // ── Primary Attempt: Native BarcodeDetector API ───────────────────────
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(source);
          if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
            console.log('[QR-DIAGNOSTIC] Native BarcodeDetector SUCCESS:', barcodes[0].rawValue);
            setProcessingState(null);
            await executeVerification(barcodes[0].rawValue);
            return true;
          }
        } catch (detectorErr) {
          console.log('[QR-DIAGNOSTIC] BarcodeDetector exception, falling back to jsQR:', detectorErr);
        }
      }

      // ── Fallback Attempt 1: jsQR Pass 1 (MAX=1920 with crisp nearest-neighbor pixels) ──
      const MAX = 1920;
      const scale = Math.min(1, MAX / Math.max(naturalW, naturalH));
      const w1 = Math.round(naturalW * scale);
      const h1 = Math.round(naturalH * scale);

      console.log('[QR-DIAGNOSTIC] source natural dimensions:', naturalW, 'x', naturalH);
      console.log('[QR-DIAGNOSTIC] Pass1 canvas dimensions:', w1, 'x', h1, '(scale=' + scale.toFixed(3) + ')');

      const canvas1 = document.createElement('canvas');
      canvas1.width = w1;
      canvas1.height = h1;
      const ctx1 = canvas1.getContext('2d', { willReadFrequently: true });
      if (!ctx1) {
        setError(isRtl ? 'تعذر معالجة الصورة في هذا المتصفح.' : 'Cannot process image in this browser.');
        setProcessingState(null);
        return false;
      }
      ctx1.imageSmoothingEnabled = false;
      ctx1.drawImage(source as CanvasImageSource, 0, 0, w1, h1);
      const imageData1 = ctx1.getImageData(0, 0, w1, h1);
      // Release canvas1 memory immediately after reading pixels
      canvas1.width = 0; canvas1.height = 0;

      const code1 = jsQR(imageData1.data, imageData1.width, imageData1.height, { inversionAttempts: 'attemptBoth' });
      console.log('[QR-DIAGNOSTIC] Pass1 jsQR result:', code1 ? 'DECODED' : 'null');
      console.log('[QR-DIAGNOSTIC] Pass1 raw QR data:', code1?.data ?? null);
      if (code1?.data) {
        console.log('[QR-DIAGNOSTIC] Pass1 SUCCESS → sending to executeVerification');
        setProcessingState(null);
        await executeVerification(code1.data);
        return true;
      }

      // ── Fallback Attempt 2: jsQR Pass 2 (Full resolution fallback) ─────────
      if (naturalW > MAX || naturalH > MAX) {
        console.log('[QR-DIAGNOSTIC] Pass1 failed → trying Pass2 at full resolution', naturalW, 'x', naturalH);
        const canvas2 = document.createElement('canvas');
        canvas2.width = naturalW;
        canvas2.height = naturalH;
        const ctx2 = canvas2.getContext('2d', { willReadFrequently: true });
        if (ctx2) {
          ctx2.imageSmoothingEnabled = false;
          ctx2.drawImage(source as CanvasImageSource, 0, 0, naturalW, naturalH);
          const imageData2 = ctx2.getImageData(0, 0, naturalW, naturalH);
          // Release canvas2 memory immediately
          canvas2.width = 0; canvas2.height = 0;

          const code2 = jsQR(imageData2.data, imageData2.width, imageData2.height, { inversionAttempts: 'attemptBoth' });
          console.log('[QR-DIAGNOSTIC] Pass2 jsQR result:', code2 ? 'DECODED' : 'null');
          console.log('[QR-DIAGNOSTIC] Pass2 raw QR data:', code2?.data ?? null);
          if (code2?.data) {
            console.log('[QR-DIAGNOSTIC] Pass2 SUCCESS → sending to executeVerification');
            setProcessingState(null);
            await executeVerification(code2.data);
            return true;
          }
        }
      }

      // Both passes failed
      console.log('[QR-DIAGNOSTIC] BOTH passes failed — jsQR returned null on all attempts');
      setError(isRtl
        ? 'لم يتم اكتشاف رمز QR في الصورة. تأكد من وضوح الصورة وعدم انحرافها.'
        : 'No QR code detected. Ensure the code is clear and in focus.');
      setProcessingState(null);
      return false;
    } catch {
      setError(isRtl ? 'خطأ أثناء تحليل الصورة.' : 'Error analysing image.');
      setProcessingState(null);
      return false;
    }
  }, [executeVerification, isRtl]);

  // Decode image file via BarcodeDetector / jsQR and route to verification
  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(isRtl ? 'الملف المحدد ليس صورة صالحة.' : 'Selected file is not a valid image.');
      return;
    }

    setProcessingState('decoding');
    setError(null);
    setResult(null);
    setDiagnosticResult(null);

    // ── PRIMARY PATH: createImageBitmap with imageOrientation:'from-image' ────
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file, { imageOrientation: 'from-image' as ImageOrientation })
        .then(async (bmp) => {
          const worked = await decodeFromSource(bmp, bmp.width, bmp.height);
          bmp.close(); // release GPU memory
          if (!worked) {
            // processingState and error already set inside decodeFromSource
          }
        })
        .catch(() => {
          legacyDecode(file);
        });
      return;
    }

    // ── FALLBACK: legacy FileReader + <img> path ─────────────────────────────
    legacyDecode(file);

    function legacyDecode(f: File) {
      const reader = new FileReader();
      reader.onerror = () => {
        setError(isRtl ? 'تعذر قراءة الصورة. حاول مرة أخرى.' : 'Could not read image file. Please try again.');
        setProcessingState(null);
      };
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => {
          setError(isRtl ? 'الصورة تالفة أو غير قابلة للقراءة.' : 'Image is corrupt or unreadable.');
          setProcessingState(null);
        };
        img.onload = async () => {
          await decodeFromSource(img, img.naturalWidth, img.naturalHeight);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(f);
    }
  }, [decodeFromSource, isRtl]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    // Reset so same file can be selected again
    e.target.value = '';
  }, [handleImageFile]);

  if (!isOpen) return null;

  const showProcessing = processingState !== null;
  const processingLabel = processingState === 'decoding'
    ? (isRtl ? 'جاري تحليل رمز QR من الصورة...' : 'Analysing QR code from image...')
    : (isRtl ? 'جاري التحقق من قاعدة البيانات السحابية...' : 'Verifying with Aafiya central ledger...');

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black">{isRtl ? 'ماسح الوثائق والوصفات الطبية' : 'Medical Document & Rx Scanner'}</h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {isRtl ? 'التحقق المباشر من صحة الوصفات ورموز الاستجابة السريعة' : 'Instant camera & token verification'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          {([
            { key: 'camera', icon: <Camera className="w-4 h-4" />, label: isRtl ? 'مسح بالكاميرا' : 'Camera' },
            { key: 'upload', icon: <Upload className="w-4 h-4" />, label: isRtl ? 'رفع صورة' : 'Upload' },
            { key: 'paste',  icon: <Clipboard className="w-4 h-4" />, label: isRtl ? 'إدخال الرمز' : 'Enter Code' },
          ] as const).map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => { setMode(key); setResult(null); setDiagnosticResult(null); setError(null); if (key !== 'camera') stopCamera(); }}
              className={`flex-1 py-3.5 text-xs font-bold flex items-center justify-center gap-2 transition-all border-b-2 cursor-pointer ${
                mode === key ? 'border-teal-500 text-teal-600 bg-teal-50/10' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {icon}<span>{label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center text-center min-h-[380px]">
          <AnimatePresence mode="wait">

            {/* Global processing overlay (decoding / verifying) */}
            {showProcessing || isScanning ? (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto" />
                <p className="text-sm font-black text-slate-700 dark:text-slate-200">{processingLabel}</p>
              </motion.div>

            ) : result ? (
              /* ── Verification Success ── */
              <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full space-y-5 text-right">
                <div className="text-center space-y-1">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{isRtl ? 'تم التحقق من صحة الوثيقة رسميّاً' : 'Document Officially Verified'}</h3>
                  <p className="text-xs text-slate-500 font-medium">{isRtl ? 'البيانات معتمدة ومطابقة لسجلات الطبيب والعيادة' : 'Certified matching clinical records'}</p>
                </div>

                <div className={`p-5 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-xs font-mono font-bold text-teal-600">{result.prescription_reference}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      {result.verification_status === 'active' ? (isRtl ? 'نشطة 🟢' : 'Active 🟢') : result.verification_status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      [isRtl ? 'المريض:' : 'Patient:', result.patient_name],
                      [isRtl ? 'الطبيب المعالج:' : 'Doctor:', result.doctor_name],
                      [isRtl ? 'المؤسسة الطبية:' : 'Clinic:', result.clinic_name],
                      [isRtl ? 'تاريخ الصلاحية:' : 'Expiry:', result.expiry_date],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span className="text-slate-400 block text-[10px]">{label}</span>
                        <strong className="text-slate-800 dark:text-slate-200">{value}</strong>
                      </div>
                    ))}
                  </div>
                  {result.items && result.items.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'الأدوية الموصوفة المصرح بها:' : 'Authorized Medications:'}</span>
                      {result.items.map((it, i) => (
                        <div key={i} className="text-xs bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between">
                          <span className="font-bold">{it.medication_name} ({it.dosage})</span>
                          <span className="text-slate-500">{it.duration}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setResult(null); setDiagnosticResult(null); setDetectedPayload(null); setDetectedToken(null); if (mode === 'camera') startCamera(); }}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    {isRtl ? 'مسح رمز آخر' : 'Scan Another'}
                  </button>
                  {detectedToken && (
                    <a
                      href={`/${locale}/verify/${detectedToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 shadow-md transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <span>{isRtl ? 'عرض صفحة التوثيق' : 'View Certificate'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </motion.div>

            ) : diagnosticResult ? (
              /* ── Diagnostic Order Verification Success ── */
              <motion.div key="diagnostic-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full space-y-5 text-right">
                <div className="text-center space-y-1">
                  <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-2">
                    {diagnosticResult.order_type === 'radiology' ? <Radio className="w-8 h-8" /> : <FlaskConical className="w-8 h-8" />}
                  </div>
                  <span className="bg-teal-50 text-teal-800 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border border-teal-200 inline-block mb-1 uppercase">
                    {diagnosticResult.order_type === 'radiology' ? (isRtl ? 'فحص تصوير وأشعة موثق' : 'RADIOLOGY ORDER VERIFIED') : (isRtl ? 'طلب تحاليل مخبرية موثق' : 'LABORATORY ORDER VERIFIED')}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {isRtl ? 'تم التحقق من صحة الطلب التشخيصي' : 'Diagnostic Order Officially Verified'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {isRtl ? 'البيانات معتمدة ومطابقة لسجلات الطبيب والمركز التشخيصي' : 'Certified matching clinical & diagnostic records'}
                  </p>
                </div>

                <div className={`p-5 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-xs font-mono font-bold text-teal-600">{diagnosticResult.order_reference}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      diagnosticResult.is_finalized
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}>
                      {diagnosticResult.is_finalized ? (isRtl ? 'معتمد رسميًا 🟢' : 'Finalized 🟢') : (isRtl ? 'قيد المعالجة 🔵' : 'In Processing 🔵')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">{isRtl ? 'المريض:' : 'Patient:'}</span>
                      <strong className="text-slate-800 dark:text-slate-200">{diagnosticResult.patient?.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">{isRtl ? 'السجل الطبي (MRN):' : 'MRN:'}</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">{diagnosticResult.patient?.mrn}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">{isRtl ? 'الطبيب المعالج:' : 'Doctor:'}</span>
                      <strong className="text-slate-800 dark:text-slate-200">{diagnosticResult.doctor?.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">{isRtl ? 'العيادة:' : 'Clinic:'}</span>
                      <strong className="text-slate-800 dark:text-slate-200">{diagnosticResult.clinic?.name}</strong>
                    </div>
                  </div>

                  {/* Privacy Wall notice if not finalized */}
                  {!diagnosticResult.is_finalized && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                      {diagnosticResult.privacy_notice || (isRtl ? 'النتائج الطبية محجوبة حتى الاعتماد الرسمي من مدير المركز الطبي.' : 'Medical results are pending official sign-off.')}
                    </div>
                  )}

                  {/* Finalized Laboratory Results */}
                  {diagnosticResult.is_finalized && diagnosticResult.items && diagnosticResult.items.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'النتائج المخبرية المعتمدة:' : 'Finalized Test Results:'}</span>
                      {diagnosticResult.items.map((it, i) => (
                        <div key={i} className="text-xs bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between">
                          <span className="font-bold">{it.test_name}</span>
                          <span className="font-mono font-bold text-teal-700">{it.result_value} {it.unit || ''}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Finalized Radiology Impression */}
                  {diagnosticResult.is_finalized && diagnosticResult.radiology_report?.impression && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'الانطباع التشخيصي النهائي:' : 'Diagnostic Impression:'}</span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        &ldquo;{diagnosticResult.radiology_report.impression}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setDiagnosticResult(null); setDetectedPayload(null); setDetectedToken(null); if (mode === 'camera') startCamera(); }}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    {isRtl ? 'مسح رمز آخر' : 'Scan Another'}
                  </button>
                  {detectedToken && (
                    <a
                      href={`/${locale}/diagnostic/order/${detectedToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 shadow-md transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <span>{isRtl ? 'عرض التوثيق الكامل' : 'View Full Order'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </motion.div>

            ) : detectedPayload && detectedPayload.type === 'PATIENT_IDENTITY' ? (
              /* ── Patient Identity Card ── */
              <motion.div key="patient-id" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full space-y-5 text-center">
                <div className="space-y-1">
                  <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-2">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{isRtl ? 'تم التعرف على هوية المريض' : 'Patient Identity Recognized'}</h3>
                  <p className="text-xs text-slate-500 font-medium">{isRtl ? 'رقم السجل الطبي الموحد للمريض (MRN)' : 'Permanent Medical Record Number (MRN)'}</p>
                </div>

                <div className={`p-5 rounded-2xl border text-center space-y-2 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[11px] font-bold text-teal-600 uppercase tracking-widest">{isRtl ? 'رقم الملف الطبي' : 'Patient MRN'}</span>
                  <p className="text-2xl font-mono font-black text-slate-900 dark:text-white">{detectedPayload.rawValue}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setDetectedPayload(null); if (mode === 'camera') startCamera(); }}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    {isRtl ? 'مسح رمز آخر' : 'Scan Another'}
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all cursor-pointer text-center"
                  >
                    {isRtl ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </motion.div>

            ) : detectedPayload && detectedPayload.type === 'APPOINTMENT' ? (
              /* ── Appointment Pass Card / Confirmation ── */
              <motion.div key="appointment-pass" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full space-y-5 text-right">
                {(() => {
                  const isAttended = 
                    checkInSuccessData !== null ||
                    appointmentPreview?.status === 'attended' ||
                    Boolean(appointmentPreview?.checked_in_at) ||
                    (checkInError !== null && (checkInError.includes('مسبقاً') || checkInError.includes('already')));

                  const appData = checkInSuccessData || appointmentPreview;
                  const patientName = appData?.patient?.name || appData?.patient_name || (isRtl ? 'مريض مسجل' : 'Registered Patient');
                  const mrn = appData?.patient?.mrn || appData?.patient_mrn || (isRtl ? 'غير متوفر' : 'N/A');
                  const doctorName = appData?.doctor?.user?.name || appData?.doctor?.name || (isRtl ? 'د. الطبيب المعالج' : 'Attending Doctor');
                  const clinicName = appData?.clinic?.name || (isRtl ? 'العيادة التخصصية' : 'Specialized Clinic');
                  const date = appData?.appointment_date || '—';
                  const time = appData?.time_slot || '—';
                  const refNumber = appData?.booking_reference || (isRtl ? 'تذكرة موعد موثقة' : 'Appointment Pass');
                  const checkedInTime = appData?.checked_in_at 
                    ? new Date(appData.checked_in_at).toLocaleTimeString(isRtl ? 'ar-DZ' : 'en-US', { hour: '2-digit', minute: '2-digit' }) 
                    : (isRtl ? 'الآن' : 'Just now');

                  if (isAttended) {
                    return (
                      /* ── STATE B: ALREADY ATTENDED / FINALIZED CARD (NO CONFIRM BUTTON) ── */
                      <div className="space-y-4 text-center">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                          <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border border-emerald-200 inline-block mb-1">
                            APPOINTMENT COMPLETED • PASS CONSUMED
                          </span>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white">
                            {isRtl ? 'تم تسجيل حضور المريض مسبقاً 🟢' : 'Patient Attendance Already Recorded 🟢'}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            {isRtl ? 'تم تسجيل حضور هذا الموعد مسبقاً ولا يمكن استخدام تذكرة الحضور مرة أخرى.' : 'Attendance was already confirmed for this appointment. Pass cannot be reused.'}
                          </p>
                        </div>

                        <div className={`p-5 rounded-2xl border text-right space-y-3 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <span className="text-xs font-mono font-bold text-teal-600">
                              {refNumber}
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                              {isRtl ? 'حضر 🟢' : 'Attended 🟢'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px]">{isRtl ? 'المريض:' : 'Patient:'}</span>
                              <strong className="text-slate-800 dark:text-slate-200">{patientName}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">{isRtl ? 'السجل الطبي (MRN):' : 'MRN:'}</span>
                              <strong className="text-slate-800 dark:text-slate-200 font-mono">{mrn}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">{isRtl ? 'الطبيب المعالج:' : 'Doctor:'}</span>
                              <strong className="text-slate-800 dark:text-slate-200">{doctorName}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">{isRtl ? 'العيادة:' : 'Clinic:'}</span>
                              <strong className="text-slate-800 dark:text-slate-200">{clinicName}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">{isRtl ? 'تاريخ ووقت الموعد:' : 'Date & Time:'}</span>
                              <strong className="text-slate-800 dark:text-slate-200 font-mono">{date} • {time}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">{isRtl ? 'وقت تسجيل الحضور:' : 'Checked in at:'}</span>
                              <strong className="text-emerald-600 font-mono font-bold">{checkedInTime}</strong>
                            </div>
                          </div>
                        </div>

                        {/* ZERO CONFIRM BUTTON HERE — STRICTLY SCAN ANOTHER OR CLOSE */}
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => { setDetectedPayload(null); setCheckInSuccessData(null); setAppointmentPreview(null); setCheckInError(null); if (mode === 'camera') startCamera(); }}
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                          >
                            {isRtl ? 'مسح رمز آخر' : 'Scan Another'}
                          </button>
                          <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all cursor-pointer text-center"
                          >
                            {isRtl ? 'إغلاق' : 'Close'}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  /* ── STATE A: NOT YET CHECKED IN (SHOWS CONFIRM BUTTON) ── */
                  return (
                    <div className="space-y-4 text-center">
                      <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2">
                        <Calendar className="w-8 h-8" />
                      </div>
                      <div>
                        <span className="bg-indigo-50 text-indigo-800 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border border-indigo-200 inline-block mb-1">
                          APPOINTMENT CHECK-IN PASS
                        </span>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">
                          {isRtl ? 'بطاقة تأكيد حضور الموعد' : 'Confirm Appointment Attendance'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {isRtl ? 'تحقق من بيانات المريض والموعد واضغط على الزر لتأكيد الحضور' : 'Verify patient & appointment details then confirm check-in'}
                        </p>
                      </div>

                      <div className={`p-5 rounded-2xl border text-right space-y-3 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="text-xs font-mono font-bold text-teal-600">
                            {refNumber}
                          </span>
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                            {isRtl ? 'في انتظار الحضور' : 'Ready for Check-in'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px]">{isRtl ? 'المريض:' : 'Patient:'}</span>
                            <strong className="text-slate-800 dark:text-slate-200">{patientName}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">{isRtl ? 'السجل الطبي (MRN):' : 'MRN:'}</span>
                            <strong className="text-slate-800 dark:text-slate-200 font-mono">{mrn}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">{isRtl ? 'الطبيب المعالج:' : 'Doctor:'}</span>
                            <strong className="text-slate-800 dark:text-slate-200">{doctorName}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">{isRtl ? 'العيادة:' : 'Clinic:'}</span>
                            <strong className="text-slate-800 dark:text-slate-200">{clinicName}</strong>
                          </div>
                          <div className="col-span-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="text-slate-400 block text-[10px]">{isRtl ? 'تاريخ ووقت الموعد:' : 'Date & Time:'}</span>
                              <strong className="text-indigo-600 font-mono font-bold">
                                {date} • {time}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {checkInError && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 text-right">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{checkInError}</span>
                        </div>
                      )}

                      <div className="space-y-2 pt-1">
                        <button
                          onClick={handleConfirmCheckIn}
                          disabled={isCheckingIn}
                          className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isCheckingIn ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{isRtl ? 'جاري تأكيد الحضور في النظام...' : 'Confirming attendance...'}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-5 h-5" />
                              <span>{isRtl ? 'تأكيد حضور المريض' : 'Confirm Patient Attendance'}</span>
                            </>
                          )}
                        </button>

                        <div className="flex gap-2">
                          <button
                            onClick={() => { setDetectedPayload(null); setCheckInError(null); setAppointmentPreview(null); if (mode === 'camera') startCamera(); }}
                            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                          >
                            {isRtl ? 'مسح رمز آخر' : 'Scan Another'}
                          </button>
                          <button
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-300 transition-all cursor-pointer"
                          >
                            {isRtl ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>

            ) : error ? (
              /* ── Error State ── */
              <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 w-full max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <p className="text-sm font-black text-rose-900 dark:text-rose-400 leading-relaxed">{error}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    onClick={() => { setError(null); if (mode === 'camera') startCamera(); }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'إعادة المحاولة' : 'Retry'}</span>
                  </button>
                  {/* Native Camera Capture via label — works on HTTP LAN */}
                  <label
                    htmlFor="medi-native-camera-input"
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <CameraIcon className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'التقاط صورة بالكاميرا' : 'Take Photo'}</span>
                  </label>
                </div>
              </motion.div>

            ) : (
              /* ── Mode Content ── */
              <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">

                {/* ── Camera Mode ── */}
                {mode === 'camera' && (
                  <div className="space-y-4">
                    {cameraError ? (
                      <div className={`p-6 border rounded-3xl space-y-4 max-w-md mx-auto ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center mx-auto">
                          <VideoOff className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                          {cameraError}
                        </p>

                        <div className="flex flex-col items-center gap-2.5 pt-1">
                          {/* Retry Live Camera */}
                          <button
                            onClick={startCamera}
                            className="w-full px-5 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{isRtl ? 'إعادة المحاولة (بث حي)' : 'Retry Live Stream'}</span>
                          </button>

                          {/* ── Native Camera Snapshot via HTML label (works on HTTP) ── */}
                          <label
                            htmlFor="medi-native-camera-input"
                            className="w-full px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-emerald-500/20"
                          >
                            <CameraIcon className="w-4 h-4" />
                            <span>{isRtl ? '📷 التقاط صورة الوصفة بالكاميرا' : '📷 Snap Prescription with Camera'}</span>
                          </label>

                          {/* Upload from gallery */}
                          <label
                            htmlFor="medi-file-upload-input"
                            className="w-full px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                          >
                            <ImagePlus className="w-4 h-4" />
                            <span>{isRtl ? 'رفع صورة من المعرض' : 'Choose from Gallery'}</span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      /* Live Camera Preview */
                      <div className="relative w-72 h-72 mx-auto bg-black rounded-[36px] border-4 border-slate-800 flex items-center justify-center overflow-hidden shadow-xl">
                        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-48 h-48 border-2 border-teal-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(20,184,166,0.4)]">
                            <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-teal-400"></div>
                            <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-teal-400"></div>
                            <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-teal-400"></div>
                            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-teal-400"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 font-medium">
                      {isRtl ? 'وجه الكاميرا نحو رمز QR الموجود على الوصفة الطبية' : 'Point the camera directly at the QR code on the prescription'}
                    </p>
                  </div>
                )}

                {/* ── Upload Mode ── */}
                {mode === 'upload' && (
                  <div className="space-y-4">
                    <label
                      htmlFor="medi-file-upload-input"
                      className={`w-72 h-52 mx-auto border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-teal-50/10 hover:border-teal-500/50 ${
                        isDarkMode ? 'border-slate-700' : 'border-slate-300'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isRtl ? 'اضغط لرفع صورة رمز QR' : 'Tap to upload a QR image'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP</p>
                      </div>
                    </label>
                  </div>
                )}

                {/* ── Paste / Manual Token Mode ── */}
                {mode === 'paste' && (
                  <div className="space-y-4 max-w-sm mx-auto">
                    <div className="space-y-1.5 text-right">
                      <label className="text-[11px] font-bold text-slate-500 block">
                        {isRtl ? 'أدخل رابط التحقق أو الرمز المرجعي للوصفة' : 'Enter verification URL or prescription token'}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={isRtl ? 'مثلاً: CbvgANjy30Rkp9WX...' : 'e.g. CbvgANjy30Rkp9WX...'}
                          value={manualId}
                          onChange={(e) => setManualId(e.target.value)}
                          className={`w-full py-3.5 pr-10 pl-4 rounded-xl border text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none transition-all ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'
                          }`}
                        />
                        <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <button
                      onClick={() => executeVerification(manualId)}
                      disabled={manualId.trim().length < 5}
                      className="w-full py-3 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isRtl ? 'التحقق السحابي الفوري' : 'Verify Now'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}`}>
          <button onClick={onClose} className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 cursor-pointer">
            <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            <span>{isRtl ? 'إغلاق الماسح' : 'Close Scanner'}</span>
          </button>
        </div>
      </motion.div>

      {/* ── Native Camera Capture Input (id-linked to labels, NOT hidden via display:none) ── */}
      {/*
        Using opacity-0 + position absolute + pointer-events-none instead of className="hidden"
        so that the label click correctly triggers the native file/camera picker on mobile browsers.
        The label htmlFor="medi-native-camera-input" is the authoritative tap target.
      */}
      <input
        id="medi-native-camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="sr-only"
        aria-hidden="true"
      />

      {/* ── Gallery / File Upload Input ── */}
      <input
        id="medi-file-upload-input"
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        ref={fileInputRef}
        className="sr-only"
        aria-hidden="true"
      />
    </div>
  );
};
