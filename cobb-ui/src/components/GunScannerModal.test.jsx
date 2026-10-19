import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GunScannerModal from './GunScannerModal';
import axios from 'axios';

vi.mock('axios');
vi.mock('../utils/sound', () => ({
  playBarcodeBeep: vi.fn(),
  playScanErrorBeep: vi.fn(),
  getSoundSettings: vi.fn(() => ({ soundEnabled: true, voiceEnabled: true })),
  saveSoundSettings: vi.fn()
}));

describe('GunScannerModal [F3 Handheld Matrix Scanner]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with F3 badge and ready status when isOpen is true', () => {
    render(
      <GunScannerModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Handheld Gun Scanner/i)).toBeDefined();
    expect(screen.getAllByText('F3').length).toBeGreaterThan(0);
    expect(screen.getByText(/Point Scanner Gun & Pull Trigger/i)).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <GunScannerModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('performs quick scan and renders detailed article matrix with sizes & promos', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        articleNo: 'TSBW',
        itemName: 'Formal Slim Fit Cotton Shirt',
        sectionName: 'SHIRTS',
        subSectionName: 'FORMAL FULL SL',
        color: 'WHITE',
        mrp: 1899,
        totalStock: 25,
        soldToday: 3,
        soldLast7Days: 14,
        soldLast30Days: 42,
        colors: [
          {
            color: 'WHITE',
            totalStock: 15,
            sizes: [
              { size: '38', stock: 4, barcode: 'TSBW-WH-38' },
              { size: '40', stock: 6, barcode: 'TSBW-WH-40' },
              { size: '42', stock: 5, barcode: 'TSBW-WH-42' }
            ]
          },
          {
            color: 'SKY BLUE',
            totalStock: 10,
            sizes: [
              { size: '38', stock: 3, barcode: 'TSBW-BL-38' },
              { size: '40', stock: 4, barcode: 'TSBW-BL-40' },
              { size: '42', stock: 3, barcode: 'TSBW-BL-42' }
            ]
          }
        ],
        variants: [
          { barcode: 'TSBW-WH-40', articleNo: 'TSBW', itemName: 'Formal Slim Fit Cotton Shirt', color: 'WHITE', size: '40', mrp: 1899, stock: 6 }
        ]
      }
    });

    render(
      <GunScannerModal
        isOpen={true}
        onClose={vi.fn()}
        API_BASE="http://localhost:5000"
      />
    );

    const input = screen.getByPlaceholderText(/Pull trigger to scan barcode/i);
    fireEvent.change(input, { target: { value: 'TSBW' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', target: { value: 'TSBW' } });

    await waitFor(() => {
      expect(screen.getByText(/Add to Speed POS Cart/i)).toBeDefined();
    });

    // Check that retail promotion calculation is displayed
    expect(screen.getByText(/Buy 3 @ 70% Off/i)).toBeDefined();
    expect(screen.getByText(/Flat 60% Off/i)).toBeDefined();
    expect(screen.getByText(/Flat 40% Off/i)).toBeDefined();

    // Check sizes and colors
    expect(screen.getAllByText('WHITE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SKY BLUE').length).toBeGreaterThan(0);
  });

  it('triggers onClose when Escape is pressed', () => {
    const handleClose = vi.fn();
    render(
      <GunScannerModal
        isOpen={true}
        onClose={handleClose}
      />
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('triggers onClose when F3 is pressed while open', () => {
    const handleClose = vi.fn();
    render(
      <GunScannerModal
        isOpen={true}
        onClose={handleClose}
      />
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3' }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('dispatches cobb_speed_add_item when Add to Speed POS Cart is clicked', async () => {
    const eventSpy = vi.fn();
    window.addEventListener('cobb_speed_add_item', eventSpy);

    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        articleNo: 'FSRE',
        itemName: 'Linen Casual Shirt',
        mrp: 1499,
        totalStock: 10,
        color: 'NAVY BLUE',
        colors: [
          { color: 'NAVY BLUE', totalStock: 10, sizes: [{ size: '40', stock: 10, barcode: 'FSRE-40' }] }
        ],
        variants: [
          { barcode: 'FSRE-40', articleNo: 'FSRE', itemName: 'Linen Casual Shirt', color: 'NAVY BLUE', size: '40', mrp: 1499, stock: 10 }
        ]
      }
    });

    render(
      <GunScannerModal
        isOpen={true}
        onClose={vi.fn()}
        API_BASE="http://localhost:5000"
      />
    );

    const input = screen.getByPlaceholderText(/Pull trigger to scan barcode/i);
    fireEvent.change(input, { target: { value: 'FSRE' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Add to Speed POS Cart/i)).toBeDefined();
    });

    const addBtn = screen.getByText(/Add to Speed POS Cart/i);
    fireEvent.click(addBtn);

    expect(eventSpy).toHaveBeenCalled();
    window.removeEventListener('cobb_speed_add_item', eventSpy);
  });

  it('correctly scans a Blazer from client-side inventory without falling back to trouser', async () => {
    axios.get.mockRejectedValueOnce(new Error('Offline / Remote'));

    const mockBlazerInventory = [
      {
        SKU: '0062620405',
        ArticleNo: 'BLZRW2408-AP24',
        ItemName: 'BLAZER - EX',
        ProductType: 'MENSWEAR-WN',
        Color: 'SKY',
        Size: '42',
        CurrentStock: 2,
        mrp: 5499
      }
    ];

    render(
      <GunScannerModal
        isOpen={true}
        onClose={vi.fn()}
        inventory={mockBlazerInventory}
        API_BASE=""
      />
    );

    const input = screen.getByPlaceholderText(/Pull trigger to scan barcode/i);
    fireEvent.change(input, { target: { value: '0062620405' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', target: { value: '0062620405' } });

    await waitFor(() => {
      expect(screen.getByText(/Add to Speed POS Cart/i)).toBeDefined();
    });

    expect(screen.getAllByText('BLAZER - EX').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BLZRW2408-AP24').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BLAZERS & JACKETS/i).length).toBeGreaterThan(0);

    // CRITICAL: Ensure it is NEVER identified as a trouser
    expect(screen.queryByText(/Fine Compact Cotton Trouser/i)).toBeNull();
    expect(screen.queryByText(/FLAT FRONT TROUSER/i)).toBeNull();
  });

  it('shows clear not found error when unknown barcode is scanned without fabricating a trouser', async () => {
    axios.get.mockRejectedValueOnce(new Error('Not Found'));

    render(
      <GunScannerModal
        isOpen={true}
        onClose={vi.fn()}
        inventory={[]}
        API_BASE=""
      />
    );

    const input = screen.getByPlaceholderText(/Pull trigger to scan barcode/i);
    fireEvent.change(input, { target: { value: '9999999999' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', target: { value: '9999999999' } });

    await waitFor(() => {
      expect(screen.getByText(/Scan Result Error/i)).toBeDefined();
      expect(screen.getByText(/No article or SKU matches/i)).toBeDefined();
    });

    // Ensure it NEVER hallucinates a trouser for unknown barcodes
    expect(screen.queryByText(/Fine Compact Cotton Trouser/i)).toBeNull();
    expect(screen.queryByText(/TROUSERS/i)).toBeNull();
  });

  it('renders Customer Fit Context and highlights customer size in matrix grid', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/inventory/quick-scan')) {
        return Promise.resolve({
          data: {
            success: true,
            articleNo: 'TSBW',
            itemName: 'Executive Oxford Shirt',
            sectionName: 'SHIRTS',
            subSectionName: 'FORMAL FULL SL',
            color: 'WHITE',
            mrp: 1999,
            totalStock: 15,
            soldToday: 1,
            soldLast7Days: 5,
            soldLast30Days: 18,
            colors: [
              {
                color: 'WHITE',
                totalStock: 15,
                sizes: [
                  { size: '38', stock: 4, barcode: 'TSBW-38' },
                  { size: '40', stock: 6, barcode: 'TSBW-40' },
                  { size: '42', stock: 5, barcode: 'TSBW-42' }
                ]
              }
            ],
            variants: [
              { barcode: 'TSBW-40', articleNo: 'TSBW', itemName: 'Executive Oxford Shirt', color: 'WHITE', size: '40', mrp: 1999, stock: 6 }
            ]
          }
        });
      }
      return Promise.resolve({ data: { success: true } });
    });

    render(
      <GunScannerModal
        isOpen={true}
        onClose={vi.fn()}
        customerPhone="9812044810"
        customerFitProfile={{
          summaryText: '👔 Shirt: 40 | 👖 Trouser: 32',
          hasHistory: true,
          categories: {
            shirts: { label: 'Shirts', icon: '👔', primarySize: '40', confidence: 'High' }
          }
        }}
        API_BASE="http://localhost:5000"
      />
    );

    const input = screen.getByPlaceholderText(/Pull trigger to scan barcode/i);
    fireEvent.change(input, { target: { value: 'TSBW' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', target: { value: 'TSBW' } });

    await waitFor(() => {
      expect(screen.getByText(/Customer Fit Target:/i)).toBeDefined();
      expect(screen.getAllByText(/👑 Fit/i).length).toBeGreaterThan(0);
    });
  });
});
