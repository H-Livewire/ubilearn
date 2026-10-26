import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { swDictionary } from '@/lib/i18n';

const ATTRIBUTES = ['placeholder', 'aria-label', 'title', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT']);

type AttrRecord = Record<string, { original: string; output: string }>;

/**
 * Translates exact, known English UI phrases to Swahili for the whole page
 * (including toasts and dropdowns) and restores them when English is chosen.
 * Text it does not know is left untouched; text the user typed is skipped.
 */
export default function DomTranslator() {
   const { props, url } = usePage<SharedData>();
   const locale = props.locale ?? 'en';
   const skip = url.startsWith('/dashboard');

   useEffect(() => {
      if (skip) {
         return;
      }

      const original = new WeakMap<Text, string>();
      const output = new WeakMap<Text, string>();
      const attrs = new WeakMap<Element, AttrRecord>();
      const touchedText = new Set<Text>();
      const touchedAttrs = new Set<Element>();
      const swahili = locale === 'sw';

      const skipped = (node: Node): boolean => {
         const parent = node.parentElement;

         return (
            !parent ||
            SKIP.has(parent.tagName) ||
            Boolean(parent.closest('[data-no-translate],[contenteditable="true"]'))
         );
      };

      const text = (node: Text) => {
         const current = node.nodeValue ?? '';

         if (output.get(node) === current || skipped(node)) {
            return;
         }

         const trimmed = current.trim();
         const match = trimmed ? swDictionary[trimmed] : undefined;

         if (!match || match.includes(':')) {
            original.delete(node);
            output.delete(node);

            return;
         }

         const next = current.replace(trimmed, match);
         original.set(node, current);
         output.set(node, next);
         touchedText.add(node);
         node.nodeValue = next;
      };

      const attribute = (element: Element) => {
         if (SKIP.has(element.tagName)) {
            return;
         }

         for (const name of ATTRIBUTES) {
            const value = element.getAttribute(name);

            if (!value) {
               continue;
            }

            const record = attrs.get(element) ?? {};

            if (record[name]?.output === value) {
               continue;
            }

            const match = swDictionary[value.trim()];

            if (!match || match.includes(':')) {
               delete record[name];

               continue;
            }

            record[name] = { original: value, output: match };
            attrs.set(element, record);
            touchedAttrs.add(element);
            element.setAttribute(name, match);
         }
      };

      const walk = (root: Node) => {
         if (root.nodeType === Node.TEXT_NODE) {
            text(root as Text);

            return;
         }

         if (root.nodeType !== Node.ELEMENT_NODE) {
            return;
         }

         attribute(root as Element);
         const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
         );
         let node = walker.nextNode();

         while (node) {
            if (node.nodeType === Node.TEXT_NODE) {
               text(node as Text);
            } else {
               attribute(node as Element);
            }

            node = walker.nextNode();
         }
      };

      const restore = () => {
         touchedText.forEach((node) => {
            const before = original.get(node);

            if (before !== undefined && node.nodeValue === output.get(node)) {
               node.nodeValue = before;
            }
         });
         touchedAttrs.forEach((element) => {
            const record = attrs.get(element) ?? {};

            for (const [name, entry] of Object.entries(record)) {
               if (element.getAttribute(name) === entry.output) {
                  element.setAttribute(name, entry.original);
               }
            }
         });
         touchedText.clear();
         touchedAttrs.clear();
      };

      if (!swahili) {
         return;
      }

      let frame = 0;
      const pending = new Set<Node>();
      const flush = () => {
         frame = 0;
         pending.forEach((node) => {
            if (node.isConnected) {
               walk(node);
            }
         });
         pending.clear();
      };
      const observer = new MutationObserver((records) => {
         for (const record of records) {
            if (record.type === 'childList') {
               record.addedNodes.forEach((node) => pending.add(node));
            } else {
               pending.add(record.target);
            }
         }

         if (!frame) {
            frame = requestAnimationFrame(flush);
         }
      });

      walk(document.body);
      observer.observe(document.body, {
         childList: true,
         subtree: true,
         characterData: true,
         attributes: true,
         attributeFilter: ATTRIBUTES,
      });

      return () => {
         observer.disconnect();

         if (frame) {
            cancelAnimationFrame(frame);
         }

         restore();
      };
   }, [locale, skip]);

   return null;
}
