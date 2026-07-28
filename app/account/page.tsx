'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Package,
  Heart,
  MapPin,
  CreditCard,
  Download,
  Bell,
  Ticket,
  LogOut,
  Settings,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/components/providers/store-provider';
import { products } from '@/lib/data/products';
import { ProductCard } from '@/components/product/product-card';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: User },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'payments', label: 'Payment Methods', icon: CreditCard },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'tickets', label: 'Support Tickets', icon: Ticket },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const mockOrders = [
  { id: 'MA-84729103', date: '2024-11-20', status: 'Delivered', total: 249, items: 3 },
  { id: 'MA-73628104', date: '2024-10-15', status: 'Delivered', total: 129, items: 1 },
  { id: 'MA-62517105', date: '2024-09-02', status: 'Delivered', total: 178, items: 2 },
];

export default function AccountPage() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const { wishlist } = useStore();
  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-emerald-600 font-display text-2xl font-bold text-black">
          J
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            Welcome back, John
          </h1>
          <p className="text-sm text-muted-foreground">Member since November 2024</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={`/account?tab=${t.id}`}
                className={cn(
                  'flex shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                  activeTab === t.id
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {t.id === 'wishlist' && wishlist.length > 0 && (
                  <Badge className="ml-auto bg-accent text-black">{wishlist.length}</Badge>
                )}
              </Link>
            ))}
            <button className="flex shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </nav>
        </aside>

        <div className="lg:col-span-3">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="font-display text-xl font-bold">Dashboard</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Total Orders', value: '3', icon: Package },
                  { label: 'Wishlist Items', value: String(wishlist.length), icon: Heart },
                  { label: 'Loyalty Tier', value: 'Silver', icon: User },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border/50 bg-card p-5">
                    <s.icon className="h-5 w-5 text-accent" />
                    <p className="mt-3 font-display text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-border/50 bg-card p-6">
                <h3 className="font-semibold">Recent Order</h3>
                <div className="mt-4 flex items-center justify-between rounded-lg border border-border/40 p-4">
                  <div>
                    <p className="text-sm font-medium">Order #MA-84729103</p>
                    <p className="text-xs text-muted-foreground">Nov 20, 2024 · 3 items</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-accent/20 text-accent">Delivered</Badge>
                    <p className="mt-1 text-sm font-semibold">{formatPrice(249)}</p>
                  </div>
                </div>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/account?tab=orders">View All Orders</Link>
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-display text-xl font-bold">Order History</h2>
              {mockOrders.map((o) => (
                <div key={o.id} className="rounded-2xl border border-border/50 bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Order #{o.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {o.items} items
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-accent/20 text-accent">{o.status}</Badge>
                      <span className="text-sm font-semibold">{formatPrice(o.total)}</span>
                      <Button variant="outline" size="sm">Track</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-display text-xl font-bold">My Wishlist</h2>
              {wishlistedProducts.length === 0 ? (
                <div className="rounded-2xl border border-border/50 bg-card p-16 text-center">
                  <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-4 text-sm text-muted-foreground">Your wishlist is empty.</p>
                  <Button asChild className="mt-4 bg-accent text-black hover:bg-accent/90">
                    <Link href="/shop">Browse Products</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {wishlistedProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Saved Addresses</h2>
                <Button className="bg-accent text-black hover:bg-accent/90">Add Address</Button>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card p-5">
                <div className="flex items-center justify-between">
                  <Badge>Default</Badge>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">Edit</Button>
                    <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium">John Doe</p>
                <p className="text-sm text-muted-foreground">123 Main Street, New York, NY 10001, United States</p>
                <p className="mt-1 text-sm text-muted-foreground">+1 (555) 000-0000</p>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Payment Methods</h2>
                <Button className="bg-accent text-black hover:bg-accent/90">Add Card</Button>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-secondary font-bold text-sm">VISA</div>
                    <div>
                      <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                      <p className="text-xs text-muted-foreground">Expires 08/27</p>
                    </div>
                  </div>
                  <Badge>Default</Badge>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'downloads' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-display text-xl font-bold">Downloads</h2>
              <div className="rounded-2xl border border-border/50 bg-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Certificate of Analysis — Batch #NL-2411</p>
                    <p className="text-xs text-muted-foreground">PDF · 1.2 MB</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" /> Download
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-display text-xl font-bold">Notifications</h2>
              {[
                { title: 'Order Delivered', body: 'Your order #MA-84729103 has been delivered.', time: '2h ago', unread: true },
                { title: 'New Product Alert', body: 'BPC-157 5mg is now in stock.', time: '1d ago', unread: true },
                { title: 'Weekly Deals Live', body: 'Save up to 30% this week only.', time: '3d ago', unread: false },
              ].map((n, i) => (
                <div key={i} className="rounded-2xl border border-border/50 bg-card p-5">
                  <div className="flex items-start gap-3">
                    {n.unread && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Support Tickets</h2>
                <Button className="bg-accent text-black hover:bg-accent/90">New Ticket</Button>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Ticket #4821 — Shipping delay</p>
                    <p className="text-xs text-muted-foreground">Opened Nov 22, 2024</p>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-500">Open</Badge>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="font-display text-xl font-bold">Account Settings</h2>
              <div className="rounded-2xl border border-border/50 bg-card p-6">
                <h3 className="font-semibold">Profile Information</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="setName">Name</Label>
                    <Input id="setName" className="mt-1.5" defaultValue="John Doe" />
                  </div>
                  <div>
                    <Label htmlFor="setEmail">Email</Label>
                    <Input id="setEmail" className="mt-1.5" defaultValue="john@example.com" />
                  </div>
                </div>
                <Button className="mt-4 bg-accent text-black hover:bg-accent/90">Save Changes</Button>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card p-6">
                <h3 className="font-semibold">Password</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="newPass">New Password</Label>
                    <Input id="newPass" type="password" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="confirmPass">Confirm Password</Label>
                    <Input id="confirmPass" type="password" className="mt-1.5" />
                  </div>
                </div>
                <Button variant="outline" className="mt-4">Update Password</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
