/*
  The account page's sections, shared by the page and the phone tab bar.

  A plain module, not 'use client': the server page reads the tab names too, and a value
  exported from a client module arrives in a server component as a client reference.

  The sections switch in the browser without a round trip to the server (account-view.tsx), so
  the address bar can say `?tab=orders` while Next's router still believes it is on `/account`.
  When the tab bar's Account button is pressed on that page, a plain link would therefore change
  nothing. Instead the tab bar sends ACCOUNT_OPEN_EVENT; the account view answers by cancelling
  the event, and the tab bar then skips its navigation. With no account view listening, nothing
  cancels it and the link navigates as usual.
*/

export const ACCOUNT_TABS = ['dashboard', 'orders', 'addresses', 'settings'] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

export const ACCOUNT_OPEN_EVENT = 'mra:account-open';

export function asAccountTab(value: string | null | undefined): AccountTab {
  return (ACCOUNT_TABS as readonly string[]).includes(value ?? '') ? (value as AccountTab) : 'dashboard';
}

export function accountTabHref(tab: AccountTab): string {
  return tab === 'dashboard' ? '/account' : `/account?tab=${tab}`;
}
