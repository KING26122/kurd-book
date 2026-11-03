import { env } from '../env';

export async function sendSms(to: string, message: string): Promise<void> {
  if (env.SMS_PROVIDER === 'console') {
    console.log('\n┌────────────────────────────────────────────┐');
    console.log('│  📱  KURD BOOK — SMS (console mode)         │');
    console.log('└────────────────────────────────────────────┘');
    console.log(`To: ${to}`);
    console.log(message);
    console.log('──────────────────────────────────────────────\n');
    return;
  }

  if (env.SMS_PROVIDER === 'twilio') {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM) {
      throw new Error('Twilio is not fully configured.');
    }
    const body = new URLSearchParams({
      To: to,
      From: env.TWILIO_FROM,
      Body: message,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Twilio error ${res.status}: ${detail.slice(0, 300)}`);
    }
    return;
  }

  if (env.SMS_PROVIDER === 'textbelt') {
    const res = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: to,
        message,
        key: env.TEXTBELT_KEY || 'textbelt',
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      throw new Error(`Textbelt error: ${data.error || res.status}`);
    }
    return;
  }

  if (env.SMS_PROVIDER === 'webhook') {
    if (!env.SMS_WEBHOOK_URL) throw new Error('SMS webhook URL is missing.');
    const res = await fetch(env.SMS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${env.SMS_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify({ to, message }),
    });
    if (!res.ok) throw new Error(`SMS webhook error ${res.status}`);
  }
}

export function sendOtpSms(to: string, code: string): Promise<void> {
  return sendSms(to, `Kurd Book\nکۆدی پشتڕاستکردنەوەت: ${code}\nبۆ ٥ خولەک کارایە.`);
}
