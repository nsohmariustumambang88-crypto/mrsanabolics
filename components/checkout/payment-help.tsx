import { Mail, MessageCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
  "How to reach us about this order", for every state of the payment page that is not a
  straightforward "send this amount here". Plain component with no server-only imports, so the
  server page and the client component can both render it.

  WhatsApp and Telegram are buttons that open the app with a message already written, order
  number included (the owner's request: the number should be something you press, not copy).
*/

const SUPPORT_EMAIL = 'support@mrsanabolics.com';
const TELEGRAM_URL = 'https://t.me/mrsanabolics';
export const WHATSAPP_NUMBER = '19143137729';

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Opens a WhatsApp chat with the shop, the message written in. */
export function WhatsAppButton({ message, className }: { message: string; className?: string }) {
  return (
    <a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full bg-pigment-verdigris px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90',
        className
      )}
    >
      <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
      Message us on WhatsApp
    </a>
  );
}

export function PaymentHelp({ reference, intro }: { reference: string; intro: string }) {
  const secondary =
    'inline-flex items-center justify-center gap-2 rounded-full border border-rule-strong px-5 py-2.5 text-sm font-medium transition-colors hover:border-pigment-indigo hover:text-pigment-indigo';
  return (
    <div className="border-t border-rule pt-6">
      <h2 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">Contact us</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{intro}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <WhatsAppButton message={`Hi, about my order ${reference}`} />
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={secondary}>
          <Send className="h-4 w-4" strokeWidth={1.75} />
          Telegram
        </a>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Order ${reference}`)}`}
          className={secondary}
        >
          <Mail className="h-4 w-4" strokeWidth={1.75} />
          Email
        </a>
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        WhatsApp +1 914 313 7729 · {SUPPORT_EMAIL} · Quote your order number, {reference}.
      </p>
    </div>
  );
}
