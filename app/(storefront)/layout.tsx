import { CatalogueProvider } from '@/components/providers/catalogue-provider';
import { SettingsProvider } from '@/components/providers/settings-provider';
import { StoreProvider } from '@/components/providers/store-provider';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { SearchDialog } from '@/components/search/search-dialog';
import { ExitCapture } from '@/components/marketing/exit-capture';
import { RestockAlertsModal } from '@/components/marketing/restock-alerts-modal';
import { PromoPopup } from '@/components/marketing/promo-popup';
import { advertisedDiscount, promotedCode } from '@/lib/discounts';
import { VisitTracker } from '@/components/analytics/visit-tracker';
import { TelegramWidget } from '@/components/chat/telegram-widget';
import { WhatsappWidget } from '@/components/chat/whatsapp-widget';
import { getCategories, getBrands } from '@/lib/db/catalogue';
import { getSettingsSafe, asBoolean, asNumber } from '@/lib/settings';
import { CountryProvider } from '@/components/providers/country-provider';
import { getRates } from '@/lib/currency/rates';
import { getDeliverySummary } from '@/lib/delivery/summary';

/*
  The storefront shell.

  This used to live in the root layout, which meant every route inherited it — including
  /admin. That was wrong three ways: the admin rendered a shop header, footer and cart drawer
  it has no use for; it paid for the catalogue query on every page; and when the database was
  briefly unreachable the ADMIN LOGIN went down with it, because the shell it rendered inside
  needed a catalogue it could not fetch. The tool for fixing a broken database should not
  itself require the database to be healthy.

  Now the chrome and the catalogue belong to this route group alone, and /admin renders
  beside it rather than inside it.
*/

/*
  Regenerated at most once an hour: every regeneration counts against Vercel's ISR write
  allowance, and at once a minute the Hobby plan ran out. Admin edits refresh their own pages
  through revalidatePath, so price and stock changes still appear at once.
*/
export const revalidate = 3600;

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* One read per render, shared with every client component through the provider. */
  /*
    Settings come through `getSettingsSafe`, which falls back to the declared defaults rather
    than throwing: the announcement line is a refinement, and a sleeping database should cost
    the site its custom wording, never its home page.
  */
  /*
    The country selector's data: the ECB rates (null when that read fails, and then nothing is
    converted) and the delivery zones (an empty list when the database is unreachable). Both
    fail soft, so neither can take the storefront down.
  */
  const [categories, brands, settings, rates, zones] = await Promise.all([
    getCategories(),
    getBrands(),
    getSettingsSafe(),
    getRates(),
    getDeliverySummary(),
  ]);

  /*
    The promotion popup announces only the code named in `hero_promo_code`, and only while
    `advertisedDiscount` says the checkout would accept it. It never throws; null hides the popup.
  */
  const promoCode = promotedCode(settings.hero_promo_code);
  const promo = promoCode ? await advertisedDiscount(promoCode) : null;

  return (
    <CatalogueProvider value={{ categories, brands }}>
      <SettingsProvider
        value={{
          lowStockThreshold: asNumber(settings.low_stock_threshold, 5),
          freeShippingOver: asNumber(settings.free_shipping_over, 0),
          currency: settings.currency || 'USD',
          supportEmail: settings.support_email,
          supportPhone: settings.support_phone,
        }}
      >
      <CountryProvider rates={rates} zones={zones}>
      <StoreProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>

        <div className="relative z-10 flex min-h-screen flex-col">
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>

        <CartDrawer />
        <SearchDialog />
        {/* Promo first: its effect claims the visit before the other two look. */}
        <PromoPopup promo={promo} />
        <ExitCapture />
        <RestockAlertsModal />
        <TelegramWidget />
        <WhatsappWidget />
        {/*
          Storefront only, and only when the analytics_enabled setting is on. It sends a path
          and a referrer host to /api/track, which sets a random first-party token: no IP is
          stored, and nothing here identifies a person. The admin is outside this layout, so
          administrative browsing is never counted as traffic.
        */}
        {asBoolean(settings.analytics_enabled) && <VisitTracker />}
      </StoreProvider>
      </CountryProvider>
      </SettingsProvider>
    </CatalogueProvider>
  );
}
