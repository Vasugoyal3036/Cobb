import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginScreen from './LoginScreen';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('Frontend Component Test: LoginScreen', () => {
  const mockLogin = vi.fn();
  const mockOnSetup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      login: mockLogin,
      activeStore: 'DEMO_STORE_001',
      AVAILABLE_STORES: [
        { id: 'DEMO_STORE_001', name: 'Cobb Pundri (Main)', code: 'PUNDRI' }
      ]
    });
  });

  it('renders role selectors and Cobb store branding', () => {
    render(<LoginScreen onSetup={mockOnSetup} />);

    expect(screen.getByText('COBB STORE')).toBeDefined();
    expect(screen.getByText('CRM POS')).toBeDefined();
    expect(screen.getByText('Owner')).toBeDefined();
    expect(screen.getByText('Manager')).toBeDefined();
    expect(screen.getByText('Cashier')).toBeDefined();
  });

  it('switches roles when clicking role tabs', () => {
    render(<LoginScreen onSetup={mockOnSetup} />);

    const managerTab = screen.getByText('Manager');
    fireEvent.click(managerTab);

    expect(screen.getByText('Store Manager')).toBeDefined();
    expect(screen.getByText('Default PIN: 5678')).toBeDefined();
  });

  it('enters digits via numeric keypad and triggers login', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });

    render(<LoginScreen onSetup={mockOnSetup} />);

    // Click digits 1, 2, 3, 4
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(screen.getByText('4'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('owner', '1234', true);
    });
  });

  it('displays error banner when authentication fails', async () => {
    mockLogin.mockResolvedValueOnce({ success: false, message: 'Incorrect PIN for Parbhat Goyal.' });

    render(<LoginScreen onSetup={mockOnSetup} />);

    fireEvent.click(screen.getByText('9'));
    fireEvent.click(screen.getByText('9'));
    fireEvent.click(screen.getByText('9'));
    fireEvent.click(screen.getByText('9'));

    await waitFor(() => {
      expect(screen.getByText('Incorrect PIN for Parbhat Goyal.')).toBeDefined();
    });
  });

  it('invokes onSetup callback when wizard button is clicked', () => {
    render(<LoginScreen onSetup={mockOnSetup} />);

    const setupBtn = screen.getByText(/system diagnostics & setup wizard/i);
    fireEvent.click(setupBtn);

    expect(mockOnSetup).toHaveBeenCalledTimes(1);
  });
});
