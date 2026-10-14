# Exam import OCR data

`eng.traineddata` is the English LSTM model fetched by Tesseract.js from
https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz.
Tesseract language data is distributed under Apache License 2.0:
https://github.com/tesseract-ocr/tessdata/blob/main/LICENSE.

The build copies the model and installed Tesseract/PDF.js runtimes into public
assets. Exam pages are processed in the browser, without sending documents to an
external OCR service. Extracted questions must be reviewed before publishing.
