import { CatalogueProvider } from '@/components/providers/catalogue-provider';
import { SettingsProvider } from '@/components/providers/settings-provider';
import { StoreProvider } from '@/components/providers/store-provider';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { SearchDialog } from '@/components/search/search-dialog';
import { ExitCapture } from '@/components/marketing/exit-capture';
import { VisitTracker } from '@/components/analytics/visit-tracker';
import { getProductSummaries, getCategories, getBrands } from '@/lib/db/catalogue';
import { getSettingsSafe, asBoolean, asNumber } from '@/lib/settings';

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

/* Re-read at most once a minute; see lib/db/catalogue.ts for why this is memoised. */
export const revalidate = 60;

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
  const [products, categories, brands, settings] = await Promise.all([
    getProductSummaries(),
    getCategories(),
    getBrands(),
    getSettingsSafe(),
  ]);

  return (
    <CatalogueProvider value={{ products, categories, brands }}>
      <SettingsProvider
        value={{
          lowStockThreshold: asNumber(settings.low_stock_threshold, 5),
          freeShippingOver: asNumber(settings.free_shipping_over, 0),
          currency: settings.currency || 'USD',
          supportEmail: settings.support_email,
          supportPhone: settings.support_phone,
        }}
      >
      <StoreProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>

        <div className="relative z-10 flex min-h-screen flex-col">
          {asBoolean(settings.announcement_enabled) && (
            <AnnouncementBar text={settings.announcement_text} />
          )}
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>

        <CartDrawer />
        <SearchDialog />
        <ExitCapture />
        {/*
          Storefront only, and only when the analytics_enabled setting is on. It sends a path
          and a referrer host to /api/track, which sets a random first-party token: no IP is
          stored, and nothing here identifies a person. The admin is outside this layout, so
          administrative browsing is never counted as traffic.
        */}
        {asBoolean(settings.analytics_enabled) && <VisitTracker />}
      </StoreProvider>
      </SettingsProvider>
    </CatalogueProvider>
  );
}
