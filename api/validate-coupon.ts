/**
 * Coupon validation API.
 * POST /api/validate-coupon
 * Body: { code: string, originalAmountPaise: number }
 * Returns: { valid, code, discountType, discountValue, discountAmountPaise, finalAmountPaise, message }
 */

// ─── Coupon definitions ─────────────────────────────────────────────
// Add, remove, or modify coupons here. Each entry supports:
//   type: 'flat' (₹ off) | 'percent' (% off) | 'override' (pay exactly this)
//   value: amount in rupees (flat/override) or percentage (percent)
//   maxDiscount?: cap for percent coupons (in rupees)
//   minOrder?: minimum original amount in rupees
//   expiresAt?: ISO date string — optional expiry
// ─────────────────────────────────────────────────────────────────────

interface CouponDef {
  type: 'flat' | 'percent' | 'override';
  value: number;
  maxDiscount?: number;
  minOrder?: number;
  expiresAt?: string;
}

const COUPONS: Record<string, CouponDef> = {
  FLAT100: { type: 'flat', value: 100 },
  SAVE20: { type: 'percent', value: 20, maxDiscount: 150 },
  APPLI1: { type: 'override', value: 1 }, // testing coupon — pay ₹1
  PATHFINDER50: { type: 'flat', value: 50 },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, originalAmountPaise } = req.body || {};

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ valid: false, message: 'Coupon code is required' });
  }

  const normalised = code.trim().toUpperCase();
  const coupon = COUPONS[normalised];

  if (!coupon) {
    return res.status(200).json({ valid: false, message: 'Invalid coupon code' });
  }

  // Check expiry
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return res.status(200).json({ valid: false, message: 'This coupon has expired' });
  }

  const originalRupees = (originalAmountPaise || 49900) / 100;

  // Check minimum order
  if (coupon.minOrder && originalRupees < coupon.minOrder) {
    return res.status(200).json({
      valid: false,
      message: `Minimum order of ₹${coupon.minOrder} required`,
    });
  }

  let discountRupees = 0;

  switch (coupon.type) {
    case 'flat':
      discountRupees = coupon.value;
      break;
    case 'percent':
      discountRupees = (coupon.value / 100) * originalRupees;
      if (coupon.maxDiscount) {
        discountRupees = Math.min(discountRupees, coupon.maxDiscount);
      }
      break;
    case 'override':
      discountRupees = originalRupees - coupon.value;
      break;
  }

  // Ensure discount doesn't exceed original price and final is at least ₹1
  discountRupees = Math.min(discountRupees, originalRupees - 1);
  discountRupees = Math.max(discountRupees, 0);
  discountRupees = Math.round(discountRupees * 100) / 100;

  const finalRupees = originalRupees - discountRupees;
  const finalAmountPaise = Math.round(finalRupees * 100);
  const discountAmountPaise = Math.round(discountRupees * 100);

  return res.status(200).json({
    valid: true,
    code: normalised,
    discountType: coupon.type,
    discountValue: coupon.value,
    discountAmountPaise,
    finalAmountPaise,
    message: coupon.type === 'override'
      ? `Coupon applied! Pay only ₹${finalRupees.toFixed(0)}`
      : coupon.type === 'percent'
        ? `${coupon.value}% off! You save ₹${discountRupees.toFixed(0)}`
        : `₹${discountRupees.toFixed(0)} off applied!`,
  });
}
