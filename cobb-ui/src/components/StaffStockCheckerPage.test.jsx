import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StaffStockCheckerPage from './StaffStockCheckerPage';
import axios from 'axios';

vi.mock('axios');

vi.mock('../utils/firebase', () => ({
  db: null,
  authPromise: Promise.resolve()
}));
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
    expect(screen.getAllByText(/Stock Checker/i).length).toBeGreaterThanOrEqual(1);
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

  it('combines duplicate sizes and filters out sold items (stock 0)', async () => {
    const mockData = {
      success: true,
      articleNo: 'JEANS-01',
      itemName: 'DENIM JEANS',
      mrp: 2999,
      totalStock: 3,
      matchedColor: 'BEIGE',
      colors: [
        {
          color: 'BEIGE',
          totalStock: 3,
          sizes: [
            { size: '32', stock: 0, barcode: 'BC-001' },
            { size: '32', stock: 0, barcode: 'BC-002' },
            { size: '32', stock: 1, barcode: 'BC-003' },
            { size: '32', stock: 1, barcode: 'BC-004' },
            { size: '32', stock: 1, barcode: 'BC-005' },
            { size: '34', stock: 0, barcode: 'BC-006' }
          ]
        }
      ]
    };

    axios.get.mockResolvedValueOnce({ data: mockData });

    render(<StaffStockCheckerPage onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Enter barcode or article no/i);
    fireEvent.change(input, { target: { value: 'JEANS-01' } });
    fireEvent.click(screen.getByRole('button', { name: /find/i }));

    await waitFor(() => {
      // 32 size should appear only ONCE in the list, combined with 3 available!
      expect(screen.getAllByText(/32 size/i).length).toBe(1);
      expect(screen.getAllByText(/3 available/i).length).toBeGreaterThan(0);
      // Sold size 34 should be completely filtered out!
      expect(screen.queryByText(/34 size/i)).toBeNull();
      // 0 available should not be shown!
      expect(screen.queryByText(/0 available/i)).toBeNull();
    });
  });

  it('displays instant offer breakdown with Buy 1 Get 2, Flat 50% and Flat 60% net prices', async () => {
    const mockData = {
      success: true,
      articleNo: 'SHIRT-777',
      itemName: 'SLIM FIT SHIRT',
      mrp: 3000,
      totalStock: 5,
      matchedColor: 'BLUE',
      colors: [
        {
          color: 'BLUE',
          totalStock: 5,
          sizes: [{ size: '40', stock: 5, barcode: 'B-777' }]
        }
      ]
    };

    axios.get.mockResolvedValueOnce({ data: mockData });

    render(<StaffStockCheckerPage onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Enter barcode or article no/i);
    fireEvent.change(input, { target: { value: 'SHIRT-777' } });
    fireEvent.click(screen.getByRole('button', { name: /find/i }));

    await waitFor(() => {
      // MRP ₹3,000
      expect(screen.getByText('₹3,000')).toBeDefined();
      // Buy 1 Get 2 Free: ₹3,000 / 3 = ₹1,000 /pc net
      expect(screen.getByText(/Buy 1 Get 2/i)).toBeDefined();
      expect(screen.getByText('₹1,000')).toBeDefined();
      // Flat 50% Off: ₹3,000 * 0.5 = ₹1,500 net price
      expect(screen.getByText(/Flat 50% Off/i)).toBeDefined();
      expect(screen.getByText('₹1,500')).toBeDefined();
      // Flat 60% Off: ₹3,000 * 0.4 = ₹1,200 net price
      expect(screen.getByText(/Flat 60% Off/i)).toBeDefined();
      expect(screen.getByText('₹1,200')).toBeDefined();
    });
  });

  it('filters colours by selected size when 1-tap size chip is tapped', async () => {
    const mockData = {
      success: true,
      articleNo: 'POLO-55',
      itemName: 'COTTON POLO',
      mrp: 1999,
      totalStock: 6,
      colors: [
        {
          color: 'NAVY',
          totalStock: 4,
          sizes: [
            { size: 'M', stock: 2, barcode: 'N-M' },
            { size: 'L', stock: 2, barcode: 'N-L' }
          ]
        },
        {
          color: 'BLACK',
          totalStock: 2,
          sizes: [
            { size: 'M', stock: 2, barcode: 'B-M' }
            // No L in Black!
          ]
        }
      ]
    };

    axios.get.mockResolvedValueOnce({ data: mockData });

    render(<StaffStockCheckerPage onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Enter barcode or article no/i);
    fireEvent.change(input, { target: { value: 'POLO-55' } });
    fireEvent.click(screen.getByRole('button', { name: /find/i }));

    await waitFor(() => {
      expect(screen.getAllByText('POLO-55').length).toBeGreaterThan(0);
    });

    // Both Navy and Black are initially visible
    expect(screen.getAllByText('NAVY').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BLACK').length).toBeGreaterThan(0);

    // Tap on size 'L' chip (only Navy has L!)
    const sizeLBtn = screen.getByRole('button', { name: /^L/i });
    fireEvent.click(sizeLBtn);

    await waitFor(() => {
      // Navy has L, so it stays visible as a color card
      expect(screen.getByRole('heading', { name: /NAVY/i })).toBeDefined();
      expect(screen.getByText(/^L size$/)).toBeDefined();
      // Black has NO L, so its card is filtered out!
      expect(screen.queryByRole('heading', { name: /BLACK/i })).toBeNull();
    });
  });

  it('displays pending tag indicator on size when a size has pending tags', async () => {
    const mockData = {
      success: true,
      articleNo: 'JKGC2705',
      itemName: 'JACKET H/S - EX',
      mrp: 5199,
      totalStock: 3,
      hasPendingTags: true,
      totalPendingTags: 1,
      pendingTagsList: [
        {
          id: 'ptag_001',
          barcode: '0080094858',
          articleNo: 'JKGC2705',
          color: 'OLIVE',
          size: '44',
          notes: 'Tag torn at trial room',
          salesperson: 'Ramesh',
          createdAt: new Date().toISOString()
        }
      ],
      colors: [
        {
          color: 'OLIVE',
          totalStock: 3,
          pendingTagsCount: 1,
          hasPendingTags: true,
          sizes: [
            {
              size: '42',
              stock: 2,
              pendingTagsCount: 0,
              barcode: '0080094857'
            },
            {
              size: '44',
              stock: 1,
              pendingTagsCount: 1,
              hasPendingTag: true,
              pendingTagDetails: [
                {
                  id: 'ptag_001',
                  barcode: '0080094858',
                  size: '44',
                  color: 'OLIVE',
                  notes: 'Tag torn at trial room'
                }
              ],
              barcode: '0080094858'
            }
          ]
        }
      ]
    };

    axios.get.mockResolvedValueOnce({ data: mockData });

    render(<StaffStockCheckerPage onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Enter barcode or article no/i);
    fireEvent.change(input, { target: { value: 'JKGC2705' } });
    fireEvent.click(screen.getByRole('button', { name: /find/i }));

    await waitFor(() => {
      // Top summary badge indicates 1 in Pending Tags
      expect(screen.getAllByText(/1 in Pending Tags/i).length).toBeGreaterThan(0);
      // Size 44 shows pending tag badge button
      expect(screen.getByRole('button', { name: /^1 in Pending Tag$/i })).toBeDefined();
    });

    // Clicking pending tag badge opens detailed size modal
    const pendingChip = screen.getByRole('button', { name: /^1 in Pending Tag$/i });
    fireEvent.click(pendingChip);

    await waitFor(() => {
      expect(screen.getByText(/Pending Tag Size Details/i)).toBeDefined();
      expect(screen.getByText(/Tag torn at trial room/i)).toBeDefined();
    });
  });

  it('allows floor staff to open Add Pending Tag modal and submit', async () => {
    const mockData = {
      success: true,
      articleNo: 'BLZ-500',
      itemName: 'EXECUTIVE BLAZER',
      mrp: 6999,
      totalStock: 2,
      colors: [
        {
          color: 'BLACK',
          totalStock: 2,
          sizes: [{ size: '40', stock: 2, barcode: 'BLZ-40-BC' }]
        }
      ]
    };

    axios.get.mockResolvedValue({ data: mockData });
    axios.post.mockResolvedValueOnce({ data: { success: true, id: 'ptag_new_123' } });

    render(<StaffStockCheckerPage onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Enter barcode or article no/i);
    fireEvent.change(input, { target: { value: 'BLZ-500' } });
    fireEvent.click(screen.getByRole('button', { name: /find/i }));

    await waitFor(() => {
      expect(screen.getByText(/Add Pending Tag/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Add Pending Tag/i));

    await waitFor(() => {
      expect(screen.getByText(/Report Pending \/ Missing Tag/i)).toBeDefined();
    });

    const submitBtn = screen.getByRole('button', { name: /Register Pending Tag/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });

  it('switches to Daily Chai tab and displays salesman tea logging interface', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        record: {
          date: new Date().toISOString().split('T')[0],
          ratePerCup: 10,
          totalCups: 0,
          totalAmount: 0,
          salesmen: {
            Vikas: { name: 'Vikas', cups: 0, amount: 0 },
            Pawan: { name: 'Pawan', cups: 0, amount: 0 },
            Simran: { name: 'Simran', cups: 0, amount: 0 },
            Akhil: { name: 'Akhil', cups: 0, amount: 0 }
          },
          logs: []
        }
      }
    });

    render(<StaffStockCheckerPage API_BASE="http://localhost:5000" onClose={vi.fn()} />);

    // Click on Daily Chai (Tea) tab
    const teaTab = screen.getByRole('button', { name: /Daily Chai/i });
    fireEvent.click(teaTab);

    expect(screen.getByText(/Salesman Tea \(Chai\) Log/i)).toBeDefined();
    expect(screen.getAllByText(/Vikas/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Pawan/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Simran/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /\+1 Chai ☕/i })).toBeDefined();
  });

  it('allows salesman to switch their active name and log tea', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        record: {
          date: new Date().toISOString().split('T')[0],
          ratePerCup: 10,
          totalCups: 0,
          totalAmount: 0,
          salesmen: {
            Vikas: { name: 'Vikas', cups: 0, amount: 0 },
            Pawan: { name: 'Pawan', cups: 0, amount: 0 },
            Simran: { name: 'Simran', cups: 0, amount: 0 },
            Akhil: { name: 'Akhil', cups: 0, amount: 0 }
          },
          logs: []
        }
      }
    });

    axios.post.mockResolvedValue({
      data: {
        success: true,
        record: {
          date: new Date().toISOString().split('T')[0],
          ratePerCup: 10,
          totalCups: 1,
          totalAmount: 10,
          salesmen: {
            Vikas: { name: 'Vikas', cups: 0, amount: 0 },
            Pawan: { name: 'Pawan', cups: 1, amount: 10, lastLogged: new Date().toISOString() },
            Simran: { name: 'Simran', cups: 0, amount: 0 },
            Akhil: { name: 'Akhil', cups: 0, amount: 0 }
          },
          logs: [
            {
              id: 'tea_test_1',
              salesman: 'Pawan',
              cupsAdded: 1,
              totalCupsForDay: 1,
              ratePerCup: 10,
              amount: 10,
              time: '12:00 PM',
              timestamp: new Date().toISOString(),
              note: 'Tea Break (+1)'
            }
          ]
        }
      }
    });

    render(<StaffStockCheckerPage API_BASE="http://localhost:5000" onClose={vi.fn()} />);

    // Switch to Chai tab
    fireEvent.click(screen.getByRole('button', { name: /Daily Chai/i }));

    // Select Pawan
    const pawanBtns = screen.getAllByText(/Pawan/i);
    fireEvent.click(pawanBtns[0]);

    // Click +1 Chai
    const plusChaiBtn = screen.getByRole('button', { name: /\+1 Chai ☕/i });
    fireEvent.click(plusChaiBtn);

    await waitFor(() => {
      expect(screen.getByText(/Logged \+1 tea for Pawan!/i)).toBeDefined();
    });
  });
});
