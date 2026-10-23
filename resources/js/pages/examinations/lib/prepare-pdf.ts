import { PDFDocument, rgb } from 'pdf-lib';

export interface BrandingArea {
   page: number;
   x: number;
   y: number;
   width: number;
   height: number;
}
export async function preparePaperPdf(
   source: Uint8Array,
   logo: Uint8Array,
   areas: BrandingArea[],
   opacity: number,
   progress: (percent: number, message: string) => void,
   cancelled: () => boolean = () => false,
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

      // Cover only admin-selected branding; do not alter unrelated text/images.
      for (const area of areas.filter((item) => item.page === index + 1)) {
         page.drawRectangle({
            x: area.x,
            y: area.y,
            width: area.width,
            height: area.height,
            color: rgb(1, 1, 1),
         });
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
