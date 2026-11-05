'use client';

import { Send } from 'lucide-react';

const TELEGRAM_URL = 'https://t.me/mrsanabolics';

export function TelegramWidget() {
  return (
    <a
      href={TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on Telegram"
      title="Chat with us on Telegram"
      /* 44px and 12px from the edge on phones, 56px from md, as for WhatsApp. Moves up while a
         product page's buy bar is showing (data-buybar, phones only). */
      className="fixed bottom-3 right-3 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[#229ED9] shadow-lg transition-colors hover:bg-[#1c8bbf] md:bottom-6 md:right-6 md:h-14 md:w-14 [html[data-buybar]_&]:bottom-20"
    >
      <Send className="h-5 w-5 text-white md:h-6 md:w-6" strokeWidth={1.5} />
    </a>
  );
}
