import {
  type ColumnDef,
  type Column,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type SortingState,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { useState, type ReactNode } from 'react';

import { useT } from '@/hooks/use-t';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import type { DataTableColumnMeta } from '@/components/ui/data-table-columns';
import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';
import { cn } from '@/libs/utils';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  showPagination?: boolean;
  itemsPerPage?: number;
  pageSizeOptions?: number[];
  toolbar?: ReactNode;
  className?: string;
  emptyMessage?: string;
  footer?: ReactNode;
}

function SortIndicator<TData>({ column }: { column: Column<TData> }) {
  if (!column.getCanSort()) {
    return null;
  }

  const isSorted = column.getIsSorted();
  const isSortedAsc = column.getIsSorted() === 'asc';

  return (
    <RbIcon
      name="arrowDown"
      size={12}
      color={isSorted ? IconColors.BLACK_COLOR_ICON : IconColors.GRAY_COLOR_ICON}
      className={cn(
        'ml-1 shrink-0 transition-transform',
        isSorted && isSortedAsc && 'rotate-180',
        !isSorted && 'opacity-40',
      )}
    />
  );
}

function getVisiblePageNumbers(current: number, total: number, maxVisible = 5): number[] {
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, index) => index);
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(0, current - half);
  const end = Math.min(total - 1, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(0, end - maxVisible + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function DataTablePagination<TData>({
  table,
  pageSizeOptions,
}: {
  table: ReturnType<typeof useReactTable<TData>>;
  pageSizeOptions: number[];
}) {
  const { t } = useT();
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalRows = table.getPrePaginationRowModel().rows.length;
  const pageCount = table.getPageCount();
  const start = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalRows);
  const visiblePages = getVisiblePageNumbers(pageIndex, pageCount);

  return (
    <div
      className={[
        'flex flex-col gap-3 border-t border-gray-200/80',
        'bg-[#FCF9F4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
        <label className="flex items-center gap-2">
          <span>{t('table.showEntries', 'Show')}</span>
          <select
            value={pageSize}
            onChange={(event) => {
              table.setPageSize(Number(event.target.value));
            }}
            className={[
              'h-8 rounded-md border border-gray-200 bg-white px-2',
              'text-sm text-gray-700 shadow-sm',
            ].join(' ')}
            aria-label={t('table.pageSize', 'Entries per page')}
          >
            {pageSizeOptions.map(size => (
              <option
                key={size}
                value={size}
              >
                {size}
              </option>
            ))}
          </select>
          <span>{t('table.entries', 'entries')}</span>
        </label>
        <span>
          {t('table.showingRange', 'Showing {start} to {end} of {total} entries', {
            start,
            end,
            total: totalRows,
          })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={[
            'rounded-md border border-gray-200 bg-white px-3 py-1.5',
            'text-sm text-gray-500 transition-colors',
            'hover:border-gray-300 hover:text-gray-700',
            'disabled:cursor-not-allowed disabled:opacity-40',
          ].join(' ')}
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {t('table.previous', 'Previous')}
        </button>

        {visiblePages.map(page => (
          <button
            key={page}
            type="button"
            className={cn(
              'min-w-8 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
              page === pageIndex
                ? 'border-zentro-teal bg-zentro-teal text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
            )}
            onClick={() => table.setPageIndex(page)}
            aria-current={page === pageIndex ? 'page' : undefined}
          >
            {page + 1}
          </button>
        ))}

        <button
          type="button"
          className={[
            'rounded-md border border-gray-200 bg-white px-3 py-1.5',
            'text-sm text-gray-500 transition-colors',
            'hover:border-gray-300 hover:text-gray-700',
            'disabled:cursor-not-allowed disabled:opacity-40',
          ].join(' ')}
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {t('table.next', 'Next')}
        </button>
      </div>
    </div>
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
  showPagination = false,
  itemsPerPage = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  toolbar,
  className = '',
  emptyMessage,
  footer,
}: DataTableProps<TData, TValue>) {
  const { t } = useT();
  const [sorting, setSorting] = useState<SortingState>([]);
  const RECORDS_ICON_SIZE = 24;
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: {
      pagination: {
        pageSize: itemsPerPage,
      },
    },
  });
  const isFullHeight = className.includes('h-full');
  const hasStickyFooter = footer != null;
  const resolvedEmptyMessage = emptyMessage ?? t('table.noRecords', 'No records found');

  return (
    <div
      className={cn(
        'mb-0',
        className,
        isFullHeight && 'flex h-full flex-col',
        hasStickyFooter && 'flex min-h-0 flex-col',
        !isFullHeight && !hasStickyFooter && 'space-y-4',
      )}
    >
      {toolbar
        ? (
            <div className="shrink-0">{toolbar}</div>
          )
        : null}

      <div
        className={cn(
          'overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm',
          isFullHeight && 'flex min-h-0 flex-1 flex-col',
          hasStickyFooter && 'min-h-0 flex-1 overflow-auto',
        )}
      >
        <div className={cn(isFullHeight && !hasStickyFooter && 'min-h-0 flex-1 overflow-auto')}>
          <Table
            className={cn(
              'w-full',
              table.getRowModel().rows.length === 0 && !hasStickyFooter && 'max-h-[calc(100vh-274px)]',
            )}
          >
            <TableHeader className="z-auto bg-[#FCF9F4]">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-gray-200/80 hover:bg-transparent"
                >
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined;
                    const isRightAligned = (meta?.className || '').includes('text-right');
                    const isCenterAligned = (meta?.className || '').includes('text-center');

                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          'h-11 px-5 text-xs font-semibold tracking-wide',
                          'text-gray-600 uppercase',
                          header.column.getCanSort() && 'cursor-pointer select-none hover:bg-black/[0.02]',
                          meta?.className,
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div
                          className={cn(
                            'flex w-full items-center gap-1 normal-case',
                            isRightAligned && 'justify-end text-right',
                            isCenterAligned && 'justify-center text-center',
                          )}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                          <SortIndicator column={header.column} />
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length
                ? (
                    table.getRowModel().rows.map((row, index) => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          'border-b border-gray-100 transition-colors',
                          'hover:bg-[#FCF9F4]/60',
                          index % 2 === 1 && 'bg-gray-50/30',
                        )}
                        data-state={row.getIsSelected() && 'selected'}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;

                          return (
                            <TableCell
                              key={cell.id}
                              className={cn(
                                'px-5 py-4 text-sm text-gray-700',
                                meta?.className,
                              )}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )
                : (
                    <TableRow className="border-0 text-center hover:bg-transparent">
                      <TableCell
                        colSpan={columns.length}
                        className="h-40 border-0 text-center"
                      >
                        <div
                          className={[
                            'flex w-full flex-col items-center justify-center',
                            'gap-3 py-10 text-center text-gray-500',
                          ].join(' ')}
                        >
                          <div className="rounded-xl border border-gray-200 bg-[#FCF9F4] p-4">
                            <RbIcon
                              name="file"
                              size={RECORDS_ICON_SIZE}
                              color={IconColors.GRAY_COLOR_ICON}
                            />
                          </div>
                          <p className="text-sm">{resolvedEmptyMessage}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
            </TableBody>
            {footer != null
              ? (
                  <TableFooter
                    className={cn(
                      'border-t border-gray-200/80',
                      hasStickyFooter && 'sticky bottom-0 z-10 bg-white shadow-[0_-1px_0_0_rgba(0,0,0,0.06)]',
                    )}
                  >
                    {footer}
                  </TableFooter>
                )
              : null}
          </Table>
        </div>

        {showPagination
          ? (
              <DataTablePagination
                table={table}
                pageSizeOptions={pageSizeOptions}
              />
            )
          : null}
      </div>
    </div>
  );
}
