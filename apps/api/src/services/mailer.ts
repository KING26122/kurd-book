import nodemailer from 'nodemailer';
import { env } from '../env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  if (env.EMAIL_PROVIDER === 'console') {
    console.log('\n┌────────────────────────────────────────────┐');
    console.log('│  📧  KURD BOOK — EMAIL (console mode)       │');
    console.log('└────────────────────────────────────────────┘');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('──────────────────────────────────────────────\n');
    return;
  }

  if (!env.SMTP_HOST) {
    throw new Error('SMTP is not configured (SMTP_HOST is missing).');
  }

  await getTransporter().sendMail({
    from: env.MAIL_FROM,
    to,
    subject,
    html,
    text,
  });
}

export function sendOtpEmail(to: string, code: string, purpose: string): Promise<void> {
  const purposeLabel =
    purpose === 'REGISTER' ? 'دروستکردنی هەژمار' : purpose === 'RESET' ? 'گۆڕینی وشەی نهێنی' : 'چوونەژوورەوە';
  const html = `
  <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#0b1020;padding:32px;color:#eef2ff;border-radius:20px;max-width:560px;margin:auto">
    <div style="font-size:26px;font-weight:800;color:#f5c451;margin-bottom:8px">کورد بووک</div>
    <p style="color:#9fb0cc;margin-top:0">تۆڕی کۆمەڵایەتی کوردستان</p>
    <h2 style="font-size:20px">کۆدی ${purposeLabel}</h2>
    <p>کۆدی چوارخانەیی (OTP) بۆ داواکارییەکەت:</p>
    <div style="letter-spacing:12px;font-size:34px;font-weight:800;background:#151e36;border:1px solid #2b3a5c;border-radius:14px;text-align:center;padding:18px;color:#52e0b8">${code}</div>
    <p style="color:#9fb0cc;font-size:13px">کۆدەکە بۆ ماوەی ٥ خولەک کارا دەبێت و تەنها یەک جار بەکار دێت.</p>
    <p style="color:#9fb0cc;font-size:13px">ئەگەر تۆ ئەم داواکارییەت نەکردووە، پشتگوێی بخە.</p>
    <hr style="border:0;border-top:1px solid #2b3a5c;margin:24px 0" />
    <p style="color:#6f809e;font-size:12px">کورد بووک — بۆ کوردستان، بە دەستی کوردستان</p>
  </div>`;
  const text = `کورد بووک\nکۆدی ${purposeLabel}: ${code}\nکۆدەکە ٥ خولەک کارایە.`;
  return sendEmail(to, `کورد بووک — کۆدی ${purposeLabel}: ${code}`, html, text);
}
