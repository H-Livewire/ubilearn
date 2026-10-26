/**
 * Makes the (usually white) background of an uploaded logo transparent, in the
 * browser, before upload. Near-background pixels become transparent, edge
 * pixels get a soft alpha, and their colour is un-mixed from the background so
 * no white halo is left on dark pages.
 */
const MAX_WIDTH = 800;
const LOW = 22; // distance below which a pixel is pure background
const HIGH = 80; // distance above which a pixel is fully opaque

function load(file: Blob): Promise<HTMLImageElement> {
   return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
         URL.revokeObjectURL(url);
         resolve(image);
      };
      image.onerror = () => {
         URL.revokeObjectURL(url);
         reject(new Error('Could not read this image.'));
      };
      image.src = url;
   });
}

export async function removeLogoBackground(file: File): Promise<File> {
   if (file.type === 'image/svg+xml') {
      return file;
   }

   const image = await load(file);
   const scale = Math.min(1, MAX_WIDTH / image.naturalWidth);
   const width = Math.max(1, Math.round(image.naturalWidth * scale));
   const height = Math.max(1, Math.round(image.naturalHeight * scale));
   const canvas = document.createElement('canvas');
   canvas.width = width;
   canvas.height = height;
   const context = canvas.getContext('2d', { willReadFrequently: true });

   if (!context) {
      return file;
   }

   context.drawImage(image, 0, 0, width, height);
   const frame = context.getImageData(0, 0, width, height);
   const px = frame.data;

   // Background colour = average of the four corners.
   const corners = [
      0,
      (width - 1) * 4,
      (height - 1) * width * 4,
      ((height - 1) * width + (width - 1)) * 4,
   ];
   let r = 0;
   let g = 0;
   let b = 0;
   let opaqueCorners = 0;

   for (const index of corners) {
      if (px[index + 3] > 200) {
         r += px[index];
         g += px[index + 1];
         b += px[index + 2];
         opaqueCorners += 1;
      }
   }

   // Already transparent: nothing to remove.
   if (opaqueCorners < 3) {
      return file;
   }

   r /= opaqueCorners;
   g /= opaqueCorners;
   b /= opaqueCorners;

   for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) {
         continue;
      }

      const distance = Math.hypot(px[i] - r, px[i + 1] - g, px[i + 2] - b);

      if (distance <= LOW) {
         px[i + 3] = 0;
         continue;
      }

      if (distance < HIGH) {
         const alpha = (distance - LOW) / (HIGH - LOW);
         px[i] = clamp((px[i] - r * (1 - alpha)) / alpha);
         px[i + 1] = clamp((px[i + 1] - g * (1 - alpha)) / alpha);
         px[i + 2] = clamp((px[i + 2] - b * (1 - alpha)) / alpha);
         px[i + 3] = Math.round(px[i + 3] * alpha);
      }
   }

   context.putImageData(frame, 0, 0);
   trim(canvas, context);

   const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
   );

   if (!blob) {
      return file;
   }

   const base = file.name.replace(/\.[^.]+$/, '') || 'logo';

   return new File([blob], `${base}.png`, { type: 'image/png' });
}

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

/** Crops empty (transparent) margins so every logo is the same visual size. */
function trim(
   canvas: HTMLCanvasElement,
   context: CanvasRenderingContext2D,
): void {
   const { width, height } = canvas;
   const data = context.getImageData(0, 0, width, height).data;
   let top = height;
   let left = width;
   let right = -1;
   let bottom = -1;

   for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
         if (data[(y * width + x) * 4 + 3] > 10) {
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
            left = Math.min(left, x);
            right = Math.max(right, x);
         }
      }
   }

   if (right < left || bottom < top) {
      return;
   }

   const cropWidth = right - left + 1;
   const cropHeight = bottom - top + 1;
   const crop = context.getImageData(left, top, cropWidth, cropHeight);
   canvas.width = cropWidth;
   canvas.height = cropHeight;
   context.putImageData(crop, 0, 0);
}
