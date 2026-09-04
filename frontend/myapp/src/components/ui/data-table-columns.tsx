import type { ColumnDef } from '@tanstack/react-table';

import { Pencil, Trash2 } from '@/components/icons/FluentIcons';
import { cn } from '@/libs/utils';

export type DataTableColumnMeta = {
  className?: string;
};

type StatusVariant
  = | 'default'
    | 'mint'
    | 'teal'
    | 'success'
    | 'warning'
    | 'danger'
    | 'neutral'
    | 'outline';

const statusVariantClasses: Record<StatusVariant, string> = {
  default: 'bg-zentro-teal/10 text-zentro-teal border border-zentro-teal/20',
  mint: 'bg-zentro-mint/20 text-zentro-black-teal border border-zentro-mint/30',
  teal: 'bg-zentro-teal text-white border border-transparent',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border border-amber-100',
  danger: 'bg-rose-50 text-rose-600 border border-rose-100',
  neutral: 'bg-white text-gray-600 border border-gray-200',
  outline: 'bg-white text-gray-700 border border-gray-200',
};

type StatusColumnOptions<T> = {
  id?: string;
  header: string;
  variant?: StatusVariant | ((row: T) => StatusVariant);
  enableSorting?: boolean;
};

type DateColumnOptions = {
  id?: string;
  header: string;
  format?: Intl.DateTimeFormatOptions;
  enableSorting?: boolean;
  fallback?: string;
};

type ActionColumnOptions<T> = {
  id?: string;
  header?: string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  editLabel?: string;
  deleteLabel?: string;
  className?: string;
};

export function statusColumn<T>(
  accessorFn: (row: T) => string,
  options: StatusColumnOptions<T>,
): ColumnDef<T> {
  const {
    id = 'status',
    header,
    variant = 'default',
    enableSorting = true,
  } = options;

  return {
    id,
    accessorFn: row => accessorFn(row),
    header,
    enableSorting,
    cell: ({ row }) => {
      const label = accessorFn(row.original);
      const pillVariant = typeof variant === 'function'
        ? variant(row.original)
        : variant;

      return (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
            statusVariantClasses[pillVariant],
          )}
        >
          {label}
        </span>
      );
    },
  };
}

export function dateColumn<T>(
  accessorFn: (row: T) => string | Date | null | undefined,
  options: DateColumnOptions,
): ColumnDef<T> {
  const {
    id = 'date',
    header,
    format = { year: 'numeric', month: 'short', day: 'numeric' },
    enableSorting = true,
    fallback = '—',
  } = options;
  const formatter = new Intl.DateTimeFormat(undefined, format);

  return {
    id,
    accessorFn: (row) => {
      const value = accessorFn(row);

      if (!value) {
        return '';
      }

      const date = value instanceof Date ? value : new Date(value);

      return Number.isNaN(date.getTime()) ? '' : date.toISOString();
    },
    header,
    enableSorting,
    cell: ({ row }) => {
      const raw = accessorFn(row.original);

      if (!raw) {
        return <span className="text-muted-foreground">{fallback}</span>;
      }

      const date = raw instanceof Date ? raw : new Date(raw);

      if (Number.isNaN(date.getTime())) {
        return <span className="text-muted-foreground">{fallback}</span>;
      }

      return (
        <span className="text-zentro-black-teal">
          {formatter.format(date)}
        </span>
      );
    },
  };
}

export function actionColumn<T>(options: ActionColumnOptions<T>): ColumnDef<T> {
  const {
    id = 'actions',
    header = '',
    onEdit,
    onDelete,
    editLabel = 'Edit',
    deleteLabel = 'Delete',
    className,
  } = options;

  return {
    id,
    header,
    enableSorting: false,
    meta: {
      className: cn('text-right w-[1%] whitespace-nowrap', className),
    } satisfies DataTableColumnMeta,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        {onEdit
          ? (
              <button
                type="button"
                className="rounded-md p-1 text-zentro-teal/80 transition-colors hover:text-zentro-teal"
                aria-label={editLabel}
                onClick={() => onEdit(row.original)}
              >
                <Pencil
                  className="size-4"
                  aria-hidden
                />
              </button>
            )
          : null}
        {onDelete
          ? (
              <button
                type="button"
                className="rounded-md p-1 text-rose-500/80 transition-colors hover:text-rose-600"
                aria-label={deleteLabel}
                onClick={() => onDelete(row.original)}
              >
                <Trash2
                  className="size-4"
                  aria-hidden
                />
              </button>
            )
          : null}
      </div>
    ),
  };
}
