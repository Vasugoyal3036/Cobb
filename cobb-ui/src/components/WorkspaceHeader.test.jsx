import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WorkspaceHeader, { getWorkspaceForTab } from './WorkspaceHeader';

describe('WorkspaceHeader [Clean 4-Workspace Navigation & Theme Engine]', () => {
  it('correctly maps tabs to their workspace category', () => {
    expect(getWorkspaceForTab('dashboard')).toBe('summary');
    expect(getWorkspaceForTab('speed_billing')).toBe('billing');
    expect(getWorkspaceForTab('pending_tags')).toBe('stock');
    expect(getWorkspaceForTab('pocket_khata')).toBe('customers');
    expect(getWorkspaceForTab('live')).toBe('reports');
    expect(getWorkspaceForTab('pnl')).toBe('reports');
  });

  it('renders all 5 main workspace buttons', () => {
    render(
      <WorkspaceHeader
        activeTab="dashboard"
        onSelectTab={vi.fn()}
        darkMode={true}
        setDarkMode={vi.fn()}
        dashTheme="modern"
        setDashTheme={vi.fn()}
        simplifiedMode={true}
        setSimplifiedMode={vi.fn()}
      />
    );

    expect(screen.getByText('Summary')).toBeDefined();
    expect(screen.getByText('Billing & Counter')).toBeDefined();
    expect(screen.getByText('Stock & Tags')).toBeDefined();
    expect(screen.getByText('Customers & Khata')).toBeDefined();
    expect(screen.getByText('Store Reports')).toBeDefined();
  });

  it('triggers onSelectTab when a workspace is clicked', () => {
    const onSelectTab = vi.fn();
    render(
      <WorkspaceHeader
        activeTab="dashboard"
        onSelectTab={onSelectTab}
        darkMode={true}
        setDarkMode={vi.fn()}
        dashTheme="modern"
        setDashTheme={vi.fn()}
        simplifiedMode={true}
        setSimplifiedMode={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Billing & Counter'));
    expect(onSelectTab).toHaveBeenCalledWith('speed_billing');

    fireEvent.click(screen.getByText('Stock & Tags'));
    expect(onSelectTab).toHaveBeenCalledWith('pending_tags');
  });

  it('renders sub-tools when inside a workspace and allows clicking sub-tool pills', () => {
    const onSelectTab = vi.fn();
    render(
      <WorkspaceHeader
        activeTab="speed_billing"
        onSelectTab={onSelectTab}
        darkMode={true}
        setDarkMode={vi.fn()}
        dashTheme="modern"
        setDashTheme={vi.fn()}
        simplifiedMode={true}
        setSimplifiedMode={vi.fn()}
      />
    );

    expect(screen.getByText('Speed POS')).toBeDefined();
    expect(screen.getByText('Hold Bills')).toBeDefined();
    expect(screen.getByText('Exchanges')).toBeDefined();
    expect(screen.getByText('Alterations')).toBeDefined();
    expect(screen.getByText('Cash Drawer')).toBeDefined();

    fireEvent.click(screen.getByText('Hold Bills'));
    expect(onSelectTab).toHaveBeenCalledWith('hold_desk');
  });

  it('allows toggling between Simplified and Classic mode', () => {
    const setSimplifiedMode = vi.fn();
    render(
      <WorkspaceHeader
        activeTab="dashboard"
        onSelectTab={vi.fn()}
        darkMode={true}
        setDarkMode={vi.fn()}
        dashTheme="modern"
        setDashTheme={vi.fn()}
        simplifiedMode={true}
        setSimplifiedMode={setSimplifiedMode}
      />
    );

    const toggleBtn = screen.getByTitle(/Toggle between Simplified Workspace View/i);
    fireEvent.click(toggleBtn);
    expect(setSimplifiedMode).toHaveBeenCalled();
  });
});
