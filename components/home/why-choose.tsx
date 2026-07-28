'use client';

import { motion } from 'framer-motion';
import {
  ShieldCheck,
  FlaskConical,
  Truck,
  Lock,
  Headphones,
  Award,
} from 'lucide-react';
import { SectionHeading } from '@/components/product/section-heading';
import { StaggerGroup, StaggerItem } from '@/components/animations/motion';

const features = [
  {
    icon: ShieldCheck,
    title: 'Third-Party Verified',
    desc: 'Every batch independently lab-tested for purity, potency, and contaminants. COAs available on request.',
  },
  {
    icon: FlaskConical,
    title: '99%+ Purity',
    desc: 'Pharmaceutical-grade raw materials synthesized in GMP-certified facilities across Europe and the US.',
  },
  {
    icon: Truck,
    title: 'Discreet Global Shipping',
    desc: 'Plain packaging, tracked delivery to 40+ countries, with cold-chain options for sensitive compounds.',
  },
  {
    icon: Lock,
    title: 'Secure Encrypted Checkout',
    desc: '256-bit SSL encryption. Pay by card, PayPal, crypto, or bank transfer — your data stays private.',
  },
  {
    icon: Headphones,
    title: '24/7 Expert Support',
    desc: 'Real humans, real answers. Average response time under 2 hours, any day of the year.',
  },
  {
    icon: Award,
    title: 'Loyalty Pricing',
    desc: 'Unlock exclusive tiered discounts and early access to new products after your third order.',
  },
];

export function WhyChoose() {
  return (
    <section className="relative overflow-hidden py-20">
      <div className="absolute inset-0 grid-bg grid-bg-fade opacity-15" />
      <div className="absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-accent-glow blur-3xl opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 lg:px-6">
        <SectionHeading
          eyebrow="The MrAnabolics Difference"
          title="Why Choose MrAnabolics"
          description="Six pillars that make us the most trusted name in premium performance supplements."
          align="center"
        />
        <StaggerGroup className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3" stagger={0.07}>
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border/40 bg-card p-6 transition-all duration-500 hover:border-accent/30">
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent/5 transition-transform duration-700 group-hover:scale-[2] group-hover:bg-accent/10" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 transition-transform duration-500 group-hover:scale-110">
                  <f.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="relative mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
