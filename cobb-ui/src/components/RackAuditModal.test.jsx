import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RackAuditModal, { getColorDot } from './RackAuditModal';
import axios from 'axios';

vi.mock('axios');
vi.mock('../utils/sound', () => ({
  playBarcodeBeep: vi.fn(),
  playScanErrorBeep: vi.fn(),
  playCheckoutChime: vi.fn(),
  getSoundSettings: vi.fn(() => ({ soundEnabled: true, voiceEnabled: true })),
  saveSoundSettings: vi.fn()
}));

describe('RackAuditModal - Physical Rack Inventory Audit / Cycle Count', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/inventory/rack-audit/sections')) {
        return Promise.resolve({
          data: {
            success: true,
            sections: ['MENSWEAR', 'ACCESSORIES'],
            categories: [
              { section: 'MENSWEAR', subSection: 'SHIRTS FULL SL', totalStock: 48 },
              { section: 'MENSWEAR', subSection: 'DENIM', totalStock: 50 }
            ],
            presets: [
              { id: 'bay_formal_shirts', name: "Men's Formal Shirts - Section A", section: 'MENSWEAR', subSection: 'SHIRTS FULL SL' }
            ]
          }
        });
      }
      if (url.includes('/api/inventory/rack-audit/expected')) {
        return Promise.resolve({
          data: {
            success: true,
            section: 'MENSWEAR',
            subSection: 'SHIRTS FULL SL',
            totalPcs: 3,
            items: [
              { barcode: '0082296848', articleNo: 'FSRF1', itemName: 'Formal Shirt', color: 'White', size: '40', mrp: 2199, expectedQty: 1 },
              { barcode: '0082296849', articleNo: 'FSRF2', itemName: 'Formal Shirt', color: 'Blue', size: '42', mrp: 2499, expectedQty: 1 },
              { barcode: '0082296850', articleNo: 'FSRF3', itemName: 'Formal Shirt', color: 'Black', size: '44', mrp: 2799, expectedQty: 1 }
            ]
          }
        });
      }
      if (url.includes('/api/inventory/rack-audit/lookup')) {
        return Promise.resolve({
          data: {
            success: true,
            barcode: '0099999999',
            articleNo: 'DNM01',
            itemName: 'Denim Jeans',
            sectionName: 'MENSWEAR',
            subSectionName: 'DENIM',
            color: 'Indigo',
            size: '32',
            mrp: 3199,
            stock: 1
          }
        });
      }
      return Promise.resolve({ data: { success: true } });
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <RackAuditModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders setup view with presets, bay name, and sections', async () => {
    render(
      <RackAuditModal isOpen={true} onClose={vi.fn()} API_BASE="http://localhost:5000" />
    );

    expect(screen.getByText(/RACK AUDIT & CYCLE COUNT/i)).toBeDefined();
    expect(screen.getByText(/Quick Showroom Bay Presets/i)).toBeDefined();
    expect(screen.getByText(/Launch Rapid Gun Scanner/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Men's Formal Shirts - Section A")).toBeDefined();
    });
  });

  it('launches rapid gun scanner and displays live tally cards', async () => {
    render(
      <RackAuditModal isOpen={true} onClose={vi.fn()} API_BASE="http://localhost:5000" />
    );

    const launchBtn = await screen.findByText(/Launch Rapid Gun Scanner/i);
    fireEvent.click(launchBtn);

    // Wait for audit mode to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/READY TO SCAN/i)).toBeDefined();
      expect(screen.getByText(/Expected System/i)).toBeDefined();
      expect(screen.getByText(/Physically Scanned/i)).toBeDefined();
      expect(screen.getAllByText(/Missing Garments/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Wrong Rack/i).length).toBeGreaterThan(0);
    });

    // Initial tally should show 3 expected, 0 scanned, 3 missing
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('processes scanned barcode and marks item as verified', async () => {
    render(
      <RackAuditModal isOpen={true} onClose={vi.fn()} API_BASE="http://localhost:5000" />
    );

    const launchBtn = await screen.findByText(/Launch Rapid Gun Scanner/i);
    fireEvent.click(launchBtn);

    const input = await screen.findByPlaceholderText(/READY TO SCAN/i);
    fireEvent.change(input, { target: { value: '0082296848' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/Matched Expected Rack Item/i)).toBeDefined();
    });
  });

  it('getColorDot helper returns valid hex color strings', () => {
    expect(getColorDot('black')).toBe('#0f172a');
    expect(getColorDot('navy blue')).toBe('#2563eb');
    expect(getColorDot('wine red')).toBe('#e11d48');
    expect(getColorDot('olive green')).toBe('#16a34a');
  });
});
