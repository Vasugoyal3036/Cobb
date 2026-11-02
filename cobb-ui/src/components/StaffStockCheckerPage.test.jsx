import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StaffStockCheckerPage from './StaffStockCheckerPage';
import axios from 'axios';

vi.mock('axios');
vi.mock('../utils/sound', () => ({
  playSound: vi.fn(),
  playBarcodeBeep: vi.fn(),
  playScanErrorBeep: vi.fn(),
  getSoundSettings: vi.fn(() => ({ soundEnabled: true, voiceEnabled: true })),
  saveSoundSettings: vi.fn()
}));

vi.mock('../utils/tagScannerEngine', () => ({
  isNativeBarcodeDetectorSupported: vi.fn(() => true),
  getNativeBarcodeDetector: vi.fn(() => ({
    detect: vi.fn().mockResolvedValue([])
  })),
  recognizeNumbersFromVideo: vi.fn().mockResolvedValue({ type: 'barcode', value: '0080727340' }),
  terminateOcrWorker: vi.fn().mockResolvedValue()
}));

vi.mock('html5-qrcode', () => {
  return {
    Html5Qrcode: vi.fn().mockImplementation(() => ({
      start: vi.fn().mockResolvedValue(true),
      stop: vi.fn().mockResolvedValue(true),
      clear: vi.fn().mockResolvedValue(true),
      isScanning: false,
      getRunningTrackCameraCapabilities: vi.fn(() => ({
        torchFeature: () => ({ isSupported: () => true })
      }))
    })),
    Html5QrcodeSupportedFormats: {
      CODE_128: 'CODE_128',
      EAN_13: 'EAN_13',
      EAN_8: 'EAN_8',
      CODE_39: 'CODE_39',
      UPC_A: 'UPC_A',
      UPC_E: 'UPC_E',
      QR_CODE: 'QR_CODE'
    }
  };
});

describe('StaffStockCheckerPage [Floor Mobile Stock Checker]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mobile staff header, camera scan button and search input', () => {
    render(<StaffStockCheckerPage onClose={vi.fn()} />);

    expect(screen.getByText(/COBB STAFF/i)).toBeDefined();
    expect(screen.getByText(/Stock Checker/i)).toBeDefined();
    expect(screen.getByText(/Camera Scanner/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Enter barcode or article no/i)).toBeDefined();
  });

  it('performs lookup and displays all colors and sizes in that article', async () => {
    const mockData = {
      success: true,
      articleNo: 'FSRE4214',
      itemName: 'SHIRTS FULL SL',
      sectionName: 'MENSWEAR',
      subSectionName: 'SHIRTS FULL SL',
      mrp: 2699,
      totalStock: 12,
      matchedColor: 'NAVY BLUE',
      colors: [
        {
          color: 'NAVY BLUE',
          totalStock: 7,
          sizes: [
            { size: '38', stock: 2, barcode: '8901001' },
            { size: '40', stock: 4, barcode: '8901002' },
            { size: '42', stock: 1, barcode: '8901003' }
          ]
        },
        {
          color: 'BLACK',
          totalStock: 5,
          sizes: [
            { size: '38', stock: 1, barcode: '8902001' },
            { size: '40', stock: 3, barcode: '8902002' },
            { size: '42', stock: 1, barcode: '8902003' }
          ]
        }
      ]
    };

    axios.get.mockResolvedValueOnce({ data: mockData });

    render(<StaffStockCheckerPage onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Enter barcode or article no/i);
    fireEvent.change(input, { target: { value: 'FSRE4214' } });

    const findBtn = screen.getByRole('button', { name: /find/i });
    fireEvent.click(findBtn);

    await waitFor(() => {
      expect(screen.getAllByText('FSRE4214').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/12 In Stock/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText('NAVY BLUE').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BLACK').length).toBeGreaterThan(0);
      expect(screen.getByText('₹2,699')).toBeDefined();
    });

    // Check size list rows ("38 size  2 available") for grouped colors
    expect(screen.getAllByText(/38 size/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/40 size/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/42 size/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/available/i).length).toBeGreaterThan(0);
  });

  it('allows switching colors to view sizes for that color', async () => {
    const mockData = {
      success: true,
      articleNo: 'CS-900',
      itemName: 'COTTON SLIM FIT SHIRT',
      mrp: 1999,
      totalStock: 8,
      matchedColor: 'WHITE',
      colors: [
        {
          color: 'WHITE',
          totalStock: 5,
          sizes: [{ size: '40', stock: 5, barcode: '890999' }]
        },
        {
          color: 'OLIVE',
          totalStock: 3,
          sizes: [{ size: '42', stock: 3, barcode: '890888' }]
        }
      ]
    };

    axios.get.mockResolvedValueOnce({ data: mockData });

    render(<StaffStockCheckerPage onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Enter barcode or article no/i);
    fireEvent.change(input, { target: { value: 'CS-900' } });
    fireEvent.click(screen.getByRole('button', { name: /find/i }));

    await waitFor(() => {
      expect(screen.getAllByText('CS-900').length).toBeGreaterThan(0);
    });

    // Click on OLIVE color chip
    const oliveBtn = screen.getByRole('button', { name: /OLIVE/i });
    fireEvent.click(oliveBtn);

    await waitFor(() => {
      expect(screen.getAllByText('OLIVE').length).toBeGreaterThan(0);
      expect(screen.getByText(/42 size/i)).toBeDefined();
      expect(screen.getAllByText(/3 available/i).length).toBeGreaterThan(0);
    });
  });

  it('shows error banner when article is not found', async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: false, message: 'No Cobb article found matching "XYZ999"' }
    });

    render(<StaffStockCheckerPage onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Enter barcode or article no/i);
    fireEvent.change(input, { target: { value: 'XYZ999' } });
    fireEvent.click(screen.getByRole('button', { name: /find/i }));

    await waitFor(() => {
      expect(screen.getByText(/Article \/ Barcode Not Found/i)).toBeDefined();
      expect(screen.getByText(/No Cobb article found matching "XYZ999"/i)).toBeDefined();
    });
  });

  it('renders shortcut button and opens home screen install guide when clicked', () => {
    render(<StaffStockCheckerPage onClose={vi.fn()} />);

    const shortcutBtns = screen.getAllByRole('button', { name: /shortcut/i });
    expect(shortcutBtns.length).toBeGreaterThan(0);

    fireEvent.click(shortcutBtns[0]);

    expect(screen.getByText(/Add Stock Checker to Home Screen/i)).toBeDefined();
    expect(screen.getByText(/https:\/\/cobb-store.web.app\/#stock/i)).toBeDefined();
    expect(screen.getByText(/Google Chrome \(Android\)/i)).toBeDefined();
  });
});
