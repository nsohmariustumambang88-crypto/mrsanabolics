'use client';

import * as React from 'react';
import {
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Clock,
  Send,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const contactInfo = [
  { icon: Mail, label: 'Email', value: 'support@mranabolics.example.com', href: 'mailto:support@mranabolics.example.com' },
  { icon: Phone, label: 'Phone', value: '+1 (800) 555-0100', href: 'tel:+18005550100' },
  { icon: MapPin, label: 'Address', value: 'Bahnhofstrasse 1, 8001 Zurich, Switzerland' },
  { icon: Clock, label: 'Hours', value: '24/7 — Always available' },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
      <div className="text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Get In Touch
        </span>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
          Contact Us
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Questions about products, orders, or protocols? Our team responds in
          under 2 hours, 24/7.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4">
          {contactInfo.map((c) => (
            <div key={c.label} className="flex items-start gap-4 rounded-2xl border border-border/50 bg-card p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <c.icon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {c.label}
                </p>
                {c.href ? (
                  <a href={c.href} className="mt-0.5 block text-sm font-medium hover:text-accent">
                    {c.value}
                  </a>
                ) : (
                  <p className="mt-0.5 text-sm font-medium">{c.value}</p>
                )}
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
            <MessageSquare className="h-5 w-5 text-accent" />
            <p className="mt-2 text-sm font-semibold">Live Chat</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Live chat is coming soon. For now, use the form and we&apos;ll reply
              within 2 hours.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                  <Check className="h-8 w-8 text-accent" />
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold">Message Sent</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Thank you for reaching out. We&apos;ll get back to you within 2
                  hours.
                </p>
                <Button
                  onClick={() => setSubmitted(false)}
                  variant="outline"
                  className="mt-6"
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" className="mt-1.5" placeholder="Your name" required />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" className="mt-1.5" placeholder="your@email.com" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order">Order Inquiry</SelectItem>
                      <SelectItem value="product">Product Question</SelectItem>
                      <SelectItem value="shipping">Shipping &amp; Delivery</SelectItem>
                      <SelectItem value="returns">Returns &amp; Refunds</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    className="mt-1.5 min-h-[140px]"
                    placeholder="How can we help you?"
                    required
                  />
                </div>
                <Button type="submit" className="w-full gap-2 bg-accent text-black hover:bg-accent/90">
                  <Send className="h-4 w-4" />
                  Send Message
                </Button>
              </form>
            )}
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-border/50 bg-card">
            <div className="flex h-64 items-center justify-center bg-secondary/30">
              <div className="text-center text-muted-foreground">
                <MapPin className="mx-auto h-8 w-8" />
                <p className="mt-2 text-sm">Google Maps integration placeholder</p>
                <p className="text-xs">Bahnhofstrasse 1, 8001 Zurich</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
