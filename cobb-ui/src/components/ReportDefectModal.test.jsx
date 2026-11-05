import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportDefectModal from './ReportDefectModal';
import axios from 'axios';
import * as thermalPrinter from '../utils/thermalTagPrinter';

vi.mock('axios');
vi.mock('../utils/firebase', () => ({
  db: null
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn()
}));
vi.mock('../utils/thermalTagPrinter', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateBarcodeSvg: vi.fn(() => '<svg data-testid="mock-barcode-svg"></svg>'),
    triggerDamageSlipPrint: vi.fn(() => true)
  };
});

describe('ReportDefectModal - Garment Defect & Damage Quarantine', () => {
  const mockArticle = {
    barcode: '0082107519',
    articleNo: 'FSRF2602CR',
    itemName: 'SHIRTS FULL SL',
    category: 'MENSWEAR',
    size: '40',
    color: 'NAVY',
    mrp: 2799
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ReportDefectModal isOpen={false} initialArticle={mockArticle} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders defect modal with pre-filled barcode, article details, and defect options', () => {
    render(
      <ReportDefectModal isOpen={true} initialArticle={mockArticle} onClose={vi.fn()} />
    );

    expect(screen.getByText(/Report Defective \/ Damaged Garment/i)).toBeDefined();
    expect(screen.getByDisplayValue('0082107519')).toBeDefined();
    expect(screen.getByText('FSRF2602CR')).toBeDefined();
    expect(screen.getAllByText(/Zipper \/ Runner Break/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Stitch Tear \/ Seam Open/i)).toBeDefined();
    expect(screen.getByText(/Fabric Stain \/ Spot/i)).toBeDefined();
    expect(screen.getByText(/Missing Button \/ Snap/i)).toBeDefined();
  });

  it('allows selecting a defect reason and toggling routing plan', () => {
    render(
      <ReportDefectModal isOpen={true} initialArticle={mockArticle} onClose={vi.fn()} />
    );

    // Select Stain
    const stainBtn = screen.getByRole('button', { name: /Fabric Stain \/ Spot/i });
    fireEvent.click(stainBtn);

    // Switch to Store Tailor Repair
    const tailorBtn = screen.getByRole('button', { name: /Store Tailor Repair/i });
    fireEvent.click(tailorBtn);

    expect(tailorBtn.className).toContain('bg-amber-500');
  });

  it('submits quarantine report to API and calls onQuarantineSuccess', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        damage: {
          id: 'dmg_123',
          barcode: '0082107519',
          articleNo: 'FSRF2602CR',
          defectType: 'STITCH_TEAR',
          status: 'quarantine'
        }
      }
    });

    const onQuarantineSuccess = vi.fn();
    render(
      <ReportDefectModal
        isOpen={true}
        initialArticle={mockArticle}
        onClose={vi.fn()}
        onQuarantineSuccess={onQuarantineSuccess}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Quarantine & Save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:5000/api/damages/report',
        expect.objectContaining({
          barcode: '0082107519',
          articleNo: 'FSRF2602CR'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-user-role': 'staff'
          })
        })
      );
      expect(thermalPrinter.triggerDamageSlipPrint).toHaveBeenCalled();
      expect(onQuarantineSuccess).toHaveBeenCalled();
    });
  });
});
