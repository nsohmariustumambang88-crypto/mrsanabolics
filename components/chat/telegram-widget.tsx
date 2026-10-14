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
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#229ED9] shadow-lg transition-colors hover:bg-[#1c8bbf]"
    >
      <Send className="h-6 w-6 text-white" strokeWidth={1.5} />
    </a>
  );
}
