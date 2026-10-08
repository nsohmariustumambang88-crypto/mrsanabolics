'use client';

import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '19143137729';
const WHATSAPP_MESSAGE = 'Hi, I have a question about your products.';

export function WhatsappWidget() {
  const handleWhatsappClick = () => {
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleWhatsappClick}
      aria-label="Open WhatsApp"
      className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-colors hover:bg-[#20ba5e]"
      title="Contact us on WhatsApp"
    >
      <MessageCircle className="h-6 w-6 text-white" strokeWidth={1.5} />
    </button>
  );
}
