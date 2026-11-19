'use client';

import * as React from 'react';

/*
  Scroll reveal for anything marked `data-reveal` (product cards first; any section can opt in).
  Mounted once in the storefront layout. No animation library: an IntersectionObserver sets a
  state attribute and globals.css plays a CSS animation, so the element's own `transition`
  (a card's hover shadow, say) is never overridden.

  Modelled on a reference store the owner liked (19 November 2026), which used GSAP's
  ScrollTrigger.batch with the same numbers: rise 28px and fade in over 0.8s on an exponential
  ease-out, 70ms apart within a batch, once only.

  - On first load, what is already on screen is left alone: nothing visible ever blinks out and
    back in. Only elements below the fold wait to be revealed.
  - Elements added later (a "Show more" page, a client-side navigation) rise in even when they
    land on screen, which reads as the page arriving rather than snapping.
  - prefers-reduced-motion: nothing is hidden and nothing moves (here and in the CSS).
  - Without JavaScript, or before hydration, everything is simply visible: the HTML carries no
    hidden state; only this script adds one, and only to elements that are off screen.
*/

const STAGGER_MS = 70;
const FOLD = 0.92;

export function ScrollReveal() {
  React.useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const play = (elements: HTMLElement[]) => {
      elements.forEach((el, index) => {
        el.style.setProperty('--reveal-delay', `${index * STAGGER_MS}ms`);
        el.dataset.revealState = 'in';
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const arriving = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target as HTMLElement)
          .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
        arriving.forEach((el) => observer.unobserve(el));
        play(arriving);
      },
      { rootMargin: `0px 0px -${Math.round((1 - FOLD) * 100)}% 0px` }
    );

    const onAnimationEnd = (event: AnimationEvent) => {
      const el = event.target as HTMLElement;
      if (el.dataset?.revealState === 'in' && event.animationName === 'reveal-rise') {
        el.dataset.revealState = 'done';
        el.style.removeProperty('--reveal-delay');
      }
    };
    document.addEventListener('animationend', onAnimationEnd);

    const claim = (root: ParentNode, initial: boolean) => {
      const found = Array.from(
        root.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal-state])')
      );
      if (root instanceof HTMLElement && root.matches('[data-reveal]:not([data-reveal-state])')) {
        found.unshift(root);
      }
      if (!found.length) return;
      if (reduced.matches) {
        found.forEach((el) => (el.dataset.revealState = 'done'));
        return;
      }
      const fold = window.innerHeight * FOLD;
      const inView: HTMLElement[] = [];
      for (const el of found) {
        if (el.getBoundingClientRect().top < fold) {
          inView.push(el);
        } else {
          el.dataset.revealState = 'hidden';
          observer.observe(el);
        }
      }
      if (initial) inView.forEach((el) => (el.dataset.revealState = 'done'));
      else play(inView);
    };

    /*
      Elements an earlier mount already hid are watched again. React runs this effect twice in
      development (mount, clean up, mount), and the second run used to skip them, which left
      every card below the fold invisible for good.
    */
    document
      .querySelectorAll<HTMLElement>('[data-reveal-state="hidden"]')
      .forEach((el) => (reduced.matches ? (el.dataset.revealState = 'done') : observer.observe(el)));

    claim(document, true);

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) claim(node, false);
        });
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
      document.removeEventListener('animationend', onAnimationEnd);
    };
  }, []);

  return null;
}
