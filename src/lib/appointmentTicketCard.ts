'use client';

export interface AppointmentTicketData {
  patientName: string;
  patientPhone?: string;
  doctorName: string;
  specialty: string;
  doctorLatin?: string;
  clinicName: string;
  clinicLatin?: string;
  date: string;
  timeSlot: string;
  refNumber: string;
  ticketUrl: string;
  status?: string; // 'pending' | 'confirmed' | 'approved'
}

export type WhatsAppLanguage = 'ar' | 'fr' | 'en';

export interface PhoneNormalizationResult {
  phone: string;
  isValid: boolean;
  warning?: string;
}

/**
 * Normalizes phone numbers with strict Algerian & international standards.
 * Prevents corrupting international or ambiguous numbers with 213, while properly
 * converting local Algerian 05/06/07/02/03/04/09 numbers to 213.
 */
export function normalizeWhatsAppPhone(rawPhone?: string): PhoneNormalizationResult {
  if (!rawPhone) {
    return { phone: '', isValid: false, warning: 'رقم الهاتف غير متوفر.' };
  }

  const trimmed = rawPhone.trim();
  if (!trimmed) {
    return { phone: '', isValid: false, warning: 'رقم الهاتف غير متوفر.' };
  }

  // 1. If starts with 00, treat as international prefix
  if (trimmed.startsWith('00')) {
    const digits = trimmed.slice(2).replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) {
      return { phone: digits, isValid: true };
    }
    return { phone: '', isValid: false, warning: 'الرقم الدولي غير مكتمل أو غير صالح.' };
  }

  // 2. If starts with +, international standard E.164
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) {
      return { phone: digits, isValid: true };
    }
    return { phone: '', isValid: false, warning: 'الرقم الدولي غير مكتمل أو غير صالح.' };
  }

  // 3. Extract digits only
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return { phone: '', isValid: false, warning: 'رقم الهاتف لا يحتوي على أرقام صالحة.' };
  }

  // 4. Algerian local numbers starting with 0 (10 digits total)
  if (digits.startsWith('0') && digits.length === 10) {
    const secondDigit = digits.charAt(1);
    // Mobile: 5, 6, 7 | Fixed lines: 2, 3, 4, 9
    if (['5', '6', '7', '2', '3', '4', '9'].includes(secondDigit)) {
      return { phone: `213${digits.slice(1)}`, isValid: true };
    }
    // Ambiguous local number with unknown second digit: do not prepend 213!
    return { 
      phone: '', 
      isValid: false, 
      warning: 'الرقم المحلي غير متطابق مع شبكات الهاتف بالجزائر، يرجى كتابة الرمز الدولي.' 
    };
  }

  // 5. Already has Algerian country code 213
  if (digits.startsWith('213') && (digits.length === 11 || digits.length === 12)) {
    return { phone: digits, isValid: true };
  }

  // 6. Algerian mobile without leading 0 (9 digits starting with 5, 6, 7)
  if (digits.length === 9 && ['5', '6', '7'].includes(digits.charAt(0))) {
    return { phone: `213${digits}`, isValid: true };
  }

  // 7. General international number entered without + (10 to 15 digits not starting with 0)
  if (!digits.startsWith('0') && digits.length >= 10 && digits.length <= 15) {
    return { phone: digits, isValid: true };
  }

  // 8. Ambiguous or short number
  return { 
    phone: '', 
    isValid: false, 
    warning: 'رقم الهاتف غير واضح أو غير مكتمل الرمز الدولي.' 
  };
}

/**
 * Builds the verified professional WhatsApp appointment message according
 * to the revised 6 approved templates (AR / FR / EN x Pending / Confirmed).
 * Strict adherence to:
 * - Brand spelling: "Aafiya" in all foreign texts.
 * - Honest manual sharing: Zero false claims of "البطاقة مرفقة أعلاه" before actual manual attachment.
 * - Neutral medical closing: Fits all specialties.
 * - Honest status: Pending clearly indicates awaiting confirmation.
 */
export function buildWhatsAppAppointmentMessage(
  data: AppointmentTicketData,
  lang: WhatsAppLanguage = 'ar'
): string {
  const isPending = data.status === 'pending';
  const doctorSpecialty = data.specialty ? ` (${data.specialty})` : '';

  if (lang === 'fr') {
    if (isPending) {
      return [
        `Plateforme Aafiya | Enregistrement de demande de rendez-vous`,
        ``,
        `Bonjour ${data.patientName},`,
        ``,
        `Votre demande de rendez-vous médical a été enregistrée avec succès. Elle est actuellement *en cours d'examen et de validation* par l'établissement.`,
        ``,
        `Détails de la demande :`,
        `• Médecin : Dr ${data.doctorName}${doctorSpecialty}`,
        `• Établissement : ${data.clinicName}`,
        `• Date souhaitée : ${data.date}`,
        `• Heure souhaitée : ${data.timeSlot}`,
        `• Référence : ${data.refNumber}`,
        ``,
        `Pour suivre l'état de votre demande et consulter votre ticket :`,
        data.ticketUrl,
        ``,
        `Remarque : Ce rendez-vous est en attente de validation par l'établissement.`,
        `Nous vous souhaitons une excellente santé.`,
      ].join('\n');
    }

    // Confirmed FR
    return [
      `Plateforme Aafiya | Confirmation de rendez-vous médical`,
      ``,
      `Bonjour ${data.patientName},`,
      ``,
      `Nous vous confirmons la validation de votre rendez-vous médical.`,
      ``,
      `Détails du rendez-vous :`,
      `• Médecin : Dr ${data.doctorName}${doctorSpecialty}`,
      `• Établissement : ${data.clinicName}`,
      `• Date : ${data.date}`,
      `• Heure : ${data.timeSlot}`,
      `• Référence : ${data.refNumber}`,
      ``,
      `Lien vers votre pass digital et QR code d'accès :`,
      data.ticketUrl,
      ``,
      `Instructions de visite :`,
      `• Veuillez vous présenter à l'accueil 15 minutes à l'avance et présenter le QR code d'accès.`,
      `Nous vous souhaitons une excellente santé.`,
    ].join('\n');
  }

  if (lang === 'en') {
    if (isPending) {
      return [
        `Aafiya Platform | Appointment Request Registered`,
        ``,
        `Hello ${data.patientName},`,
        ``,
        `Your appointment booking request has been registered and is currently *pending review and confirmation* by the clinic.`,
        ``,
        `Request Details:`,
        `• Doctor: Dr. ${data.doctorName}${doctorSpecialty}`,
        `• Clinic: ${data.clinicName}`,
        `• Requested Date: ${data.date}`,
        `• Requested Time: ${data.timeSlot}`,
        `• Reference: ${data.refNumber}`,
        ``,
        `Track request status and view ticket:`,
        data.ticketUrl,
        ``,
        `Note: This appointment is pending confirmation by the clinic.`,
        `Wishing you good health and wellness.`,
      ].join('\n');
    }

    // Confirmed EN
    return [
      `Aafiya Platform | Medical Appointment Confirmation`,
      ``,
      `Hello ${data.patientName},`,
      ``,
      `Your medical appointment has been officially confirmed.`,
      ``,
      `Appointment Details:`,
      `• Doctor: Dr. ${data.doctorName}${doctorSpecialty}`,
      `• Clinic: ${data.clinicName}`,
      `• Date: ${data.date}`,
      `• Time: ${data.timeSlot}`,
      `• Reference: ${data.refNumber}`,
      ``,
      `Digital Ticket & QR Access Pass:`,
      data.ticketUrl,
      ``,
      `Visit Instructions:`,
      `• Please arrive 15 minutes before your appointment and present your QR access code at reception.`,
      `Wishing you good health and wellness.`,
    ].join('\n');
  }

  // Default: Arabic
  if (isPending) {
    return [
      `منصة عافية (Aafiya) | تسجيل طلب موعد طبي`,
      ``,
      `مرحباً بك ${data.patientName}،`,
      ``,
      `تم تسجيل طلب حجز موعدك الطبي بنجاح، وهو حالياً *قيد المراجعة والاعتماد* من قبل العيادة.`,
      ``,
      `تفاصيل الطلب:`,
      `• الطبيب: د. ${data.doctorName}${doctorSpecialty}`,
      `• العيادة: ${data.clinicName}`,
      `• التاريخ المطلوب: ${data.date}`,
      `• التوقيت المطلوب: ${data.timeSlot}`,
      `• الرقم المرجعي: ${data.refNumber}`,
      ``,
      `لمتابعة حالة الطلب وبطاقة الحجز:`,
      data.ticketUrl,
      ``,
      `ملاحظة: هذا الموعد معلّق وبانتظار اعتماد العيادة.`,
      `نتمنى لكم دوام الصحة والعافية.`,
    ].join('\n');
  }

  // Confirmed AR
  return [
    `منصة عافية (Aafiya) | تأكيد موعد طبي معتمد`,
    ``,
    `مرحباً بك ${data.patientName}،`,
    ``,
    `نؤكد لك اعتماد وحجز موعدك الطبي.`,
    ``,
    `تفاصيل الموعد:`,
    `• الطبيب: د. ${data.doctorName}${doctorSpecialty}`,
    `• العيادة: ${data.clinicName}`,
    `• التاريخ: ${data.date}`,
    `• التوقيت: ${data.timeSlot}`,
    `• الرقم المرجعي: ${data.refNumber}`,
    ``,
    `تذكرتك الرقمية ورمز الدخول السريع (QR Code):`,
    data.ticketUrl,
    ``,
    `تعليمات الحضور:`,
    `• يُرجى الحضور قبل الموعد بـ 15 دقيقة وإبراز رمز QR عند مكتب الاستقبال.`,
    `نتمنى لكم دوام الصحة والعافية.`,
  ].join('\n');
}

/**
 * Fits text within max width by reducing font size or gracefully adding ellipsis.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  startSize: number,
  minSize: number,
  family: string,
  weight: string = '700'
): void {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  let w = ctx.measureText(text).width;

  while (w > maxW && size > minSize) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${family}`;
    w = ctx.measureText(text).width;
  }

  let finalText = text;
  if (w > maxW) {
    while (finalText.length > 4 && ctx.measureText(finalText + '…').width > maxW) {
      finalText = finalText.slice(0, -1);
    }
    finalText += '…';
  }

  ctx.fillText(finalText, x, y);
}

/**
 * Draws the official, hospital-grade AAFIYA appointment ticket PNG
 * exactly adhering to the approved reference template "approved-original-reference.png" (1024x1536).
 * Overlays dynamic appointment fields and QR code over the exact calibrated positions.
 */
export async function generateAppointmentCardCanvas(
  data: AppointmentTicketData,
  qrSvgElement?: SVGSVGElement | null
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const width = 1024;
  const height = 1536;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Ensure fonts are ready
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  // 1. Draw Master Approved Artwork as the foundational visual layer
  const artworkImg = new Image();
  artworkImg.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    artworkImg.onload = () => {
      ctx.drawImage(artworkImg, 0, 0, width, height);
      resolve();
    };
    artworkImg.onerror = () => {
      // Fallback path in case relative URL differs
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        ctx.drawImage(fallbackImg, 0, 0, width, height);
        resolve();
      };
      fallbackImg.onerror = reject;
      fallbackImg.src = '/assets/appointment-ticket/approved-original-reference.png';
    };
    artworkImg.src = '/assets/appointment-ticket/approved-original-reference.png';
  });

  // Solid background mask for dynamic data text: #EEF5FD perfectly matches the card inner fill
  const MASK_BG = '#EEF5FD';

  // 2. Patient Section (x: 195, y: 518, w: 410, h: 95)
  ctx.fillStyle = MASK_BG;
  ctx.fillRect(195, 518, 410, 95);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#082653';
  ctx.font = '700 28px Cairo, "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('اسم المريض', 195, 548);
  fitText(ctx, data.patientName, 195, 596, 400, 40, 22, 'Cairo, "IBM Plex Sans Arabic", sans-serif', '800');

  // 3. Doctor Section (x: 195, y: 631, w: 410, h: 130)
  ctx.fillStyle = MASK_BG;
  ctx.fillRect(195, 631, 410, 130);
  ctx.fillStyle = '#082653';
  ctx.font = '700 28px Cairo, "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('الطبيب', 195, 661);
  const docPrefix = data.doctorName.startsWith('د.') ? '' : 'د. ';
  fitText(ctx, `${docPrefix}${data.doctorName}`, 195, 706, 400, 38, 20, 'Cairo, "IBM Plex Sans Arabic", sans-serif', '800');
  ctx.fillStyle = '#082653';
  const doctorSub = data.doctorLatin || data.specialty || '';
  fitText(ctx, doctorSub, 195, 746, 400, 29, 18, '"Plus Jakarta Sans", Arial, sans-serif', '700');

  // 4. Clinic Section (x: 195, y: 780, w: 410, h: 128)
  ctx.fillStyle = MASK_BG;
  ctx.fillRect(195, 780, 410, 128);
  ctx.fillStyle = '#082653';
  ctx.font = '700 28px Cairo, "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('العيادة', 195, 810);
  fitText(ctx, data.clinicName, 195, 856, 400, 36, 18, 'Cairo, "IBM Plex Sans Arabic", sans-serif', '800');
  ctx.fillStyle = '#082653';
  const clinicSub = data.clinicLatin || (data.clinicName.includes('عافية') ? 'Aafiya Medical Center' : data.clinicName);
  fitText(ctx, clinicSub, 195, 895, 400, 29, 18, '"Plus Jakarta Sans", Arial, sans-serif', '700');

  // 5. Date Section (x: 195, y: 929, w: 305, h: 105)
  ctx.fillStyle = MASK_BG;
  ctx.fillRect(195, 929, 305, 105);
  ctx.fillStyle = '#082653';
  ctx.font = '700 28px Cairo, "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('التاريخ', 195, 960);
  fitText(ctx, data.date, 195, 1012, 290, 39, 24, '"Plus Jakarta Sans", monospace', '700');

  // 6. Time Section (x: 645, y: 942, w: 310, h: 95)
  ctx.fillStyle = MASK_BG;
  ctx.fillRect(645, 942, 310, 95);
  ctx.fillStyle = '#082653';
  ctx.font = '700 28px Cairo, "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('التوقيت', 650, 975);
  fitText(ctx, data.timeSlot, 650, 1022, 290, 38, 22, 'Cairo, "IBM Plex Sans Arabic", sans-serif', '800');

  // 7. Reference Section (x: 195, y: 1060, w: 455, h: 96)
  ctx.fillStyle = MASK_BG;
  ctx.fillRect(195, 1060, 455, 96);
  ctx.fillStyle = '#082653';
  ctx.font = '700 28px Cairo, "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('رقم المرجع', 195, 1090);
  fitText(ctx, data.refNumber, 195, 1138, 440, 39, 24, '"Plus Jakarta Sans", monospace', '700');

  // 8. QR Replacement Box (x: 635, y: 523, w: 348, h: 418, r: 27)
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#159447';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(635, 523, 348, 418, 27);
  ctx.fill();
  ctx.stroke();

  // Render QR Code inside frame
  const qrX = 660;
  const qrY = 540;
  const qrSize = 298;

  if (qrSvgElement) {
    try {
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(qrSvgElement);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(svgBlob);
      const qImg = new Image();

      await new Promise<void>((resolve) => {
        qImg.onload = () => {
          ctx.drawImage(qImg, qrX, qrY, qrSize, qrSize);
          URL.revokeObjectURL(blobUrl);
          resolve();
        };
        qImg.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          drawCleanFallbackQr(ctx, qrX, qrY, qrSize);
          resolve();
        };
        qImg.src = blobUrl;
      });
    } catch {
      drawCleanFallbackQr(ctx, qrX, qrY, qrSize);
    }
  } else {
    drawCleanFallbackQr(ctx, qrX, qrY, qrSize);
  }

  // QR Bottom Navy Band (x: 636, y: 864, w: 346, h: 76, bottom radius: 25)
  ctx.fillStyle = '#062957';
  ctx.beginPath();
  ctx.roundRect(636, 864, 346, 76, [0, 0, 25, 25]);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 23px Cairo, "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('امسح رمز QR عند الوصول', 809, 897);
  ctx.font = '700 20px Arial, sans-serif';
  ctx.fillText('Scan QR at Check-in', 809, 927);

  // 9. Status Badge Overlay
  const isPending = data.status === 'pending';
  if (isPending) {
    // Amber Badge Pill replacing green pill
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.roundRect(695, 362, 284, 96, 48);
    ctx.fill();

    // Clock icon
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(747, 410, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(747, 398);
    ctx.lineTo(747, 410);
    ctx.lineTo(757, 410);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 32px Cairo, "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('موعد معلّق', 860, 404);
    ctx.font = '700 24px Arial, sans-serif';
    ctx.fillText('Pending', 860, 438);
  }
  // If confirmed: the approved-original-reference artwork already has the authentic green badge!

  return canvas;
}

/**
 * Fallback deterministic QR pattern when no DOM SVG element is passed.
 */
function drawCleanFallbackQr(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.fillStyle = '#000000';
  const modules = 29;
  const mSize = size / modules;

  function drawFinder(fx: number, fy: number) {
    ctx.fillRect(x + fx * mSize, y + fy * mSize, 7 * mSize, 7 * mSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + (fx + 1) * mSize, y + (fy + 1) * mSize, 5 * mSize, 5 * mSize);
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + (fx + 2) * mSize, y + (fy + 2) * mSize, 3 * mSize, 3 * mSize);
  }

  drawFinder(1, 1);
  drawFinder(modules - 8, 1);
  drawFinder(1, modules - 8);

  for (let i = 8; i < modules - 8; i += 2) {
    ctx.fillRect(x + i * mSize, y + 4 * mSize, mSize, mSize);
    ctx.fillRect(x + 4 * mSize, y + i * mSize, mSize, mSize);
  }

  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if ((r < 9 && c < 9) || (r < 9 && c > modules - 10) || (r > modules - 10 && c < 9)) continue;
      if (((r * 7 + c * 13 + (r ^ c)) % 3) === 0) {
        ctx.fillRect(x + c * mSize, y + r * mSize, mSize, mSize);
      }
    }
  }
}

/**
 * Generates a safe, cross-platform filename for the downloaded appointment ticket PNG.
 * Preserves Arabic characters, replaces spaces/unsafe characters with underscores,
 * strips leading/trailing underscores and dots, and defaults to 'Aafiya_Appointment.png' if empty.
 * Example: "جديد لخضر" -> "Aafiya_جديد_لخضر.png"
 */
export function formatTicketFilename(patientName?: string): string {
  if (!patientName) {
    return 'Aafiya_Appointment.png';
  }

  // Normalize Unicode (NFC)
  let cleanName = patientName.normalize('NFC').trim();
  if (!cleanName) {
    return 'Aafiya_Appointment.png';
  }

  // Replace unsafe filesystem / URI characters with underscore:
  cleanName = cleanName.replace(/[\x00-\x1f\x7f\/\\:*?"<>|#%&{}$!+=`';@^~]/g, '_');

  // Replace whitespace (including multiple spaces, tabs, newlines) with underscore
  cleanName = cleanName.replace(/\s+/g, '_');

  // Collapse multiple consecutive underscores or hyphens into a single underscore
  cleanName = cleanName.replace(/_+/g, '_');

  // Strip leading and trailing underscores, dots, or hyphens
  cleanName = cleanName.replace(/^[_.\-]+|[_.\-]+$/g, '');

  // If after sanitization the name is empty or consists of only invalid tokens
  if (!cleanName) {
    return 'Aafiya_Appointment.png';
  }

  // Cap maximum length for filesystem safety (60 chars for name)
  if (cleanName.length > 60) {
    cleanName = cleanName.substring(0, 60).replace(/[_.\-]+$/, '');
  }

  return `Aafiya_${cleanName}.png`;
}

/**
 * Downloads the high-resolution PNG appointment card directly using the exact reference template.
 */
export async function downloadAppointmentCardPng(
  data: AppointmentTicketData,
  qrSvgElement?: SVGSVGElement | null
): Promise<void> {
  const canvas = await generateAppointmentCardCanvas(data, qrSvgElement);

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate PNG blob from canvas'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = formatTicketFilename(data.patientName);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

/**
 * Opens WhatsApp sharing link manually with honest prompt validation.
 */
export function openWhatsAppAppointmentShare(
  data: AppointmentTicketData,
  lang: WhatsAppLanguage = 'ar',
  onWarning?: (msg: string) => void
): boolean {
  const norm = normalizeWhatsAppPhone(data.patientPhone);
  if (!norm.isValid || !norm.phone) {
    const warnMsg = norm.warning || 'تعذر فتح WhatsApp: رقم هاتف المريض غير صالح أو غير مكتمل.';
    if (onWarning) {
      onWarning(warnMsg);
    } else if (typeof window !== 'undefined') {
      alert(warnMsg);
    }
    return false;
  }

  const message = buildWhatsAppAppointmentMessage(data, lang);
  const waUrl = `https://wa.me/${norm.phone}?text=${encodeURIComponent(message)}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
  return true;
}
