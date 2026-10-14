import { cp, mkdir } from 'node:fs/promises';
const destination = 'public/assets/exam-import';
await mkdir(`${destination}/pdfjs`, { recursive: true });
for (const folder of ['standard_fonts', 'cmaps', 'wasm']) {
 await cp(`node_modules/pdfjs-dist/${folder}`, `${destination}/pdfjs/${folder}`, { recursive: true });
}
await mkdir(`${destination}/ocr/langs`, { recursive: true });
await cp('node_modules/tesseract.js/dist/worker.min.js', `${destination}/ocr/worker.min.js`);
for (const name of ['tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm', 'LICENSE']) await cp(`node_modules/tesseract.js-core/${name}`, `${destination}/ocr/${name}`);
await cp('resources/exam-import/eng.traineddata', `${destination}/ocr/langs/eng.traineddata`);
console.log('Prepared local PDF fonts, codecs and OCR assets.');
