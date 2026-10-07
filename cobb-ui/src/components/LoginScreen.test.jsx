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
      requestAccount: vi.fn(),
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
    expect(screen.getAllByText('Owner').length).toBeGreaterThan(0);
    expect(screen.getByText('Manager')).toBeDefined();
    expect(screen.getByText('Cashier')).toBeDefined();
  });

  it('switches roles when clicking role tabs', () => {
    render(<LoginScreen onSetup={mockOnSetup} />);

    const managerTab = screen.getByText('Manager');
    fireEvent.click(managerTab);

    expect(screen.getByText('Store Manager')).toBeDefined();
    expect(screen.getByText('Requires Username & Password')).toBeDefined();
  });

  it('enters credentials and triggers login', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });

    render(<LoginScreen onSetup={mockOnSetup} />);

    // Enter username and password
    fireEvent.change(screen.getByPlaceholderText(/Enter Owner ID/i), { target: { value: 'parbhat' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter Password/i), { target: { value: 'baboo2525' } });

    // Submit form
    fireEvent.click(screen.getByText('Login securely'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('owner', 'parbhat', 'baboo2525');
    });
  });

  it('displays error banner when authentication fails', async () => {
    mockLogin.mockResolvedValueOnce({ success: false, message: 'Incorrect credentials. Try again.' });

    render(<LoginScreen onSetup={mockOnSetup} />);

    fireEvent.change(screen.getByPlaceholderText(/Enter Owner ID/i), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter Password/i), { target: { value: 'wrong' } });
    
    fireEvent.click(screen.getByText('Login securely'));

    await waitFor(() => {
      expect(screen.getByText('Incorrect credentials. Try again.')).toBeDefined();
    });
  });

  it('invokes onSetup callback when wizard button is clicked', () => {
    render(<LoginScreen onSetup={mockOnSetup} />);

    const setupBtn = screen.getByText(/system diagnostics/i);
    fireEvent.click(setupBtn);

    expect(mockOnSetup).toHaveBeenCalledTimes(1);
  });
});
