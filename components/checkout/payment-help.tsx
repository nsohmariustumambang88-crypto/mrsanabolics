/*
  "How to reach us about this order", for every state of the payment page that is not a
  straightforward "send this amount here". Plain component with no server-only imports, so the
  server page and the client component can both render it.
*/

const SUPPORT_EMAIL = 'support@mrsanabolics.com';
const TELEGRAM_URL = 'https://t.me/mrsanabolics';
const WHATSAPP_NUMBER = '19143137729';

export function PaymentHelp({ reference, intro }: { reference: string; intro: string }) {
  const link = 'underline underline-offset-4 transition-colors hover:text-pigment-indigo';
  return (
    <div className="border-t border-rule pt-6">
      <h2 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">Contact us</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{intro}</p>
      <ul className="mt-4 space-y-2 text-sm text-ink">
        <li>
          Email:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Order ${reference}`)}`} className={link}>
            {SUPPORT_EMAIL}
          </a>
        </li>
        <li>
          Telegram:{' '}
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={link}>
            @mrsanabolics
          </a>
        </li>
        <li>
          WhatsApp:{' '}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, about my order ${reference}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={link}
          >
            +1 914 313 7729
          </a>
        </li>
      </ul>
      <p className="mt-3 text-xs text-ink-faint">Quote your order number, {reference}.</p>
    </div>
  );
}
