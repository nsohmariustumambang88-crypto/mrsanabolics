/*
  The delivery address on an order, as display lines.

  Since November 2026 the storefront checkout no longer asks for an apartment line or a postal
  code, so new orders store `shipLine2` as null and `shipPostcode` as ''. Older orders, and orders
  staff record by hand, still have them. Every screen that prints an address goes through this,
  so a missing part drops out instead of leaving an empty line or a stray comma.

  A plain module (no server-only): the admin's client list table uses it too.
*/

export type OrderAddress = {
  shipName?: string | null;
  shipLine1?: string | null;
  shipLine2?: string | null;
  shipCity?: string | null;
  shipPostcode?: string | null;
  shipCountry?: string | null;
};

export function addressLines(order: OrderAddress): string[] {
  return [
    order.shipName,
    order.shipLine1,
    order.shipLine2,
    order.shipCity,
    order.shipPostcode,
    order.shipCountry,
  ]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean);
}
