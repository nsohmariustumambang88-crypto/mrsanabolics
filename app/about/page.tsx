'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Target,
  Eye,
  ShieldCheck,
  FlaskConical,
  Users,
  Globe,
  Award,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/product/section-heading';
import { StaggerGroup, StaggerItem, FadeIn } from '@/components/animations/motion';

const values = [
  { icon: ShieldCheck, title: 'Integrity', desc: 'We test every batch and publish results. No exceptions, no shortcuts.' },
  { icon: FlaskConical, title: 'Science First', desc: 'Every product is backed by research and manufactured to pharmaceutical standards.' },
  { icon: Users, title: 'Customer Obsession', desc: 'Real humans, 24/7 support, and a no-questions-asked satisfaction commitment.' },
  { icon: Globe, title: 'Global Responsibility', desc: 'Discreet, compliant shipping to 40+ countries with full customs handling.' },
];

const milestones = [
  { year: '2018', title: 'Founded in Zurich', desc: 'MrAnabolics begins with a single mission: bring lab-verified quality to a market full of uncertainty.' },
  { year: '2020', title: 'Third-party testing program', desc: 'Every batch now undergoes independent laboratory verification — a first in the industry.' },
  { year: '2022', title: 'Global expansion', desc: 'We begin shipping to 40+ countries with cold-chain logistics for sensitive compounds.' },
  { year: '2024', title: '50,000 orders shipped', desc: 'A community of elite athletes and researchers trusts MrAnabolics for their protocols.' },
];

export default function AboutPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 grid-bg grid-bg-fade opacity-30" />
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-accent-glow blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-28 text-center lg:px-6">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-accent"
          >
            Our Story
          </motion.span>
          <h1 className="mt-4 font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                Built on <span className="text-gradient-accent">trust</span>,
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                tested for <span className="text-gradient-accent">purity</span>
              </motion.span>
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            MrAnabolics was founded to solve a simple problem: in a market full
            of uncertainty, athletes and researchers deserved a supplier they
            could verify. So we built one — where every batch is independently
            tested and every claim is backed by data.
          </motion.p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { icon: Target, title: 'Our Mission', text: 'To provide premium, independently-verified performance supplements that athletes and researchers can trust without question. We exist to set the standard for transparency, quality, and service in an industry that has historically lacked all three.' },
            { icon: Eye, title: 'Our Vision', text: 'A world where every performance supplement is held to the same standard as pharmaceutical medicine — fully tested, fully documented, and fully trustworthy. We are building that world one batch at a time.' },
          ].map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.1}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border/40 bg-card p-8 transition-colors hover:border-accent/30">
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent/5 transition-transform duration-700 group-hover:scale-[2]" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <item.icon className="h-6 w-6 text-accent" />
                </div>
                <h2 className="relative mt-4 font-display text-2xl font-bold">{item.title}</h2>
                <p className="relative mt-3 leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <SectionHeading
          eyebrow="What We Stand For"
          title="Our Values"
          description="Four principles that guide every decision we make."
          align="center"
        />
        <StaggerGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
          {values.map((v) => (
            <StaggerItem key={v.title}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border/40 bg-card p-6 transition-all duration-500 hover:border-accent/30 hover:-translate-y-1">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/5 transition-transform duration-700 group-hover:scale-[2] group-hover:bg-accent/10" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 transition-transform duration-500 group-hover:scale-110">
                  <v.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="relative mt-4 text-lg font-semibold">{v.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 lg:px-6">
        <SectionHeading
          eyebrow="Our Journey"
          title="Milestones"
          description="From a Zurich workshop to 40+ countries worldwide."
          align="center"
        />
        <div className="mt-12 space-y-8">
          {milestones.map((m, i) => (
            <FadeIn key={m.year} delay={i * 0.1}>
              <div className="relative flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-display text-sm font-bold text-accent">
                    {m.year.slice(-2)}
                  </div>
                  {i < milestones.length - 1 && <div className="mt-2 w-px flex-1 bg-border" />}
                </div>
                <div className="pb-8">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">{m.year}</span>
                  <h3 className="mt-1 text-lg font-semibold">{m.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-6">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border border-border/30 bg-gradient-to-br from-secondary/40 to-transparent p-8 md:p-12">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent-glow blur-3xl" />
            <div className="relative grid gap-8 md:grid-cols-3">
              <div className="md:col-span-2">
                <Award className="h-8 w-8 text-accent" />
                <h2 className="mt-4 font-display text-3xl font-bold">
                  Why customers trust us
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  We have earned the trust of over 50,000 customers by doing the
                  boring things right — testing, documenting, shipping discreetly,
                  and answering the phone. No marketing gimmicks, just consistent
                  quality.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild className="bg-accent text-black hover:bg-accent/90">
                    <Link href="/shop">Shop Products</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/contact">Contact Us</Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: ShieldCheck, value: '99.2%', label: 'Avg. purity' },
                  { icon: Heart, value: '4.9/5', label: 'Rating' },
                  { icon: Globe, value: '40+', label: 'Countries' },
                  { icon: Award, value: '50K+', label: 'Orders' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border/30 bg-background/40 p-4 text-center">
                    <s.icon className="mx-auto h-5 w-5 text-accent" />
                    <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
