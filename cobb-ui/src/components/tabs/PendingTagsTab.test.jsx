import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PendingTagsTab, {
  normalizeBarcode,
  cleanBarcodeDigits,
  isBarcodeDuplicate
} from './PendingTagsTab';
import axios from 'axios';

vi.mock('axios');
vi.mock('../../utils/firebase', () => ({
  db: null
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  setDoc: vi.fn(),
  getDoc: vi.fn()
}));

describe('PendingTagsTab - Duplicate Barcode Prevention', () => {
  describe('Barcode Normalization & Similarity Logic', () => {
    it('normalizes whitespace and casing', () => {
      expect(normalizeBarcode('  cfs-0192  ')).toBe('CFS-0192');
      expect(normalizeBarcode(null)).toBe('');
      expect(normalizeBarcode(undefined)).toBe('');
    });

    it('strips leading zeros from numeric barcodes for clean comparison', () => {
      expect(cleanBarcodeDigits('0080727340')).toBe('80727340');
      expect(cleanBarcodeDigits('80727340')).toBe('80727340');
      expect(cleanBarcodeDigits('000')).toBe('0');
      expect(cleanBarcodeDigits('00-79-734971')).toBe('79734971');
    });

    it('accurately identifies duplicate barcodes across format variations', () => {
      // Exact match
      expect(isBarcodeDuplicate('80727340', '80727340')).toBe(true);
      // Case insensitivity
      expect(isBarcodeDuplicate('abc1234', 'ABC1234')).toBe(true);
      // Leading zeros variations
      expect(isBarcodeDuplicate('0080727340', '80727340')).toBe(true);
      expect(isBarcodeDuplicate('80727340', '0080727340')).toBe(true);
      // Extra whitespace / hyphens
      expect(isBarcodeDuplicate('  0080-727340  ', '80727340')).toBe(true);
      // Different barcodes
      expect(isBarcodeDuplicate('80727340', '80727341')).toBe(false);
      expect(isBarcodeDuplicate('12345', '67890')).toBe(false);
      // Empty / invalid
      expect(isBarcodeDuplicate('', '80727340')).toBe(false);
      expect(isBarcodeDuplicate(null, '80727340')).toBe(false);
    });
  });

  describe('PendingTagsTab UI Duplicate Prevention', () => {
    const mockTags = [
      {
        id: 'ptag_001',
        barcode: '0080727340',
        articleNo: 'CFS-0192',
        articleName: 'Cobb Linen Shirt White',
        size: '40',
        color: 'White',
        section: 'Men Apparel',
        mrp: 2999,
        discountPercent: 60,
        soldPrice: 1200,
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'ptag_002',
        barcode: '0090123456',
        articleNo: 'CJN-0500',
        articleName: 'Cobb Denim Jeans Dark Blue',
        size: '32',
        color: 'Dark Blue',
        section: 'Men Apparel',
        mrp: 3499,
        discountPercent: 60,
        soldPrice: 1400,
        status: 'billed', // Billed/resolved tag
        createdAt: new Date().toISOString()
      }
    ];

    beforeEach(() => {
      vi.clearAllMocks();
      axios.get.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/damages')) {
          return Promise.resolve({
            data: {
              success: true,
              damages: [
                {
                  id: 'dmg_001',
                  barcode: '8901234567890',
                  articleNo: 'CFS-0192',
                  articleName: 'Cobb Linen Shirt White',
                  size: '40',
                  color: 'White',
                  mrp: 2999,
                  defectType: 'STITCH_TEAR',
                  defectDesc: 'Torn side seam',
                  severity: 'minor',
                  actionPlan: 'local_repair',
                  status: 'quarantine',
                  reportedBy: 'Vikas',
                  date: '2026-11-05'
                }
              ],
              summary: {
                totalCount: 1,
                quarantinedCount: 1,
                quarantinedMrp: 2999,
                dispatchedCount: 0,
                settledCount: 0,
                repairedCount: 0
              }
            }
          });
        }
        return Promise.resolve({
          data: {
            success: true,
            tags: mockTags,
            summary: {
              activeCount: 1,
              billedCount: 1,
              activeMrpValue: 2999,
              activeRealizedValue: 1200,
              avgDiscountPct: '60.0',
              billedTodayCount: 0
            }
          }
        });
      });
    });

    it('renders Pending Tag Desk header and active pending count', async () => {
      render(<PendingTagsTab />);

      await waitFor(() => {
        expect(screen.getByText('Pending Tag Desk')).toBeDefined();
      });

      expect(screen.getByText('B1G2 Single-Piece Manager')).toBeDefined();
      expect(screen.getByText('Add Pending Tag')).toBeDefined();
    });

    it('detects duplicate active barcode in real-time and warns the user', async () => {
      render(<PendingTagsTab />);

      await waitFor(() => {
        expect(screen.getByText('Cobb Linen Shirt White')).toBeDefined();
      });

      // Open Add Pending Tag Modal
      fireEvent.click(screen.getByRole('button', { name: /Add Pending Tag/i }));

      expect(screen.getByRole('heading', { name: 'Add Pending Tag' })).toBeDefined();

      // Enter duplicate barcode without leading zeros (80727340 vs 0080727340)
      const barcodeInput = screen.getByPlaceholderText('Barcode / SKU');
      fireEvent.change(barcodeInput, { target: { value: '80727340' } });

      // Real-time duplicate warning banner should appear
      await waitFor(() => {
        expect(screen.getByText(/This tag has already been added in the tab/i)).toBeDefined();
        expect(screen.getByText(/#ptag_001/i)).toBeDefined();
      });

      // The save button should be disabled
      const saveBtn = screen.getByRole('button', { name: /Duplicate Barcode/i });
      expect(saveBtn.disabled).toBe(true);
    });

    it('shows "This tag has already been added in the tab" when scanned in quick search', async () => {
      render(<PendingTagsTab />);

      await waitFor(() => {
        expect(screen.getByText('Cobb Linen Shirt White')).toBeDefined();
      });

      // Open Add Pending Tag Modal
      fireEvent.click(screen.getByRole('button', { name: /Add Pending Tag/i }));

      const scanInput = screen.getByPlaceholderText(/Scan barcode/i);
      // Scan or type the existing active tag's barcode
      fireEvent.change(scanInput, { target: { value: '0080727340' } });

      // Click Find
      const findBtn = screen.getByRole('button', { name: /Find/i });
      fireEvent.click(findBtn);

      await waitFor(() => {
        // Must show 'This tag has already been added in the tab'
        expect(screen.getAllByText(/This tag has already been added in the tab/i).length).toBeGreaterThan(0);
        // Must NOT show 'No product found matching'
        expect(screen.queryByText(/No product found matching/i)).toBeNull();
      });

      // Form should be auto-populated with that tag's details
      const barcodeField = screen.getByPlaceholderText('Barcode / SKU');
      expect(barcodeField.value).toBe('0080727340');

      // Submit button is disabled
      const saveBtn = screen.getByRole('button', { name: /Duplicate Barcode/i });
      expect(saveBtn.disabled).toBe(true);
    });

    it('allows non-duplicate barcode and enables Save button', async () => {
      render(<PendingTagsTab />);

      await waitFor(() => {
        expect(screen.getByText('Cobb Linen Shirt White')).toBeDefined();
      });

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /Add Pending Tag/i }));

      const barcodeInput = screen.getByPlaceholderText('Barcode / SKU');
      // Type a completely new barcode
      fireEvent.change(barcodeInput, { target: { value: '9988776655' } });

      // No warning banner
      expect(screen.queryByText(/This tag has already been added in the tab/i)).toBeNull();

      // Save button is enabled
      const saveBtn = screen.getByRole('button', { name: /Save Pending Tag/i });
      expect(saveBtn.disabled).toBe(false);
    });

    it('switches to Damage & Quarantine Desk and renders admin vault controls', async () => {
      render(<PendingTagsTab />);

      await waitFor(() => {
        expect(screen.getByText(/Damage & Quarantine Desk/i)).toBeDefined();
      });

      // Click sub-desk switcher to switch to Damage & Quarantine Desk
      const damageDeskBtn = screen.getByRole('button', { name: /Damage & Quarantine Desk/i });
      fireEvent.click(damageDeskBtn);

      await waitFor(() => {
        expect(screen.getByText(/Role-Based Defect Vault/i)).toBeDefined();
        expect(screen.getByText('Quarantined in Bin')).toBeDefined();
        expect(screen.getByText(/Store Tailor Fix/i)).toBeDefined();
        expect(screen.getByText(/Torn side seam/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /Restock/i })).toBeDefined();
      });
    });
  });
});
