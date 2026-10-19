import { describe, it, expect } from 'vitest';
import {
  categorizeGarment,
  computeCustomerFitProfile,
  checkSizeMismatch,
  DEMO_FIT_PROFILES
} from './customerFit';

describe('Customer Fit & Size Memory Engine', () => {
  it('correctly categorizes Cobb garments across retail styles', () => {
    expect(categorizeGarment('SHIRTS', 'FORMAL FULL SL', 'Cobb Oxford')).toBe('shirts');
    expect(categorizeGarment('TROUSERS', 'COTTON TROUSER', 'Slim Chino')).toBe('trousers');
    expect(categorizeGarment('JEANS', 'SLIM FIT DENIM', 'Indigo Jeans')).toBe('trousers');
    expect(categorizeGarment('BLAZERS & SUITS', 'PARTY BLAZER', 'Italian Blazer')).toBe('blazers');
    expect(categorizeGarment('T SHIRT', 'ROUND NECK', 'Summer Tee')).toBe('tshirts');
    expect(categorizeGarment('WINTER WEAR', 'JACKET', 'Puffer Jacket')).toBe('winterwear');
    expect(categorizeGarment('BELT', 'LEATHER', 'Formal Belt')).toBe('accessories');
  });

  it('computes primary sizes, confidence, and summary text from purchase history', () => {
    const history = [
      { Category: 'SHIRTS', ArticleName: 'Oxford Shirt', Size: '40', Quantity: 1, PurchaseDate: '2026-08-15' },
      { Category: 'SHIRTS', ArticleName: 'Royal Shirt', Size: '40', Quantity: 1, PurchaseDate: '2026-06-20' },
      { Category: 'SHIRTS', ArticleName: 'Linen Shirt', Size: '40', Quantity: 1, PurchaseDate: '2026-04-10' },
      { Category: 'SHIRTS', ArticleName: 'Party Shirt', Size: '39', Quantity: 1, PurchaseDate: '2026-02-05' },
      { Category: 'TROUSERS', ArticleName: 'Cotton Chino', Size: '32', Quantity: 1, PurchaseDate: '2026-08-15' },
      { Category: 'TROUSERS', ArticleName: 'Formal Trouser', Size: '32', Quantity: 1, PurchaseDate: '2026-05-12' },
      { Category: 'BLAZERS & SUITS', ArticleName: 'Executive Blazer', Size: '40', Quantity: 1, PurchaseDate: '2026-07-04' }
    ];

    const profile = computeCustomerFitProfile(history);
    expect(profile.hasHistory).toBe(true);
    expect(profile.categories.shirts.primarySize).toBe('40');
    expect(profile.categories.shirts.confidence).toBe('High');
    expect(profile.categories.shirts.totalPurchased).toBe(4);

    expect(profile.categories.trousers.primarySize).toBe('32');
    expect(profile.categories.trousers.confidence).toBe('Medium');

    expect(profile.categories.blazers.primarySize).toBe('40');
    expect(profile.categories.blazers.confidence).toBe('Initial');

    expect(profile.summaryText).toContain('Shirt: 40');
    expect(profile.summaryText).toContain('Trouser: 32');
    expect(profile.summaryText).toContain('Blazer: 40');
  });

  it('detects verified fit match when cart size matches primary size', () => {
    const profile = DEMO_FIT_PROFILES['9812044810'];
    const cartShirt = { name: 'Formal Linen Shirt', category: 'SHIRTS', size: '40' };
    const matchRes = checkSizeMismatch(cartShirt, profile);

    expect(matchRes.isMatch).toBe(true);
    expect(matchRes.isMismatch).toBe(false);
    expect(matchRes.status).toBe('verified');
  });

  it('detects size mismatch warning when cart size conflicts with customer size', () => {
    const profile = DEMO_FIT_PROFILES['9812044810']; // Known Trouser size: 32
    const cartTrouser = { name: 'Chino Pant', category: 'TROUSERS', size: '36' };
    const mismatchRes = checkSizeMismatch(cartTrouser, profile);

    expect(mismatchRes.isMatch).toBe(false);
    expect(mismatchRes.isMismatch).toBe(true);
    expect(mismatchRes.status).toBe('mismatch');
    expect(mismatchRes.expectedSize).toBe('32');
    expect(mismatchRes.scannedSize).toBe('36');
    expect(mismatchRes.message).toContain('Size 32');
    expect(mismatchRes.message).toContain('Size 36');
  });
});
