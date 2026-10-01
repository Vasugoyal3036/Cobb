import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SetupScreen from './SetupScreen';

describe('Frontend Component Test: SetupScreen Wizard', () => {
  it('renders Step 1 (Database Connection) initially', () => {
    render(<SetupScreen onComplete={vi.fn()} />);

    expect(screen.getByText('Welcome to Cobb CRM')).toBeDefined();
    expect(screen.getByText('Database Connection')).toBeDefined();
    expect(screen.getByRole('button', { name: /continue/i })).toBeDefined();
  });

  it('steps through all wizard stages to Step 3 and finishes', async () => {
    vi.useFakeTimers();
    const mockComplete = vi.fn();
    render(<SetupScreen onComplete={mockComplete} />);

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('Create Owner Account')).toBeDefined();
    expect(screen.getByPlaceholderText('Full Name')).toBeDefined();

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('Store Details')).toBeDefined();
    expect(screen.getByPlaceholderText('Store Name')).toBeDefined();

    // In step 3, the button becomes 'Complete Setup'
    const completeBtn = screen.getByRole('button', { name: /complete setup/i });
    expect(completeBtn).toBeDefined();

    await React.act(async () => {
      fireEvent.click(completeBtn);
      vi.advanceTimersByTime(2000);
    });

    expect(mockComplete).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
