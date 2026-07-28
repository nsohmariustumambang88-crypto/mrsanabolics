'use client';

import { Truck, ShieldCheck, Headphones } from 'lucide-react';

const items = [
  { icon: Truck, text: 'Free worldwide shipping on orders over $150' },
  { icon: ShieldCheck, text: 'Secure, encrypted payments — every transaction' },
  { icon: Headphones, text: '24/7 expert support — real humans, real answers' },
];

export function AnnouncementBar() {
  return (
    <div className="relative z-50 border-b border-border/50 bg-black">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 overflow-hidden px-4 py-2 text-xs text-muted-foreground">
        {items.map((item, i) => (
          <div
            key={i}
            className="hidden items-center gap-2 md:flex"
          >
            <item.icon className="h-3.5 w-3.5 text-accent" />
            <span>{item.text}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 md:hidden">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          <span>Secure worldwide shipping</span>
        </div>
      </div>
    </div>
  );
}
