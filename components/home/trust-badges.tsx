'use client';

import { Shield, Check, Lock, Award } from 'lucide-react';

export function TrustBadges() {
  const badges = [
    {
      icon: Shield,
      title: 'Verified Products',
      description: 'Certificate of Analysis with every order',
    },
    {
      icon: Check,
      title: '100% Authentic',
      description: 'All products verified for authenticity',
    },
    {
      icon: Lock,
      title: 'Secure Payments',
      description: 'Encrypted & discrete transactions',
    },
    {
      icon: Award,
      title: 'Expert Sourced',
      description: '10+ years experience in steroid supply',
    },
  ];

  return (
    <section className="border-y border-rule bg-paper-sunk py-12">
      <div className="mx-auto max-w-[86rem] px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.title}
                className="flex flex-col items-center text-center"
              >
                <Icon className="mb-3 h-8 w-8 text-pigment-indigo" strokeWidth={1.5} />
                <h3 className="font-display text-sm font-semibold text-ink sm:text-base">
                  {badge.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-faint sm:text-sm">
                  {badge.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
