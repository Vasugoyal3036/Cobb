import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PendingTagsTab, {
  normalizeBarcode,
  cleanBarcodeDigits,
  isBarcodeDuplicate,
  generatePendingTagsWhatsAppMessage,
  TARGET_WHATSAPP_PHONE
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
      },
      {
        id: 'ptag_003',
        barcode: '0099887766',
        articleNo: 'CT-0100',
        articleName: 'Cobb Chino Trouser Beige',
        size: '34',
        color: 'Beige',
        section: 'Men Apparel',
        mrp: 2499,
        discountPercent: 60,
        soldPrice: 1000,
        status: 'active',
        holdForCustomer: true,
        holdBatchId: 'batch_test_1',
        holdCustomerName: 'Rajesh Sharma',
        holdCustomerPhone: '9876543210',
        holdBagNo: 'BAG-1',
        holdCreatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ];

    beforeEach(() => {
      vi.clearAllMocks();
      axios.get.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/inventory/quick-scan')) {
          return Promise.resolve({
            data: {
              success: true,
              variants: [
                {
                  barcode: '8901234000',
                  articleNo: 'CFS-7788',
                  itemName: 'Cobb Premium Cotton Shirt',
                  size: '42',
                  color: 'Navy Blue',
                  sectionName: 'Men Apparel',
                  mrp: 3299,
                  stock: 5
                }
              ]
            }
          });
        }
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
    }, 15000);

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
    }, 15000);

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

    it('renders Customer Hold Bags button and allows opening direct scan modal', async () => {
      render(<PendingTagsTab />);

      await waitFor(() => {
        expect(screen.getByText(/\+ Hold for Customer/i)).toBeDefined();
      });

      // Open Customer Hold direct scan modal
      fireEvent.click(screen.getByText(/\+ Hold for Customer/i));

      await waitFor(() => {
        expect(screen.getByText(/Create Customer Hold Bag \(Direct Scan\)/i)).toBeDefined();
        expect(screen.getByPlaceholderText(/e\.g\. Amit Singla/i)).toBeDefined();
      });
    });

    it('renders Customer Hold Bags tab and switches to hold vault', async () => {
      render(<PendingTagsTab />);

      await waitFor(() => {
        expect(screen.getByText(/Customer Hold Bags/i)).toBeDefined();
      });

      // Switch to Customer Hold Bags tab
      fireEvent.click(screen.getByText(/Customer Hold Bags/i));

      await waitFor(() => {
        expect(screen.getByText(/Customer Hold Vault/i)).toBeDefined();
      });
    });

    it('fetches item details from database via button in Add Pending Tag modal', async () => {
      render(<PendingTagsTab />);

      await waitFor(() => {
        expect(screen.getByText('Cobb Linen Shirt White')).toBeDefined();
      });

      // Open Add Pending Tag Modal
      fireEvent.click(screen.getByRole('button', { name: /Add Pending Tag/i }));

      // Enter barcode into Barcode / SKU input
      const barcodeInput = screen.getByPlaceholderText('Barcode / SKU');
      fireEvent.change(barcodeInput, { target: { value: '8901234000' } });

      // Click "Get Item Details from Database" button
      const getDetailsBtns = screen.getAllByRole('button', { name: /Get Item Details from Database/i });
      expect(getDetailsBtns.length).toBeGreaterThan(0);
      fireEvent.click(getDetailsBtns[0]);

      // Verified item details banner should appear
      await waitFor(() => {
        expect(screen.getByText(/Item Details Retrieved from Database/i)).toBeDefined();
        expect(screen.getAllByText(/Cobb Premium Cotton Shirt/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/CFS-7788/i).length).toBeGreaterThan(0);
      });
    });

    it('fetches item details from database and allows adding to bag in Customer Hold Bag modal', async () => {
      render(<PendingTagsTab />);

      await waitFor(() => {
        expect(screen.getByText(/\+ Hold for Customer/i)).toBeDefined();
      });

      // Open modal
      fireEvent.click(screen.getByText(/\+ Hold for Customer/i));

      await waitFor(() => {
        expect(screen.getByText(/Create Customer Hold Bag \(Direct Scan\)/i)).toBeDefined();
      });

      // Enter barcode in new bag scanner input
      const scanInput = screen.getByPlaceholderText(/Scan barcode or type article \/ SKU/i);
      fireEvent.change(scanInput, { target: { value: '8901234000' } });

      // Click Get Item Details from Database button
      const getDbDetailsBtn = screen.getByRole('button', { name: /Get Item Details from Database/i });
      fireEvent.click(getDbDetailsBtn);

      // Verify staged item review card appears
      await waitFor(() => {
        expect(screen.getByText(/Item Details Retrieved from Database/i)).toBeDefined();
        expect(screen.getByText(/\+ Add This Verified Item to Customer Bag/i)).toBeDefined();
      });

      // Click "+ Add This Verified Item to Customer Bag"
      const addVerifiedBtn = screen.getByRole('button', { name: /\+ Add This Verified Item to Customer Bag/i });
      fireEvent.click(addVerifiedBtn);

      // Item should be moved into bag garments table
      await waitFor(() => {
        expect(screen.getByText(/Garments in this Bag \(1\)/i)).toBeDefined();
      });
    });

    it('renders Copy All (WhatsApp) button and opens preview modal with formatted brief for 8708788707', async () => {
      const writeTextMock = vi.fn().mockResolvedValue();
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      });
      const windowOpenMock = vi.fn();
      window.open = windowOpenMock;

      render(<PendingTagsTab />);

      await waitFor(() => {
        expect(screen.getByText('Cobb Linen Shirt White')).toBeDefined();
      });

      // Find "Copy All" or "Copy All (WhatsApp)" button
      const copyAllBtn = screen.getByRole('button', { name: /Copy All \(WhatsApp\)/i });
      expect(copyAllBtn).toBeDefined();

      fireEvent.click(copyAllBtn);

      // Clipboard should have been called
      expect(writeTextMock).toHaveBeenCalled();
      const copiedText = writeTextMock.mock.calls[0][0];

      // Must include target number 8708788707
      expect(copiedText).toContain('8708788707');

      // Must include barcode number
      expect(copiedText).toContain('0080727340');

      // Must include article brief
      expect(copiedText).toContain('CFS-0192');
      expect(copiedText).toContain('Cobb Linen Shirt White');

      // WhatsApp Preview modal should be visible
      await waitFor(() => {
        expect(screen.getByText('WhatsApp Pending Tags Brief')).toBeDefined();
        expect(screen.getByText(/\+91 87087 88707/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /Open WhatsApp \(8708788707\)/i })).toBeDefined();
      });

      // window.open should have been called targeting wa.me with 8708788707
      expect(windowOpenMock).toHaveBeenCalled();
      expect(windowOpenMock.mock.calls[0][0]).toContain('wa.me/918708788707');

      // Clicking Close should dismiss the modal
      fireEvent.click(screen.getByRole('button', { name: /Close/i }));
      await waitFor(() => {
        expect(screen.queryByText('WhatsApp Pending Tags Brief')).toBeNull();
      });
    });
  });

  describe('WhatsApp Brief Generator Logic', () => {
    it('returns empty string when given empty array', () => {
      expect(generatePendingTagsWhatsAppMessage([])).toBe('');
      expect(generatePendingTagsWhatsAppMessage(null)).toBe('');
    });

    it('generates structured WhatsApp brief including barcode numbers for every article and target 8708788707', () => {
      const items = [
        {
          id: '1',
          barcode: '0079484055',
          articleNo: 'FJWA2610',
          articleName: 'Denim Slim Fit',
          size: '32',
          color: 'Navy',
          mrp: 3999,
          soldPrice: 1600,
          discountPercent: 60
        },
        {
          id: '2',
          barcode: '0071258969',
          articleNo: 'CFS-0192',
          articleName: 'Formal Linen Shirt',
          size: '40',
          color: 'White',
          mrp: 2999,
          soldPrice: 1200,
          discountPercent: 60,
          holdForCustomer: true,
          holdCustomerName: 'Rajesh',
          holdBagNo: 'BAG-1'
        }
      ];

      const msg = generatePendingTagsWhatsAppMessage(items, 'Cobb Delhi Store');

      expect(TARGET_WHATSAPP_PHONE).toBe('8708788707');
      expect(msg).toContain('COBB PENDING TAGS BRIEF');
      expect(msg).toContain('Total Articles:* 2 pcs');
      expect(msg).toContain('0079484055');
      expect(msg).toContain('0071258969');
      expect(msg).toContain('FJWA2610');
      expect(msg).toContain('CFS-0192');
      expect(msg).toContain('Customer Hold:* Rajesh [BAG-1]');
      expect(msg).toContain('+91 8708788707');
      expect(msg).toContain('Cobb Delhi Store');
    });
  });
});
