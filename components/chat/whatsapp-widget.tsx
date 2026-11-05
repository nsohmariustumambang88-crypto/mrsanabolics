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
      /* 44px and 12px from the edge on phones, where 56px at 24px covered the end of product
         rows and form fields; 56px from md as before. Moves up while a product page's buy bar
         is showing (data-buybar, phones only). The footer's last row keeps room under it. */
      className="fixed bottom-3 left-3 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-colors hover:bg-[#20ba5e] md:bottom-6 md:left-6 md:h-14 md:w-14 [html[data-buybar]_&]:bottom-20"
      title="Contact us on WhatsApp"
    >
      <MessageCircle className="h-5 w-5 text-white md:h-6 md:w-6" strokeWidth={1.5} />
    </button>
  );
}
