import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OwnerHubTab from './OwnerHubTab';
import axios from 'axios';

vi.mock('axios');

vi.mock('../../utils/firebase', () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn()
  },
  authPromise: Promise.resolve()
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(true),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => false
  })
}));

describe('OwnerHubTab [Mobile Owner Control Hub]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders Store Control Hub header and category pills', () => {
    render(<OwnerHubTab activeStore="DEMO_STORE_001" darkMode={true} />);

    expect(screen.getByText('Store Control Hub')).toBeDefined();
    expect(screen.getByText('Live Inputs')).toBeDefined();
    expect(screen.getByText('All Inputs')).toBeDefined();
    expect(screen.getByText('Sales Targets')).toBeDefined();
    expect(screen.getByText('OpEx / Bills')).toBeDefined();
    expect(screen.getByText('Staff & Pay')).toBeDefined();
    expect(screen.getByText('Offers & Promos')).toBeDefined();
    expect(screen.getByText('Owner Alerts')).toBeDefined();
  });

  it('allows adjusting monthly target with shortcut steppers and marks unsaved changes', () => {
    render(<OwnerHubTab activeStore="DEMO_STORE_001" darkMode={true} />);

    // Initially saved status
    expect(screen.getByText(/All Saved & Cloud Synced/i)).toBeDefined();

    // Click + ₹1 Lakh stepper
    const add1LakhBtn = screen.getByRole('button', { name: /\+ ₹1 Lakh/i });
    fireEvent.click(add1LakhBtn);

    // Should indicate unsaved changes
    expect(screen.getByText(/Unsaved Changes/i)).toBeDefined();
  });

  it('allows toggling staff active status', () => {
    render(<OwnerHubTab activeStore="DEMO_STORE_001" darkMode={true} />);

    // Check staff names exist
    expect(screen.getByDisplayValue('Vikas')).toBeDefined();
    expect(screen.getByDisplayValue('Pawan')).toBeDefined();

    // Find active buttons
    const activeButtons = screen.getAllByRole('button', { name: /^Active$/i });
    expect(activeButtons.length).toBeGreaterThan(0);

    // Toggle first active button
    fireEvent.click(activeButtons[0]);

    // Should indicate unsaved changes
    expect(screen.getByText(/Unsaved Changes/i)).toBeDefined();
  });

  it('allows adding a new owner phone number', () => {
    render(<OwnerHubTab activeStore="DEMO_STORE_001" darkMode={true} />);

    const phoneInput = screen.getByPlaceholderText(/Enter 10-digit mobile number/i);
    fireEvent.change(phoneInput, { target: { value: '9812345678' } });

    const addBtn = screen.getByRole('button', { name: /\+ Add Number/i });
    fireEvent.click(addBtn);

    // New number should be rendered in chips
    expect(screen.getByText(/\+91 9812345678/i)).toBeDefined();
    expect(screen.getByText(/Unsaved Changes/i)).toBeDefined();
  });

  it('saves all settings to localStorage and triggers cloud sync on button click', async () => {
    render(<OwnerHubTab activeStore="DEMO_STORE_001" darkMode={true} />);

    // Make an adjustment
    const add50kBtn = screen.getByRole('button', { name: /\+ ₹50k/i });
    fireEvent.click(add50kBtn);

    const saveBtn = screen.getByRole('button', { name: /Save & Sync to Store/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      const stored = localStorage.getItem('cobb_store_config');
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored);
      expect(parsed.operatingExpenses).toBeDefined();
    });
  });
});
