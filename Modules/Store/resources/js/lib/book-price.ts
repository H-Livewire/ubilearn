const formatter = new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 2 });

/** Book amounts are entered in Tanzanian shillings; this does not convert currencies. */
export function formatBookAmount(
   value: number | string | null | undefined,
): string {
   if (
      value === null ||
      value === undefined ||
      value === '' ||
      !Number.isFinite(Number(value))
   ) {
      return 'TSh —';
   }

   return `TSh ${formatter.format(Number(value))}`;
}
