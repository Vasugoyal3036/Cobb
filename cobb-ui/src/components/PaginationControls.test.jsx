import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PaginationControls, { usePagination } from './PaginationControls';

function PaginatedHarness({ items, pageSize = 3, resetKey = '' }) {
  const {
    page,
    setPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    pageItems
  } = usePagination(items, pageSize, resetKey);

  return (
    <div>
      <ul data-testid="rows">
        {pageItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={setPage}
        itemLabel="records"
      />
    </div>
  );
}

describe('PaginationControls & usePagination', () => {
  it('hides pagination controls when all items fit on one page', () => {
    render(<PaginatedHarness items={['A', 'B', 'C']} pageSize={5} />);
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByText('A')).toBeDefined();
    expect(screen.getByText('C')).toBeDefined();
  });

  it('slices items per page and supports Prev/Next navigation', () => {
    const items = ['Item1', 'Item2', 'Item3', 'Item4', 'Item5'];
    render(<PaginatedHarness items={items} pageSize={2} />);

    expect(screen.getByText('Item1')).toBeDefined();
    expect(screen.getByText('Item2')).toBeDefined();
    expect(screen.queryByText('Item3')).toBeNull();

    const prevBtn = screen.getByRole('button', { name: /prev/i });
    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(prevBtn.hasAttribute('disabled')).toBe(true);
    expect(nextBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(nextBtn);
    expect(screen.getByText('Item3')).toBeDefined();
    expect(screen.getByText('Item4')).toBeDefined();
    expect(screen.queryByText('Item1')).toBeNull();

    fireEvent.click(nextBtn);
    expect(screen.getByText('Item5')).toBeDefined();
    expect(screen.getByRole('button', { name: /next/i }).hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /prev/i }));
    expect(screen.getByText('Item3')).toBeDefined();
  });

  it('resets back to page 1 when resetKey changes and clamps if items shrink', () => {
    const items = ['A', 'B', 'C', 'D', 'E'];
    const { rerender } = render(<PaginatedHarness items={items} pageSize={2} resetKey="all" />);

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('C')).toBeDefined();

    // Shrinking items below page 2 range clamps cleanly without empty screen
    rerender(<PaginatedHarness items={['A', 'B']} pageSize={2} resetKey="all" />);
    expect(screen.getByText('A')).toBeDefined();
    expect(screen.queryByRole('navigation')).toBeNull();

    // Re-expand, move to page 2, then change filter resetKey -> resets to page 1
    rerender(<PaginatedHarness items={items} pageSize={2} resetKey="all" />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('C')).toBeDefined();

    rerender(<PaginatedHarness items={items} pageSize={2} resetKey="filtered" />);
    expect(screen.getByText('A')).toBeDefined();
  });
});

