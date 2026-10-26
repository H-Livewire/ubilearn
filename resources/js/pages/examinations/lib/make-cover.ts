/** Render page 1 of a PDF into a small WebP image (used as the catalogue cover). */
export async function makeCover(url: string): Promise<Blob> {
   const pdfjs = await import('pdfjs-dist');
   const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
   pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
   const task = pdfjs.getDocument({
      url,
      standardFontDataUrl: '/assets/exam-import/pdfjs/standard_fonts/',
      cMapUrl: '/assets/exam-import/pdfjs/cmaps/',
      cMapPacked: true,
      wasmUrl: '/assets/exam-import/pdfjs/wasm/',
   });

   try {
      const pdf = await task.promise;
      const page = await pdf.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: 480 / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;

      return await new Promise<Blob>((resolve, reject) =>
         canvas.toBlob(
            (blob) =>
               blob ? resolve(blob) : reject(new Error('Cover failed.')),
            'image/webp',
            0.82,
         ),
      );
   } finally {
      await task.destroy();
   }
}
