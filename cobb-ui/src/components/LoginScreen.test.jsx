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
      currentUser: null,
    });
  });

  it('renders all essential login elements', () => {
    render(<LoginScreen onSetup={mockOnSetup} />);

    expect(screen.getByText('ORS')).toBeDefined();
    expect(screen.getByPlaceholderText('admin')).toBeDefined();
    expect(screen.getByPlaceholderText('••••••••')).toBeDefined();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
    expect(screen.getByText(/first time setup\? run the wizard/i)).toBeDefined();
  });

  it('updates form inputs when user types', () => {
    render(<LoginScreen onSetup={mockOnSetup} />);

    const usernameInput = screen.getByPlaceholderText('admin');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(usernameInput, { target: { value: 'store_owner' } });
    fireEvent.change(passwordInput, { target: { value: 'secretpass' } });

    expect(usernameInput.value).toBe('store_owner');
    expect(passwordInput.value).toBe('secretpass');
  });

  it('submits credentials to auth context upon clicking Sign In', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });

    render(<LoginScreen onSetup={mockOnSetup} />);

    fireEvent.change(screen.getByPlaceholderText('admin'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'admin123' } });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'admin123');
    });
  });

  it('displays error banner when authentication fails', async () => {
    mockLogin.mockResolvedValueOnce({ success: false, message: 'Invalid credentials provided' });

    render(<LoginScreen onSetup={mockOnSetup} />);

    fireEvent.change(screen.getByPlaceholderText('admin'), { target: { value: 'wronguser' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials provided')).toBeDefined();
    });
  });

  it('invokes onSetup callback when wizard button is clicked', () => {
    render(<LoginScreen onSetup={mockOnSetup} />);

    const setupBtn = screen.getByText(/first time setup\? run the wizard/i);
    fireEvent.click(setupBtn);

    expect(mockOnSetup).toHaveBeenCalledTimes(1);
  });
});
