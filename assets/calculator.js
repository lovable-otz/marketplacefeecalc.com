/* calculator.js — marketplacefeecalc.com
 * Tools: "etsyFees" (fees + profit for one Etsy sale), "ebayFees" (fees + profit for one eBay sale),
 *        "resaleProfit" (any marketplace, you enter the fee %).
 *
 * FIGURE STATUS — checked 2026-09-21.
 *   etsy.com/legal/fees and help.etsy.com both return HTTP 403 to automated fetches from here (as they
 *   did on 2026-09-14), so the Etsy figures below were corroborated on 2026-09-21 against multiple
 *   independent 2026 references, which agreed on every value with no contradictions:
 *     listing $0.20, charged again when a listing renews — listings expire after four months, and a
 *       listing renews automatically when an item sells and stock remains;
 *     transaction 6.5% on the total the buyer pays, including shipping and gift wrapping;
 *     payment processing 3% + $0.25 for US sellers (varies by country);
 *     Offsite Ads 15% for shops under $10,000 in trailing 12-month sales, 12% at or above that,
 *       capped at $100 per order, and mandatory once a shop passes $10,000;
 *     Etsy Plus $10/month.
 *   Worked check: a $100 sale costs $6.50 + $3.25 + $0.20 = $9.95, leaving $90.05 — matches the
 *   figure the references quote and the value this calculator returns.
 *   NOT a first-party read: nobody has opened etsy.com/legal/fees in a browser and compared. Every fee
 *   is an editable input, the page links to Etsy's own fee page, and the "Fees last checked" line is
 *   fed from FEES.checked. eBay was checked first-party on 2026-09-19.
 *   Trademark: "Etsy" / "eBay" appear only to name the marketplace (nominative use); not in the domain or
 *   logo; footer says "not affiliated with Etsy or eBay".
 */
(function (root, factory) {
  const C = factory();
  if (typeof module === 'object' && module.exports) module.exports = C; else root.CALCS = C;
})(typeof self !== 'undefined' ? self : this, function () {
  const FEES = {
    checked: '2026-09-21',
    // US seller, USD. Corroborated 2026-09-21 (see FIGURE STATUS above). offsiteAdsPct is the
    // under-$10k rate; shops at or above $10k in trailing 12-month sales pay 12%, capped at $100
    // per order, and cannot opt out. The rate is an editable input on the page.
    etsy: { source: 'https://www.etsy.com/legal/fees', listing: 0.20, transactionPct: 6.5, processingPct: 3, processingFixed: 0.25, offsiteAdsPct: 15, offsiteAdsPctHighVolume: 12, offsiteAdsCap: 100, plusMonthly: 10, renewalMonths: 4 },
    ebay: { checked: '2026-09-19', source: 'https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees', fvfPct: 13.6, perOrderLow: 0.30, perOrderHigh: 0.40, perOrderBreak: 10 }, // checked 2026-09-19 (most categories, US): 13.6% on the total amount of the sale up to $7,500 per item then 2.35% above; per-order $0.30 at or below $10.00, $0.40 above
  };
  const r2 = n => Math.round(n * 100) / 100;
  const checkedWarning = (checked) => checked ? [] : ['Default fee rates have not been checked against the marketplace’s fee page yet; confirm them before relying on this result.'];

  const etsyFees = {
    title: 'Etsy fee calculator',
    inputs: [
      { id: 'price', label: 'Item price', type: 'number', prefix: '$', default: 30, min: 0 },
      { id: 'shipCharged', label: 'Shipping you charge the buyer', type: 'number', prefix: '$', default: 5, min: 0 },
      { id: 'tax', label: 'Sales tax collected on the order', type: 'number', prefix: '$', default: 0, min: 0, help: 'Etsy collects this in most US states; payment processing is charged on the order total including tax.' },
      { id: 'itemCost', label: 'Your cost to make or buy the item', type: 'number', prefix: '$', default: 8, min: 0 },
      { id: 'shipCost', label: 'Your actual shipping cost (label + packaging)', type: 'number', prefix: '$', default: 6, min: 0 },
      { id: 'offsite', label: 'This sale came from an Etsy Offsite Ad', type: 'checkbox', default: false },
      { id: 'offsitePct', label: 'Offsite Ads fee', type: 'number', suffix: '%', default: FEES.etsy.offsiteAdsPct, min: 0, showIf: s => s.offsite },
      { id: 'transactionPct', label: 'Transaction fee', type: 'number', suffix: '%', default: FEES.etsy.transactionPct, min: 0 },
      { id: 'processingPct', label: 'Payment processing %', type: 'number', suffix: '%', default: FEES.etsy.processingPct, min: 0 },
      { id: 'processingFixed', label: 'Payment processing fixed fee', type: 'number', prefix: '$', default: FEES.etsy.processingFixed, min: 0 },
      { id: 'listing', label: 'Listing fee', type: 'number', prefix: '$', default: FEES.etsy.listing, min: 0 },
    ],
    compute(v, fmt) {
      const sale = (v.price || 0) + (v.shipCharged || 0);
      const listing = v.listing || 0;
      const transaction = sale * (v.transactionPct || 0) / 100;
      const processing = (sale + (v.tax || 0)) * (v.processingPct || 0) / 100 + (sale > 0 ? (v.processingFixed || 0) : 0);
      const offsite = v.offsite ? sale * (v.offsitePct || 0) / 100 : 0;
      const fees = listing + transaction + processing + offsite;
      const profit = sale - fees - (v.itemCost || 0) - (v.shipCost || 0);
      const margin = sale ? profit / sale * 100 : NaN;
      // break-even item price, shipping charged held constant, tax ignored:
      // p + s − L − t(p+s) − q(p+s) − F − o(p+s) − costs = 0
      const rate = ((v.transactionPct || 0) + (v.processingPct || 0) + (v.offsite ? (v.offsitePct || 0) : 0)) / 100;
      const breakEven = ((listing + (v.processingFixed || 0) + (v.itemCost || 0) + (v.shipCost || 0)) / (1 - rate)) - (v.shipCharged || 0);
      return {
        raw: { transaction: r2(transaction), processing: r2(processing), offsite: r2(offsite), fees: r2(fees), profit: r2(profit), breakEven: r2(breakEven) },
        warnings: checkedWarning(FEES.checked),
        summary: [
          { label: 'Profit on this sale', value: fmt.money(profit), strong: true },
          { label: 'Total Etsy fees', value: fmt.money(fees) },
          { label: 'Profit margin', value: fmt.pct(margin) },
          { label: 'Break-even item price', value: fmt.money(Math.max(0, breakEven)) },
        ],
        rows: [
          { label: 'Listing fee', value: fmt.money(listing) },
          { label: `Transaction fee (${v.transactionPct}% of item + shipping)`, value: fmt.money(transaction) },
          { label: 'Payment processing', value: fmt.money(processing) },
          ...(v.offsite ? [{ label: `Offsite Ads (${v.offsitePct}%)`, value: fmt.money(offsite) }] : []),
          { label: 'Total fees', value: fmt.money(fees), total: true },
        ],
        notes: [`Fee rates last checked: ${FEES.checked || 'not yet'}. Currency conversion, regulatory operating fees and Etsy Ads spend are not included.`],
      };
    },
  };

  const ebayFees = {
    title: 'eBay fee calculator',
    inputs: [
      { id: 'price', label: 'Sold price', type: 'number', prefix: '$', default: 50, min: 0 },
      { id: 'shipCharged', label: 'Shipping charged to buyer', type: 'number', prefix: '$', default: 8, min: 0 },
      { id: 'tax', label: 'Sales tax on the order', type: 'number', prefix: '$', default: 0, min: 0 },
      { id: 'fvfPct', label: 'Final value fee for your category', type: 'number', suffix: '%', default: FEES.ebay.fvfPct, min: 0, help: 'Varies by category — check eBay’s fee table for yours.' },
      { id: 'promotedPct', label: 'Promoted listing ad rate (if sold via ad)', type: 'number', suffix: '%', default: 0, min: 0 },
      { id: 'itemCost', label: 'What you paid for the item', type: 'number', prefix: '$', default: 15, min: 0 },
      { id: 'shipCost', label: 'Your actual shipping cost', type: 'number', prefix: '$', default: 9, min: 0 },
    ],
    compute(v, fmt) {
      const total = (v.price || 0) + (v.shipCharged || 0) + (v.tax || 0);
      const fvf = total * (v.fvfPct || 0) / 100;
      const perOrder = total <= 0 ? 0 : total > FEES.ebay.perOrderBreak ? FEES.ebay.perOrderHigh : FEES.ebay.perOrderLow;
      const promoted = ((v.price || 0) + (v.shipCharged || 0)) * (v.promotedPct || 0) / 100;
      const fees = fvf + perOrder + promoted;
      const profit = (v.price || 0) + (v.shipCharged || 0) - fees - (v.itemCost || 0) - (v.shipCost || 0);
      return {
        raw: { fvf: r2(fvf), perOrder, promoted: r2(promoted), fees: r2(fees), profit: r2(profit) },
        warnings: checkedWarning(FEES.ebay.checked),
        summary: [
          { label: 'Profit', value: fmt.money(profit), strong: true },
          { label: 'Total eBay fees', value: fmt.money(fees) },
          { label: 'Fees as % of sale', value: fmt.pct((v.price || 0) + (v.shipCharged || 0) ? fees / ((v.price || 0) + (v.shipCharged || 0)) * 100 : NaN) },
        ],
        rows: [
          { label: `Final value fee (${v.fvfPct}% of total incl. shipping & tax)`, value: fmt.money(fvf) },
          { label: 'Per-order fee', value: fmt.money(perOrder) },
          ...(promoted ? [{ label: 'Promoted listing fee', value: fmt.money(promoted) }] : []),
          { label: 'Total fees', value: fmt.money(fees), total: true },
        ],
        notes: [`Fee rates last checked: ${FEES.ebay.checked || 'not yet'}. Store subscription discounts and international fees are not included.`],
      };
    },
  };

  const resaleProfit = {
    title: 'Reseller profit calculator',
    inputs: [
      { id: 'price', label: 'Selling price', type: 'number', prefix: '$', default: 40, min: 0 },
      { id: 'feePct', label: 'Marketplace fee %', type: 'number', suffix: '%', default: 13, min: 0 },
      { id: 'fixedFee', label: 'Fixed fee per sale', type: 'number', prefix: '$', default: 0.3, min: 0 },
      { id: 'itemCost', label: 'Item cost', type: 'number', prefix: '$', default: 10, min: 0 },
      { id: 'otherCost', label: 'Shipping, supplies & other costs', type: 'number', prefix: '$', default: 6, min: 0 },
    ],
    compute(v, fmt) {
      const fees = (v.price || 0) * (v.feePct || 0) / 100 + ((v.price || 0) > 0 ? (v.fixedFee || 0) : 0);
      const profit = (v.price || 0) - fees - (v.itemCost || 0) - (v.otherCost || 0);
      const roi = v.itemCost ? profit / v.itemCost * 100 : NaN;
      return {
        raw: { fees: r2(fees), profit: r2(profit), roi: r2(roi) },
        summary: [
          { label: 'Profit', value: fmt.money(profit), strong: true },
          { label: 'Fees', value: fmt.money(fees) },
          { label: 'Return on item cost', value: fmt.pct(roi) },
        ],
      };
    },
  };

  return {
    etsyFees, ebayFees, resaleProfit,
    __rules: FEES,
    __tests: [
      { calc: 'etsyFees', name: '$30 + $5 ship, no tax, no offsite',
        // transaction 35×6.5% = 2.275 · processing 35×3% + 0.25 = 1.30 · listing 0.20 → 3.775 · profit 35 − 3.775 − 8 − 6 = 17.225
        input: { price: 30, shipCharged: 5, tax: 0, itemCost: 8, shipCost: 6, offsite: false, offsitePct: 15, transactionPct: 6.5, processingPct: 3, processingFixed: 0.25, listing: 0.2 },
        expect: { transaction: 2.28, processing: 1.3, fees: 3.78, profit: 17.23 } },
      { calc: 'etsyFees', name: 'offsite ad at 15% adds $5.25',
        input: { price: 30, shipCharged: 5, tax: 0, itemCost: 8, shipCost: 6, offsite: true, offsitePct: 15, transactionPct: 6.5, processingPct: 3, processingFixed: 0.25, listing: 0.2 },
        expect: { offsite: 5.25, fees: 9.03 } },
      { calc: 'etsyFees', name: 'break-even price: fees and costs exactly covered',
        // (0.20 + 0.25 + 8 + 6) / (1 − 0.095) − 5 = 14.45 / 0.905 − 5 = 10.967
        input: { price: 30, shipCharged: 5, tax: 0, itemCost: 8, shipCost: 6, offsite: false, transactionPct: 6.5, processingPct: 3, processingFixed: 0.25, listing: 0.2 },
        expect: { breakEven: 10.97 } },
      { calc: 'ebayFees', name: '$50 + $8 ship at 13.6%',
        // fvf 58 × 13.6% = 7.888 · per order 0.40 → 8.288 · profit 58 − 8.288 − 15 − 9 = 25.712
        input: { price: 50, shipCharged: 8, tax: 0, fvfPct: 13.6, promotedPct: 0, itemCost: 15, shipCost: 9 },
        expect: { fvf: 7.89, perOrder: 0.4, fees: 8.29, profit: 25.71 } },
      { calc: 'ebayFees', name: 'order ≤ $10 uses the low per-order fee', input: { price: 8, shipCharged: 0, tax: 0, fvfPct: 13.6, promotedPct: 0, itemCost: 2, shipCost: 0 }, expect: { perOrder: 0.3 } },
      { calc: 'resaleProfit', name: '$40 at 13% + $0.30', input: { price: 40, feePct: 13, fixedFee: 0.3, itemCost: 10, otherCost: 6 }, expect: { fees: 5.5, profit: 18.5, roi: 185 } },
    ],
  };
});
