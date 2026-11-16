import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CurtainWipe from './CurtainWipe';
import LoginUpwardAscent from './LoginUpwardAscent';
import LoginScreen from './LoginScreen';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('Frontend Component Tests: LoginScreen Animations, Curtain Wipe & Forward Prismatic Scatter', () => {
  const mockLogin = vi.fn();
  const mockOnSetup = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders pre-login intro sequence when initialSkipIntro is false', () => {
    render(<LoginScreen onSetup={mockOnSetup} initialSkipIntro={false} />);

    // Shows intro elements
    expect(screen.getByText(/Tap anywhere to skip/i)).toBeDefined();
    expect(screen.getAllByText(/Flying Colors Of Fashion/i).length).toBeGreaterThan(0);

    // Fast forward past the 3.8s intro timer + 1.2s dissolve
    act(() => {
      vi.advanceTimersByTime(5100);
    });

    // Login inputs and role selectors are now revealed
    expect(screen.getByText('COBB STORE')).toBeDefined();
    expect(screen.getByText('CRM POS')).toBeDefined();
    expect(screen.getAllByText('Owner').length).toBeGreaterThan(0);
    expect(screen.getByText('Manager')).toBeDefined();
    expect(screen.getByText('Cashier')).toBeDefined();
  });

  it('skips intro immediately when user clicks on screen', () => {
    render(<LoginScreen onSetup={mockOnSetup} initialSkipIntro={false} />);

    const skipHint = screen.getByText(/Tap anywhere to skip/i);
    fireEvent.click(skipHint);

    // Immediately shows login inputs without waiting for timers
    expect(screen.getByText('COBB STORE')).toBeDefined();
    expect(screen.getByText('CRM POS')).toBeDefined();
    expect(screen.getAllByText('Owner').length).toBeGreaterThan(0);
    expect(screen.getByText('Manager')).toBeDefined();
    expect(screen.getByText('Cashier')).toBeDefined();
  });

  it('mounts CurtainWipe, drifts logo forward towards user, scatters into prismatic shards, and triggers onComplete', () => {
    const mockOnComplete = vi.fn();
    const { container } = render(<CurtainWipe onComplete={mockOnComplete} />);

    // Initially contains the seal and authenticated message
    expect(screen.getByText(/AUTHENTICATED/i)).toBeDefined();
    expect(screen.getByText(/COBB SHOWROOM/i)).toBeDefined();
    expect(screen.getByText(/ENTERING COMMAND CENTER/i)).toBeDefined();
    expect(screen.getByText(/Tap or press any key to skip/i)).toBeDefined();

    // Verify presence of left and right velvet drape panels
    const drapes = container.querySelectorAll('.w-1\\/2');
    expect(drapes.length).toBe(2);

    // Fast-forward past 1800ms mark (forward drift & scatter point)
    act(() => {
      vi.advanceTimersByTime(1850);
    });

    // Fast-forward remaining transition time to full 3800ms completion
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('allows 1-tap skip on CurtainWipe to immediately enter Command Center', () => {
    const mockOnComplete = vi.fn();
    const { container } = render(<CurtainWipe onComplete={mockOnComplete} />);

    // Click anywhere on the overlay
    fireEvent.click(container.firstChild);

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('supports LoginUpwardAscent alias seamlessly with complete forward transition', () => {
    const mockOnComplete = vi.fn();
    render(<LoginUpwardAscent onComplete={mockOnComplete} />);

    expect(screen.getByText(/AUTHENTICATED/i)).toBeDefined();
    expect(screen.getByText(/COBB SHOWROOM POS/i)).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(3900);
    });

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });
});
