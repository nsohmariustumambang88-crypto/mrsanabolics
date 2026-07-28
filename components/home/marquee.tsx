import { ShieldCheck, FlaskConical, Award, Truck, Lock, Globe, BadgeCheck } from 'lucide-react';

const badges = [
  { icon: ShieldCheck, text: 'Third-Party Tested' },
  { icon: FlaskConical, text: '99%+ Purity Guaranteed' },
  { icon: Award, text: 'GMP Certified Facilities' },
  { icon: Truck, text: 'Discreet Worldwide Shipping' },
  { icon: Lock, text: 'Encrypted Secure Checkout' },
  { icon: Globe, text: '40+ Countries Served' },
  { icon: BadgeCheck, text: 'Certificates of Analysis' },
];

export function TrustMarquee() {
  return (
    <div className="relative overflow-hidden border-y border-border/30 bg-black/40 py-5">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent" />
      <div className="flex w-max animate-marquee">
        {[...badges, ...badges].map((b, i) => (
          <div key={i} className="flex items-center gap-3 px-8">
            <b.icon className="h-5 w-5 text-accent" />
            <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {b.text}
            </span>
            <span className="ml-6 h-1 w-1 rounded-full bg-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
