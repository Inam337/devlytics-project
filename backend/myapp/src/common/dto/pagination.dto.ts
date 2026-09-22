import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Query contract shared by every list endpoint: page, limit, search, sortBy,
 * sortOrder. Module-specific filters extend this class rather than redefining it.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: DEFAULT_PAGE_SIZE, maximum: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({
    description: 'Free-text search across the resource label fields',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ description: 'Field to sort by' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Marker envelope returned by services for paginated results. The global
 * response interceptor unwraps it into the documented `{ data, pagination }`
 * response shape, so no controller formats pagination by hand.
 */
export class PaginatedResult<T> {
  constructor(
    readonly items: T[],
    readonly pagination: PaginationMeta,
  ) {}

  static from<T>(
    items: T[],
    total: number,
    query: { page: number; limit: number },
  ) {
    return new PaginatedResult<T>(items, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: query.limit > 0 ? Math.ceil(total / query.limit) : 0,
    });
  }

  map<R>(fn: (item: T) => R): PaginatedResult<R> {
    return new PaginatedResult<R>(this.items.map(fn), this.pagination);
  }
}
