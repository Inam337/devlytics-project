import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type SortingState,
  type Column,
} from '@tanstack/react-table';
import { useState } from 'react';

import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';

interface ColumnMeta {
  className?: string;
  /** Applied only to the header cell; use for e.g. column header background colors */
  headerClassName?: string;
}

interface ReportingDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Footer row: pass an array of cell contents (one per column) '
   * for aligned totals, or a single TableRow for legacy use */
  footer?: React.ReactNode | React.ReactNode[];
  className?: string;
  /** Max height for the scrollable body (e.g. '600px' or 'calc(100vh - 290px)') */
  bodyMaxHeight?: string;
  /** When true, table fills 100% of container width; when false, uses fixed column widths and horizontal scroll */
  fitWidth?: boolean;
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
      className={`ml-1 transition-transform ${isSorted && isSortedAsc ? 'rotate-180' : ''}
       ${!isSorted ? 'opacity-50' : ''}`}
    />
  );
}

function getColumnWidth<TData, TValue>(column: Column<TData, TValue>): number {
  const size = column.columnDef.size ?? column.getSize?.() ?? 120;

  return typeof size === 'number' ? size : 120;
}

export function ReportingDataTable<TData, TValue>({
  columns,
  data,
  footer,
  className = '',
  bodyMaxHeight = 'calc(100vh - 290px)',
  fitWidth = false,
}: ReportingDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const RECORDS_ICON_SIZE = 24;
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });
  const leafColumns = table.getAllLeafColumns();
  const totalTableWidth = leafColumns.reduce((sum, col) => sum + getColumnWidth(col), 0);

  function getColumnStyle(col: (typeof leafColumns)[0]) {
    const w = getColumnWidth(col);

    if (fitWidth && totalTableWidth > 0) {
      const pct = (w / totalTableWidth) * 100;

      return { width: `${pct}%`, minWidth: undefined, maxWidth: undefined };
    }

    return {
      width: w,
      minWidth: w,
      maxWidth: w,
    };
  }

  const tableStyle = fitWidth
    ? { width: '100%', minWidth: '100%', tableLayout: 'fixed' as const }
    : {
        width: totalTableWidth,
        minWidth: totalTableWidth,
        tableLayout: 'fixed' as const,
      };
  const wrapperStyle = fitWidth
    ? { width: '100%' }
    : { minWidth: totalTableWidth, width: totalTableWidth };

  return (
    <div className={`flex flex-col min-h-0 w-full min-w-0 ${className}`}>
      {/* Single scroll container: one table = perfect column alignment; sticky thead + tfoot */}
      <div
        className="flex-1 min-h-0 overflow-auto"
        style={{ maxHeight: bodyMaxHeight }}
      >
        <div style={wrapperStyle}>
          <table
            className="caption-bottom text-sm border-collapse w-full"
            style={tableStyle}
          >
            <colgroup>
              {leafColumns.map(col => (
                <col
                  key={col.id}
                  style={{
                    width: fitWidth && totalTableWidth > 0
                      ? `${(getColumnWidth(col) / totalTableWidth) * 100}%`
                      : getColumnWidth(col),
                    ...(fitWidth ? {} : { minWidth: getColumnWidth(col) }),
                  }}
                />
              ))}
            </colgroup>
            <TableHeader className="bg-gray-100 sticky top-0 shadow-sm">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as ColumnMeta | undefined;
                    const canSort = header.column.getCanSort();
                    const headerClass = meta?.headerClassName ?? meta?.className ?? '';
                    const isRightAligned = (headerClass || meta?.className || '').includes('text-right');
                    const isCenterAligned = (headerClass || meta?.className || '').includes('text-center');
                    const colStyle = getColumnStyle(header.column);

                    return (
                      <TableHead
                        key={header.id}
                        className={`${canSort ? 'cursor-pointer hover:bg-gray-50 select-none' : ''} 
                        text-sm font-semibold overflow-hidden ${headerClass}`}
                        style={{
                          ...colStyle,
                          paddingRight: '12px',
                          paddingLeft: '12px',
                        }}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <div
                          className={`flex items-center gap-1 w-full min-w-0 whitespace-nowrap
                             overflow-hidden text-ellipsis
                           ${isRightAligned ? 'justify-end text-right' : ''} 
                           ${isCenterAligned ? 'justify-center text-center' : ''}`}
                        >
                          <span className="min-w-0 truncate">
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          <SortIndicator column={header.column} />
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0
                ? table.getRowModel().rows.map(row => (
                    <TableRow
                      key={row.id}
                      className="border-b border-gray-100 hover:bg-gray-50 h-12"
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
                        const isCenterAligned = (meta?.className || '').includes('text-center');
                        const isRightAligned = (meta?.className || '').includes('text-right');

                        return (
                          <TableCell
                            key={cell.id}
                            className={`${meta?.className || ''} overflow-hidden text-ellipsis`}
                            style={getColumnStyle(cell.column)}
                          >
                            <div
                              className={`flex items-center w-full min-w-0 whitespace-nowrap 
                                overflow-hidden text-ellipsis
                              ${isCenterAligned ? 'justify-center text-center' : ''}
                              ${isRightAligned ? 'justify-end text-right' : ''}`}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                : (
                    <TableRow className="text-center border-0">
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center border-0"
                      >
                        <div className="w-full flex flex-col justify-center items-center gap-4
                        text-center py-8 text-gray-500"
                        >
                          <div className="bg-gray-100 p-4 rounded-md">
                            <RbIcon
                              name="file"
                              size={RECORDS_ICON_SIZE}
                              color={IconColors.GRAY_COLOR_ICON}
                            />
                          </div>
                          No Records Found
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
            </TableBody>
            {footer != null && (
              <TableFooter className="bg-yellow-100/80 border-t-2 border-gray-300 sticky bottom-0dd shadow-sm">
                {Array.isArray(footer)
                  ? (
                      <TableRow className="bg-yellow-100/80 border-t border-gray-200 font-medium
                       hover:bg-yellow-100/80"
                      >
                        {leafColumns.map((col, i) => {
                          const meta = col.columnDef.meta as ColumnMeta | undefined;
                          const isRightAligned = (meta?.className || '').includes('text-right');
                          const isCenterAligned = (meta?.className || '').includes('text-center');
                          const colStyle = getColumnStyle(col);

                          return (
                            <TableCell
                              key={col.id}
                              className={`${i === 0 ? 'font-bold' : 'tabular-nums'} ${isRightAligned
                                ? 'text-right'
                                : ''} ${isCenterAligned ? 'text-center' : ''}`.trim()}
                              style={{
                                ...colStyle,
                                paddingRight: '14px',
                                paddingLeft: '14px',
                              }}
                            >
                              {footer[i]}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    )
                  : (
                      footer
                    )}
              </TableFooter>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
