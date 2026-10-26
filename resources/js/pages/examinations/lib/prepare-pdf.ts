import {
   PDFArray,
   PDFDict,
   PDFDocument,
   PDFName,
   PDFNumber,
   PDFRawStream,
   decodePDFRawStream,
   degrees,
   rgb,
} from 'pdf-lib';
import type { PDFPage, PDFRef } from 'pdf-lib';

export interface BrandingArea {
   page: number;
   x: number;
   y: number;
   width: number;
   height: number;
   // Auto-detected watermark areas (optional)
   angle?: number;
   logo?: boolean; // draw the UbiLearn logo inside (default true)
   kind?: 'text' | 'image';
   term?: string;
   size?: string;
   big?: boolean;
}

interface Removed {
   images: Set<string>;
   terms: Set<string>;
}

function bytesToString(bytes: Uint8Array) {
   let out = '';

   for (let i = 0; i < bytes.length; i += 8192) {
      out += String.fromCharCode(...bytes.subarray(i, i + 8192));
   }

   return out;
}

function stringToBytes(value: string) {
   const out = new Uint8Array(value.length);

   for (let i = 0; i < value.length; i++) {
      out[i] = value.charCodeAt(i) & 255;
   }

   return out;
}

const escapeRegExp = (value: string) =>
   value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

function literalText(raw: string) {
   return raw.replace(/\\([nrtbf()\\]|[0-7]{1,3}|\r?\n)/g, (_, c: string) => {
      if (c === 'n') return '\n';
      if (c === 'r') return '\r';
      if (c === 't') return '\t';
      if (c === 'b') return '\b';
      if (c === 'f') return '\f';
      if (/^[0-7]/.test(c)) return String.fromCharCode(parseInt(c, 8));
      if (c === '\n' || c.startsWith('\r')) return '';

      return c;
   });
}

function hexText(raw: string) {
   const hex = raw.replace(/\s+/g, '');
   const padded = hex.length % 2 ? `${hex}0` : hex;
   let out = '';

   for (let i = 0; i < padded.length; i += 2) {
      out += String.fromCharCode(parseInt(padded.slice(i, i + 2), 16));
   }

   return out;
}

function stringsIn(source: string) {
   const parts = source.match(
      /\((?:[^()\\]|\\[\s\S]|\([^()]*\))*\)|<[0-9A-Fa-f\s]*>/g,
   );

   return (parts ?? [])
      .map((part) =>
         part.startsWith('(')
            ? literalText(part.slice(1, -1))
            : hexText(part.slice(1, -1)),
      )
      .join('');
}

// Remove the drawing operators of selected images and watermark texts from a content stream.
function stripContent(
   source: string,
   images: Map<string, string>, // "/Name" -> "WxH"
   sizes: Set<string>,
   needles: string[],
   removed: Removed,
) {
   let out = source;

   images.forEach((size, name) => {
      if (!sizes.has(size)) {
         return;
      }

      const pattern = new RegExp(`${escapeRegExp(name)}\\s+Do(?![A-Za-z0-9*])`, 'g');

      if (pattern.test(out)) {
         out = out.replace(pattern, '');
         removed.images.add(size);
      }
   });

   if (needles.length) {
      const hit = (text: string) => {
         const flat = text.toLowerCase().replace(/[\s\0]+/g, '');

         return needles.find(
            (needle) => flat.includes(needle) && needle.length >= flat.length * 0.6,
         );
      };
      const replacer = (match: string, inner: string) => {
         const found = hit(stringsIn(inner));

         if (!found) {
            return match;
         }

         removed.terms.add(found);

         return '';
      };
      out = out.replace(
         /((?:\((?:[^()\\]|\\[\s\S]|\([^()]*\))*\)|<[0-9A-Fa-f\s]*>))\s*Tj/g,
         replacer,
      );
      out = out.replace(/\[((?:[^\]\\]|\\[\s\S])*)\]\s*TJ/g, replacer);
   }

   return out;
}

function xobjectsOf(document: PDFDocument, resources?: PDFDict) {
   const images = new Map<string, string>();
   const forms = new Map<string, PDFRef>();
   const table = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict);

   table?.entries().forEach(([name, value]) => {
      const object = document.context.lookup(value);

      if (!(object instanceof PDFRawStream)) {
         return;
      }

      const subtype = object.dict.get(PDFName.of('Subtype'));

      if (subtype === PDFName.of('Image')) {
         const w = object.dict.lookupMaybe(PDFName.of('Width'), PDFNumber);
         const h = object.dict.lookupMaybe(PDFName.of('Height'), PDFNumber);
         images.set(name.asString(), `${w?.asNumber()}x${h?.asNumber()}`);
      } else if (subtype === PDFName.of('Form')) {
         forms.set(name.asString(), value as PDFRef);
      }
   });

   return { images, forms };
}

function stripForm(
   document: PDFDocument,
   ref: PDFRef,
   fallback: PDFDict | undefined,
   sizes: Set<string>,
   needles: string[],
   removed: Removed,
   seen: Set<PDFRef>,
   depth: number,
) {
   const stream = document.context.lookup(ref);

   if (!(stream instanceof PDFRawStream) || seen.has(ref) || depth > 3) {
      return;
   }

   seen.add(ref);
   const own = stream.dict.lookupMaybe(PDFName.of('Resources'), PDFDict);
   const resources = own ?? fallback;
   const { images, forms } = xobjectsOf(document, resources);
   forms.forEach((child) =>
      stripForm(document, child, resources, sizes, needles, removed, seen, depth + 1),
   );
   const before = bytesToString(decodePDFRawStream(stream).decode());
   const after = stripContent(before, images, sizes, needles, removed);

   if (after !== before) {
      const dict = stream.dict.clone();
      dict.delete(PDFName.of('Filter'));
      dict.delete(PDFName.of('DecodeParms'));
      document.context.assign(ref, PDFRawStream.of(dict, stringToBytes(after)));
   }
}

// Really delete selected image/text watermarks from the page (not just paint over them).
function stripPage(
   document: PDFDocument,
   page: PDFPage,
   sizes: Set<string>,
   needles: string[],
) {
   const removed: Removed = { images: new Set(), terms: new Set() };

   try {
      const resources = page.node.Resources();
      const { images, forms } = xobjectsOf(document, resources);
      const seen = new Set<PDFRef>();
      forms.forEach((ref) =>
         stripForm(document, ref, resources, sizes, needles, removed, seen, 1),
      );
      const contents = page.node.Contents();
      const parts: PDFRawStream[] = [];

      if (contents instanceof PDFRawStream) {
         parts.push(contents);
      } else if (contents instanceof PDFArray) {
         for (let i = 0; i < contents.size(); i++) {
            const part = contents.lookup(i);

            if (part instanceof PDFRawStream) {
               parts.push(part);
            }
         }
      }

      if (parts.length) {
         const before = parts
            .map((part) => bytesToString(decodePDFRawStream(part).decode()))
            .join('\n');
         const after = stripContent(before, images, sizes, needles, removed);

         if (after !== before) {
            const ref = document.context.register(
               document.context.flateStream(stringToBytes(after)),
            );
            page.node.set(PDFName.of('Contents'), ref);
         }
      }
   } catch {
      // Fall back to covering the areas if the PDF structure is unusual.
   }

   return removed;
}

export async function preparePaperPdf(
   source: Uint8Array,
   logo: Uint8Array,
   areas: BrandingArea[],
   opacity: number,
   progress: (percent: number, message: string) => void,
   cancelled: () => boolean = () => false,
   notes: string[] = [],
) {
   const check = () => {
      if (cancelled()) {
         throw new Error('Preparation cancelled.');
      }
   };
   check();
   progress(10, 'Preparing file…');
   const document = await PDFDocument.load(source);

   if (document.getPageCount() > 100) {
      throw new Error('Prepare hadi kurasa 100 kwa PDF moja.');
   }

   check();
   progress(35, 'Importing UbiLearn logo…');
   const brand = await document.embedPng(logo);
   const pages = document.getPages();

   for (let index = 0; index < pages.length; index++) {
      check();
      const page = pages[index];

      const pageAreas = areas.filter((item) => item.page === index + 1);
      const removed = stripPage(
         document,
         page,
         new Set(
            pageAreas.flatMap((item) =>
               item.kind === 'image' && item.size ? [item.size] : [],
            ),
         ),
         Array.from(
            new Set(
               pageAreas.flatMap((item) =>
                  item.kind === 'text' && item.term ? [item.term] : [],
               ),
            ),
         ),
      );

      // Cover only admin-selected branding; do not alter unrelated text/images.
      for (const area of pageAreas) {
         if (
            (area.kind === 'image' && area.size && removed.images.has(area.size)) ||
            (area.kind === 'text' && area.term && removed.terms.has(area.term))
         ) {
            continue; // already removed from the PDF content itself
         }

         if (area.kind === 'image' && area.big) {
            const note = `Ukurasa ${index + 1}: picha kubwa haikuweza kuondolewa bila kufunika maudhui, imeachwa.`;

            if (!notes.includes(note)) {
               notes.push(note);
            }

            continue;
         }

         page.drawRectangle({
            x: area.x,
            y: area.y,
            width: area.width,
            height: area.height,
            color: rgb(1, 1, 1),
            rotate: area.angle ? degrees(area.angle) : undefined,
         });

         if (area.logo === false) {
            continue;
         }

         const scale =
            Math.min(area.width / brand.width, area.height / brand.height) *
            0.88;
         page.drawImage(brand, {
            x: area.x + (area.width - brand.width * scale) / 2,
            y: area.y + (area.height - brand.height * scale) / 2,
            width: brand.width * scale,
            height: brand.height * scale,
            opacity: 0.9,
         });
      }

      const box = page.getCropBox();
      const scale = Math.min(
         (box.width * 0.52) / brand.width,
         (box.height * 0.22) / brand.height,
      );
      page.drawImage(brand, {
         x: box.x + (box.width - brand.width * scale) / 2,
         y: box.y + (box.height - brand.height * scale) / 2,
         width: brand.width * scale,
         height: brand.height * scale,
         opacity: Math.max(0.03, Math.min(0.25, opacity)),
      });
      progress(
         40 + Math.round(((index + 1) / pages.length) * 45),
         `Processing page ${index + 1} / ${pages.length}…`,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
   }

   check();
   progress(90, 'Finalizing PDF…');
   const bytes = await document.save({ updateFieldAppearances: false });
   check();

   if (bytes.byteLength > 10 * 1024 * 1024) {
      throw new Error('PDF iliyotayarishwa imezidi 10 MB. Tumia PDF ndogo.');
   }

   progress(100, 'Ready for preview');

   return bytes;
}
