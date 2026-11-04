import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ThermalTagModal from './ThermalTagModal';
import * as thermalPrinter from '../utils/thermalTagPrinter';

vi.mock('../utils/thermalTagPrinter', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateBarcodeSvg: vi.fn(() => '<svg data-testid="mock-barcode-svg"></svg>'),
    triggerThermalTagPrint: vi.fn(() => true)
  };
});

describe('ThermalTagModal - Replacement Garment Price Tag Printer (Category + MRP Format)', () => {
  const mockTag = {
    barcode: '0082107519',
    articleNo: 'FSRF2602CR',
    articleName: 'SHIRTS FULL SL',
    category: 'SHIRTS FULL SL',
    size: '36 (92 CM.)',
    color: 'MIX',
    section: 'MENSWEAR',
    mrp: 1799,
    promo: 'BUY 1 GET 2 FREE'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<ThermalTagModal isOpen={false} tagData={mockTag} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Thermal Garment Tag Studio with Cobb brand, Category + MRP format, and barcode', () => {
    render(<ThermalTagModal isOpen={true} tagData={mockTag} onClose={vi.fn()} />);

    expect(screen.getByText('Thermal Garment Tag Studio')).toBeDefined();
    expect(screen.getByText('Category + MRP Format')).toBeDefined();
    expect(screen.getAllByText(/COBB APPARELS/i).length).toBeGreaterThan(0);
    expect(screen.getByText('₹1,799')).toBeDefined();
  });

  it('allows quick selection of Category and MRP chips', () => {
    render(<ThermalTagModal isOpen={true} initialMode="quick" onClose={vi.fn()} />);

    // Click DENIM / JEANS category chip
    const denimBtn = screen.getByRole('button', { name: /DENIM \/ JEANS/i });
    fireEvent.click(denimBtn);

    // Live preview category should update to DENIM / JEANS
    expect(screen.getAllByText(/DENIM \/ JEANS/i).length).toBeGreaterThan(0);

    // Select MRP 3199
    const mrp3199Btn = screen.getByRole('button', { name: '₹3199' });
    fireEvent.click(mrp3199Btn);

    expect(screen.getByText('₹3,199')).toBeDefined();
  });

  it('switches between 58mm and 80mm roll presets', () => {
    render(<ThermalTagModal isOpen={true} tagData={mockTag} onClose={vi.fn()} />);

    const btn80mm = screen.getByRole('button', { name: /80mm POS/i });
    fireEvent.click(btn80mm);

    expect(screen.getByRole('button', { name: /Print 80mm Tag/i })).toBeDefined();

    const btn58mm = screen.getByRole('button', { name: /58mm Roll/i });
    fireEvent.click(btn58mm);

    expect(screen.getByRole('button', { name: /Print 58mm Tag/i })).toBeDefined();
  });

  it('switches to Custom / Scanned Tag mode and updates fields', () => {
    render(<ThermalTagModal isOpen={true} tagData={mockTag} onClose={vi.fn()} />);

    const detailedTab = screen.getByRole('button', { name: /Custom \/ Scanned Tag/i });
    fireEvent.click(detailedTab);

    // Edit size in detailed mode
    const sizeInput = screen.getByDisplayValue('36 (92 CM.)');
    fireEvent.change(sizeInput, { target: { value: '42 (105 CM.)' } });

    // Live preview size badge should update
    expect(screen.getByText(/SIZE: 42 \(105 CM\.\)/i)).toBeDefined();
  });

  it('calls triggerThermalTagPrint with paperSize and copies when print button is clicked', () => {
    const onPrintSuccess = vi.fn();
    render(
      <ThermalTagModal
        isOpen={true}
        tagData={mockTag}
        onClose={vi.fn()}
        onPrintSuccess={onPrintSuccess}
      />
    );

    const printBtn = screen.getByRole('button', { name: /Print 58mm Tag/i });
    fireEvent.click(printBtn);

    expect(thermalPrinter.triggerThermalTagPrint).toHaveBeenCalledWith(
      expect.objectContaining({
        barcode: expect.any(String),
        mrp: expect.any(Number)
      }),
      expect.objectContaining({
        paperSize: '58mm',
        copies: 1
      })
    );
    expect(onPrintSuccess).toHaveBeenCalled();
  });
});
