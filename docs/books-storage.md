# Books on Laravel Cloud

Books reuse the existing checkout/payment gateways and purchase history. Admins use **Books → Upload Book**, upload a PDF or EPUB (maximum 50 MB), add a cover and price, then approve/publish the book. Buyers download from **My Books** after a successful payment. Offline payments require approval first.

## Required private storage

Create a **private** Object Storage bucket for paid book files. Keep the existing public images bucket separate. A public bucket exposes full books before payment.

Add the private bucket connection values to the Laravel Cloud environment:

```dotenv
BOOKS_BUCKET=your-private-bucket-name
BOOKS_ACCESS_KEY_ID=your-private-bucket-access-key
BOOKS_SECRET_ACCESS_KEY=your-private-bucket-secret
BOOKS_REGION=your-bucket-region
BOOKS_ENDPOINT=https://your-s3-compatible-endpoint
BOOKS_USE_PATH_STYLE_ENDPOINT=false
```

Use the values supplied for that bucket, then redeploy to refresh cached configuration. Do not share secret keys in chat or commit them to Git. Cloud book uploads are blocked until private storage is configured; local development uses `storage/app/private/books`.

For existing PDF/EPUB files from the old Store, run once in the Cloud environment after configuring storage:

```sh
php artisan books:secure-files
```

The command copies each book, verifies its checksum, switches the media record to private storage, and removes the old public copy. Missing source files must be uploaded again. Books with old public-only files stay out of the public Books catalog until secured. Other legacy product types remain in the database for historical records.

Test a book purchase with the configured payment gateway before offering paid books. This change does not configure gateway accounts or create a Cloud bucket.
