import { memo, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  accessor?: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface AccessibleDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  caption?: string;
  className?: string;
  rowKeyAccessor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
  selectedRows?: Set<string | number>;
  onRowSelect?: (key: string | number, selected: boolean) => void;
  selectable?: boolean;
}

// React 19 optimized accessible data table with memo and proper ARIA support
function AccessibleDataTable<T>({
  data,
  columns,
  sortConfig,
  onSort,
  loading = false,
  emptyMessage = 'No data available',
  caption,
  className = '',
  rowKeyAccessor,
  onRowClick,
  selectedRows = new Set(),
  onRowSelect,
  selectable = false,
}: AccessibleDataTableProps<T>) {
  // Memoized sort handler
  const handleSort = useCallback((key: string) => {
    if (onSort) {
      onSort(key);
    }
  }, [onSort]);
  // Memoized row selection handler
  const handleRowSelect = useCallback((key: string | number, selected: boolean) => {
    if (onRowSelect) {
      onRowSelect(key, selected);
    }
  }, [onRowSelect]);
  // Memoized row click handler
  const handleRowClick = useCallback((item: T) => {
    if (onRowClick) {
      onRowClick(item);
    }
  }, [onRowClick]);
  // Memoized select all handler
  const handleSelectAll = useCallback((selected: boolean) => {
    if (onRowSelect) {
      data.forEach((item) => {
        const key = rowKeyAccessor(item);

        onRowSelect(key, selected);
      });
    }
  }, [data, rowKeyAccessor, onRowSelect]);
  // Memoized computed values
  const allSelected = useMemo(() => {
    return data.length > 0 && data.every(item => selectedRows.has(rowKeyAccessor(item)));
  }, [data, selectedRows, rowKeyAccessor]);
  const someSelected = useMemo(() => {
    return data.some(item => selectedRows.has(rowKeyAccessor(item)));
  }, [data, selectedRows, rowKeyAccessor]);
  // Render sort icon
  const renderSortIcon = useCallback((columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return (
        <RbIcon
          name="arrowDown"
          size={14}
          color={IconColors.GRAY_COLOR_ICON}
          className="ml-1 opacity-50"
        />
      );
    }

    return (
      <RbIcon
        name={sortConfig.direction === 'asc'
          ? 'arrowChevronLeft'
          : 'arrowChevronRight'}
        size={14}
        color={IconColors.PRIMARY_COLOR_ICON}
        className="ml-1"
      />
    );
  }, [sortConfig]);

  if (loading) {
    return (
      <div
        className="w-full"
        role="status"
        aria-live="polite"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-100 rounded"
            >
            </div>
          ))}
        </div>
        <span className="sr-only">Loading table data...</span>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <Table>
        {caption && <caption className="sr-only">{caption}</caption>}
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-12">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={e => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                    aria-label="Select all rows"
                  />
                </div>
              </TableHead>
            )}
            {columns.map(column => (
              <TableHead
                key={String(column.key)}
                className={`${column.width || ''} text-${column.align || 'left'}`}
              >
                {column.sortable
                  ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort(String(column.key))}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                        aria-label={`Sort by ${column.header} ${sortConfig?.key === column.key
                          ? sortConfig.direction === 'asc' ? 'descending' : 'ascending'
                          : 'ascending'
                        }`}
                      >
                        <span>{column.header}</span>
                        {renderSortIcon(String(column.key))}
                      </Button>
                    )
                  : (
                      column.header
                    )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0
            ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="text-center py-8 text-gray-500"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )
            : (
                data.map((item) => {
                  const rowKey = rowKeyAccessor(item);
                  const isSelected = selectedRows.has(rowKey);

                  return (
                    <TableRow
                      key={String(rowKey)}
                      className={`
                    ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                    ${isSelected ? 'bg-blue-50' : ''}
                    transition-colors duration-150
                  `}
                      onClick={() => handleRowClick(item)}
                      role={onRowClick ? 'button' : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          handleRowClick(item);
                        }
                      }}
                      aria-selected={selectable ? isSelected : undefined}
                    >
                      {selectable && (
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleRowSelect(rowKey, e.target.checked);
                              }}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                              aria-label={`Select row ${rowKey}`}
                            />
                          </div>
                        </TableCell>
                      )}
                      {columns.map(column => (
                        <TableCell
                          key={String(column.key)}
                          className={`text-${column.align || 'left'}`}
                        >
                          {column.accessor
                            ? column.accessor(item)
                            : String((item as Record<string, unknown>)[column.key as string] || '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
        </TableBody>
      </Table>
    </div>
  );
}

// Memoized export for performance
const MemoizedAccessibleDataTable = memo(AccessibleDataTable);

// Set displayName for debugging purposes
Object.defineProperty(MemoizedAccessibleDataTable, 'displayName', {
  value: 'AccessibleDataTable',
  writable: false,
});

export default MemoizedAccessibleDataTable;
