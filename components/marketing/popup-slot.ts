/*
  One popup per visit.

  The storefront has three overlays that open on their own: the promotion, the restock sign-up
  and the exit capture. Two of them stacked, or one opening as the other closes, is a nag, and a
  nag teaches people to close everything without reading it. So the first one to open claims the
  visit (sessionStorage, so a new visit starts fresh) and the others stand down.

  Every access is wrapped: private windows throw on storage, and a popup that cannot remember is
  better than a component that throws during render.
*/

const SLOT_KEY = 'mranabolics-popup-slot';

export type PopupName = 'promo' | 'restock' | 'exit';

/** Who has this visit, if anyone. */
export function popupSlotOwner(): PopupName | null {
  try {
    return (window.sessionStorage.getItem(SLOT_KEY) as PopupName | null) ?? null;
  } catch {
    return null;
  }
}

/** True when `name` may open: nobody holds the visit, or `name` already does. */
export function popupSlotFree(name: PopupName): boolean {
  const owner = popupSlotOwner();
  return owner === null || owner === name;
}

/** Take the visit for `name`. Returns false when another popup already has it. */
export function claimPopupSlot(name: PopupName): boolean {
  if (!popupSlotFree(name)) return false;
  try {
    window.sessionStorage.setItem(SLOT_KEY, name);
  } catch {
    /* Cannot remember; the in-page checks still keep two from opening at once. */
  }
  return true;
}
