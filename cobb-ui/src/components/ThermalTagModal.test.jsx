import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ThermalTagModal from './ThermalTagModal';
import * as thermalPrinter from '../utils/thermalTagPrinter';

vi.mock('../utils/thermalTagPrinter', () => ({
  generateBarcodeSvg: vi.fn(() => '<svg data-testid="mock-barcode-svg"></svg>'),
  triggerThermalTagPrint: vi.fn(() => true)
}));

describe('ThermalTagModal - Replacement Garment Price Tag Printer', () => {
  const mockTag = {
    barcode: '0082107519',
    articleNo: 'FSRF2602CR',
    articleName: 'SHIRTS FULL SL',
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

  it('renders replacement garment tag with Cobb brand, barcode, size, and MRP', () => {
    render(<ThermalTagModal isOpen={true} tagData={mockTag} onClose={vi.fn()} />);

    expect(screen.getByText('Replacement Garment Tag')).toBeDefined();
    expect(screen.getAllByText(/COBB APPARELS/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/SIZE: 36 \(92 CM\.\)/i)).toBeDefined();
    expect(screen.getByText('₹1,799')).toBeDefined();
    expect(screen.getByText(/BUY 1 GET 2 FREE/i)).toBeDefined();
  });

  it('switches between 58mm and 80mm roll presets', () => {
    render(<ThermalTagModal isOpen={true} tagData={mockTag} onClose={vi.fn()} />);

    const btn80mm = screen.getByRole('button', { name: /80mm \(3-inch POS\)/i });
    fireEvent.click(btn80mm);

    expect(screen.getByRole('button', { name: /Print 80mm Tag/i })).toBeDefined();

    const btn58mm = screen.getByRole('button', { name: /58mm \(2-inch Roll\)/i });
    fireEvent.click(btn58mm);

    expect(screen.getByRole('button', { name: /Print 58mm Tag/i })).toBeDefined();
  });

  it('toggles edit mode and updates customized tag fields', () => {
    render(<ThermalTagModal isOpen={true} tagData={mockTag} onClose={vi.fn()} />);

    const editBtn = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editBtn);

    // Edit size
    const sizeInput = screen.getByDisplayValue('36 (92 CM.)');
    fireEvent.change(sizeInput, { target: { value: '40 (100 CM.)' } });

    // Live preview size badge should update
    expect(screen.getByText(/SIZE: 40 \(100 CM\.\)/i)).toBeDefined();
  });

  it('calls triggerThermalTagPrint when print button is clicked', () => {
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
        barcode: '0082107519',
        articleNo: 'FSRF2602CR'
      }),
      { paperSize: '58mm' }
    );
    expect(onPrintSuccess).toHaveBeenCalled();
  });
});

