import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface DetectedArea {
   id: string;
   page: number; // 1-based
   kind: 'text' | 'image';
   term?: string; // normalized watermark text (text areas)
   size?: string; // pixel size "WxH" (image areas)
   // PDF user-space rectangle; rotated by `angle` degrees around (x, y)
   x: number;
   y: number;
   width: number;
   height: number;
   angle: number;
   // normalized bounding box on the rendered page (top-left origin)
   view: { x: number; y: number; width: number; height: number };
   repeat: number; // on how many pages a similar image appears
   auto: boolean; // suggested for automatic removal
}

interface TextLike {
   str: string;
   transform: number[];
   width: number;
   height: number;
}
type Matrix = [number, number, number, number, number, number];
interface Viewport {
   width: number;
   height: number;
   convertToViewportPoint: (x: number, y: number) => number[];
}

const textCache = new WeakMap<object, Map<number, TextLike[]>>();

export function normalizeTerm(value: string) {
   return value.toLowerCase().replace(/\s+/g, '');
}

export function parseTerms(value: string) {
   return Array.from(
      new Set(
         value
            .split(/[,\n;]+/)
            .map(normalizeTerm)
            .filter((term) => term.length >= 2),
      ),
   );
}

function viewBox(viewport: Viewport, points: [number, number][]) {
   const mapped = points.map(([x, y]) => viewport.convertToViewportPoint(x, y));
   const xs = mapped.map((point) => point[0]);
   const ys = mapped.map((point) => point[1]);
   const left = Math.max(0, Math.min(...xs) / viewport.width);
   const top = Math.max(0, Math.min(...ys) / viewport.height);
   const right = Math.min(1, Math.max(...xs) / viewport.width);
   const bottom = Math.min(1, Math.max(...ys) / viewport.height);

   return {
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
   };
}

// Concatenate matrix `m` (applied first) with the current matrix `base`.
function compose(base: Matrix, m: number[]): Matrix {
   return [
      base[0] * m[0] + base[2] * m[1],
      base[1] * m[0] + base[3] * m[1],
      base[0] * m[2] + base[2] * m[3],
      base[1] * m[2] + base[3] * m[3],
      base[0] * m[4] + base[2] * m[5] + base[4],
      base[1] * m[4] + base[3] * m[5] + base[5],
   ];
}

async function pageText(document: PDFDocumentProxy, number: number) {
   let pages = textCache.get(document);

   if (!pages) {
      pages = new Map();
      textCache.set(document, pages);
   }

   const cached = pages.get(number);

   if (cached) {
      return cached;
   }

   const page = await document.getPage(number);
   const content = await page.getTextContent();
   const items = (content.items as unknown[]).filter(
      (item): item is TextLike =>
         typeof (item as TextLike).str === 'string' &&
         Array.isArray((item as TextLike).transform),
   );
   pages.set(number, items);

   return items;
}

/** Find where the given watermark texts are drawn (works for rotated text too). */
export async function findText(
   document: PDFDocumentProxy,
   needles: string[],
   cancelled: () => boolean = () => false,
) {
   const found: DetectedArea[] = [];

   if (!needles.length) {
      return found;
   }

   for (let number = 1; number <= document.numPages; number++) {
      if (cancelled()) {
         return found;
      }

      const items = await pageText(document, number);
      const viewport = (await document.getPage(number)).getViewport({
         scale: 1,
      }) as unknown as Viewport;
      let flat = '';
      const map: { item: number; pos: number }[] = [];

      items.forEach((item, index) => {
         for (let pos = 0; pos < item.str.length; pos++) {
            if (/\s/.test(item.str[pos])) {
               continue;
            }

            for (const char of item.str[pos].toLowerCase()) {
               flat += char;
               map.push({ item: index, pos });
            }
         }
      });

      for (const needle of needles) {
         let from = flat.indexOf(needle);

         while (from !== -1) {
            const spans = new Map<number, [number, number]>();

            for (let i = from; i < from + needle.length; i++) {
               const { item, pos } = map[i];
               const span = spans.get(item);
               spans.set(
                  item,
                  span ? [Math.min(span[0], pos), Math.max(span[1], pos)] : [pos, pos],
               );
            }

            spans.forEach(([first, last], index) => {
               const item = items[index];
               const length = Math.max(1, item.str.length);
               const [a, b, c, d, e, f] = item.transform;
               const scale = Math.hypot(a, b) || 1;
               const ux = a / scale;
               const uy = b / scale;
               const vx = -uy;
               const vy = ux;
               const height = item.height || Math.hypot(c, d) || 10;
               const start = (first / length) * item.width;
               const run = ((last + 1 - first) / length) * item.width;
               const pad = Math.max(1.5, height * 0.15);
               const x = e + ux * (start - pad) - vx * height * 0.25;
               const y = f + uy * (start - pad) - vy * height * 0.25;
               const width = run + pad * 2;
               const tall = height * 1.35;

               found.push({
                  id: `t${number}-${found.length}`,
                  page: number,
                  kind: 'text',
                  term: needle,
                  x,
                  y,
                  width,
                  height: tall,
                  angle: (Math.atan2(uy, ux) * 180) / Math.PI,
                  view: viewBox(viewport, [
                     [x, y],
                     [x + ux * width, y + uy * width],
                     [x + vx * tall, y + vy * tall],
                     [x + ux * width + vx * tall, y + uy * width + vy * tall],
                  ]),
                  repeat: 1,
                  auto: true,
               });
            });

            from = flat.indexOf(needle, from + needle.length);
         }
      }
   }

   return found;
}

/** Find every image drawn on the pages (logos, stamps, image watermarks). */
export async function findImages(
   document: PDFDocumentProxy,
   cancelled: () => boolean = () => false,
) {
   const { OPS } = await import('pdfjs-dist');
   const found: DetectedArea[] = [];
   const seen = new Map<string, Set<number>>();
   const keys: string[] = [];

   for (let number = 1; number <= document.numPages; number++) {
      if (cancelled()) {
         return found;
      }

      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: 1 }) as unknown as Viewport;
      const list = await page.getOperatorList();
      let ctm: Matrix = [1, 0, 0, 1, 0, 0];
      const stack: Matrix[] = [];

      for (let i = 0; i < list.fnArray.length; i++) {
         const op = list.fnArray[i];
         const args = list.argsArray[i] as unknown[];

         if (op === OPS.save) {
            stack.push(ctm);
         } else if (op === OPS.restore) {
            ctm = stack.pop() ?? ctm;
         } else if (op === OPS.transform) {
            ctm = compose(ctm, args as number[]);
         } else if (op === OPS.paintFormXObjectBegin) {
            stack.push(ctm);

            if (Array.isArray(args?.[0])) {
               ctm = compose(ctm, args[0] as number[]);
            }
         } else if (op === OPS.paintFormXObjectEnd) {
            ctm = stack.pop() ?? ctm;
         } else if (
            op === OPS.paintImageXObject ||
            op === OPS.paintInlineImageXObject ||
            op === OPS.paintImageMaskXObject
         ) {
            let w = 0;
            let h = 0;

            if (op === OPS.paintImageXObject) {
               w = Number(args[1]);
               h = Number(args[2]);
            } else {
               const data = args[0] as { width?: number; height?: number };
               w = data?.width ?? 0;
               h = data?.height ?? 0;
            }

            const corners = [
               [0, 0],
               [1, 0],
               [0, 1],
               [1, 1],
            ].map(
               ([px, py]) =>
                  [
                     ctm[0] * px + ctm[2] * py + ctm[4],
                     ctm[1] * px + ctm[3] * py + ctm[5],
                  ] as [number, number],
            );
            const xs = corners.map((corner) => corner[0]);
            const ys = corners.map((corner) => corner[1]);
            const x = Math.min(...xs);
            const y = Math.min(...ys);
            const width = Math.max(...xs) - x;
            const height = Math.max(...ys) - y;
            const view = viewBox(viewport, corners);
            const portion = view.width * view.height;

            // Ignore hairlines, specks and full-page scans/backgrounds.
            if (
               view.width < 0.01 ||
               view.height < 0.01 ||
               portion < 0.0015 ||
               portion > 0.85
            ) {
               continue;
            }

            const size = `${w}x${h}`;
            const key = `${size}@${Math.round(view.x * 25)},${Math.round(view.y * 25)}`;
            seen.set(key, (seen.get(key) ?? new Set()).add(number));
            keys.push(key);
            found.push({
               id: `i${number}-${found.length}`,
               page: number,
               kind: 'image',
               size,
               x,
               y,
               width,
               height,
               angle: 0,
               view,
               repeat: 1,
               auto: false,
            });
         }
      }
   }

   found.forEach((area, index) => {
      area.repeat = seen.get(keys[index])?.size ?? 1;
      const band = area.view.y < 0.15 || area.view.y + area.view.height > 0.85;
      area.auto =
         document.numPages > 1 ? area.repeat >= 2 : band;
   });

   return found;
}
