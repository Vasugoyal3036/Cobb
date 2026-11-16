import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CyberHackerBreach from './CyberHackerBreach';
import CurtainWipe from './CurtainWipe';
import LoginUpwardAscent from './LoginUpwardAscent';
import LoginScreen from './LoginScreen';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('Frontend Component Tests: LoginScreen Animations & Cyber Hacker Breach Transition', () => {
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

  it('mounts CyberHackerBreach, initializes warp tunnel & cyber telemetry, then triggers onComplete', () => {
    const mockOnComplete = vi.fn();
    render(<CyberHackerBreach onComplete={mockOnComplete} />);

    // Initially contains the cyber breach header, status badge and skip hint
    expect(screen.getByText(/COBB_BREACH_PROTOCOL/i)).toBeDefined();
    expect(screen.getByText(/WARPING INTO COMMAND DECK/i)).toBeDefined();
    expect(screen.getByText(/ROOT_OVERRIDE/i)).toBeDefined();
    expect(screen.getByText(/TAP ANYWHERE TO BYPASS WARP STREAM/i)).toBeDefined();

    // Fast-forward past the 1900ms supersonic warp zoom-through timer
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('allows 1-tap instant skip on CyberHackerBreach to enter Command Center immediately', () => {
    const mockOnComplete = vi.fn();
    const { container } = render(<CyberHackerBreach onComplete={mockOnComplete} />);

    // Click anywhere on the overlay
    fireEvent.click(container.firstChild);

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('supports CurtainWipe and LoginUpwardAscent aliases seamlessly with cyber breach transition', () => {
    const mockOnComplete = vi.fn();
    render(<CurtainWipe onComplete={mockOnComplete} />);

    expect(screen.getByText(/WARPING INTO COMMAND DECK/i)).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });
});
