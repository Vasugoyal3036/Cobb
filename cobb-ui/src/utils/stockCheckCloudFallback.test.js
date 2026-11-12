import { describe, it, expect } from 'vitest';
import { buildStockCheckFromCloudData } from './stockCheckCloudFallback';

describe('buildStockCheckFromCloudData', () => {
  it('resolves unpadded barcode from cloud inventory/master catalogs with pending tags overlay', () => {
    const payload = buildStockCheckFromCloudData({
      query: '80058036',
      inventoryItems: [
        {
          SKU: '0080058036',
          ArticleNo: 'CFMD4420',
          ItemName: 'MEN CASUAL SHIRT',
          ProductType: 'SHIRTS',
          Color: 'NAVY',
          Size: '40',
          MRP: 2499,
          Stock: 3
        }
      ],
      masterItems: [
        {
          SKU: '0080058037',
          ArticleNo: 'CFMD4420',
          ItemName: 'MEN CASUAL SHIRT',
          ProductType: 'SHIRTS',
          Color: 'NAVY',
          Size: '42',
          MRP: 2499,
          Stock: 1
        }
      ],
      pendingTags: [
        {
          id: 'ptag_cloud_1',
          barcode: '0080058036',
          articleNo: 'CFMD4420',
          color: 'NAVY',
          size: '40',
          status: 'active'
        }
      ]
    });

    expect(payload).not.toBeNull();
    expect(payload.success).toBe(true);
    expect(payload.fromCloudFallback).toBe(true);
    expect(payload.articleNo).toBe('CFMD4420');
    expect(payload.matchedBarcode).toBe('0080058036');
    expect(payload.totalStock).toBe(4);
    expect(payload.hasPendingTags).toBe(true);
    expect(payload.colors[0].sizes).toHaveLength(2);
    expect(payload.colors[0].sizes[0].pendingTagsCount).toBe(1);
  });

  it('falls back to inbound GIT parcel items when catalog does not yet include the barcode', () => {
    const payload = buildStockCheckFromCloudData({
      query: 'GIT888111',
      parcels: [
        {
          challanNo: 'CH-100',
          items: [
            {
              code: 'GIT888111',
              article: 'CBLZ-NEW',
              desc: 'INBOUND LINEN BLAZER',
              p1: 'BEIGE',
              p2: '40',
              mrp: 4999,
              qty: 2
            }
          ]
        }
      ]
    });

    expect(payload).not.toBeNull();
    expect(payload.articleNo).toBe('CBLZ-NEW');
    expect(payload.totalStock).toBe(2);
    expect(payload.colors[0].color).toBe('BEIGE');
  });
});

