/*
  The shop's minimum order, in one place.

  Measured on the FINAL amount payable: products plus shipping, minus any discount code. With or
  without a code, nobody can pay less than this. A code that would take an order under it is
  refused at the door (`evaluateDiscount`), and `createOrder` checks it again on the money it
  actually writes.

  A plain module, not server-only, so the checkout can say the same number the server enforces.
*/
export const MINIMUM_ORDER = 100;
