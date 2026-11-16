import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CurtainWipe from './CurtainWipe';
import FabricConstellation from './FabricConstellation';

vi.mock('../utils/sound', () => ({
  playCheckoutChime: vi.fn(),
  playSound: vi.fn(),
}));

describe('Frontend Component Tests: LoginScreen Animations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders FabricConstellation canvas gracefully without throwing', () => {
    const { container } = render(<FabricConstellation />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeDefined();
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
  });

  it('mounts CurtainWipe closed, then opens and triggers onComplete', () => {
    const mockOnComplete = vi.fn();
    render(<CurtainWipe onComplete={mockOnComplete} />);

    // Initially contains the seal and authenticated message
    expect(screen.getByText('AUTHENTICATED')).toBeDefined();
    expect(screen.getByText('COBB SHOWROOM')).toBeDefined();
    expect(screen.getByText('ENTERING COMMAND CENTER')).toBeDefined();

    // Fast-forward past open delay (40ms) and finish timer (850ms)
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });
});
