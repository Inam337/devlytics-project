import { PaginatedResult, PaginationQueryDto } from '../common/dto/pagination.dto';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from './prisma.service';

/**
 * Minimal shape of a Prisma model delegate. Typing against this keeps the base
 * repository generic without pulling every model's generated types into scope.
 */
export interface ModelDelegate {
  findFirst(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown[]>;
  count(args: unknown): Promise<number>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
}

/**
 * Base data-access class for every organization-owned resource.
 *
 * Tenant scope is applied here once: `organizationId` is merged into every
 * `where` clause, so an individual repository can never forget it and a request
 * for another organization's record resolves to "not found".
 */
export abstract class TenantRepository<TModel> {
  protected constructor(
    protected readonly prisma: PrismaService,
    /** Human-readable resource name used in not-found / duplicate errors. */
    protected readonly resourceName: string,
  ) {}

  /** The Prisma delegate this repository reads and writes. */
  protected abstract get delegate(): ModelDelegate;

  protected scope(
    organizationId: string,
    where: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return { ...where, organizationId };
  }

  async findById(
    organizationId: string,
    id: string,
    include?: Record<string, unknown>,
  ): Promise<TModel | null> {
    return (await this.delegate.findFirst({
      where: this.scope(organizationId, { id }),
      ...(include ? { include } : {}),
    })) as TModel | null;
  }

  /** Same as `findById` but raises the standard 404 instead of returning null. */
  async findByIdOrFail(
    organizationId: string,
    id: string,
    include?: Record<string, unknown>,
  ): Promise<TModel> {
    const record = await this.findById(organizationId, id, include);
    if (!record) throw AppException.notFound(this.resourceName, id);
    return record;
  }

  async exists(organizationId: string, where: Record<string, unknown>): Promise<boolean> {
    const count = await this.delegate.count({ where: this.scope(organizationId, where) });
    return count > 0;
  }

  /** Single round trip for a page of rows plus its total. */
  async paginate(
    organizationId: string,
    query: PaginationQueryDto,
    options: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, unknown> | Record<string, unknown>[];
      include?: Record<string, unknown>;
      select?: Record<string, unknown>;
    } = {},
  ): Promise<PaginatedResult<TModel>> {
    const where = this.scope(organizationId, options.where ?? {});
    const [items, total] = await Promise.all([
      this.delegate.findMany({
        where,
        orderBy: options.orderBy,
        skip: query.skip,
        take: query.limit,
        ...(options.include ? { include: options.include } : {}),
        ...(options.select ? { select: options.select } : {}),
      }) as Promise<TModel[]>,
      this.delegate.count({ where }) as Promise<number>,
    ]);
    return PaginatedResult.from(items, total, query);
  }

  async createForTenant(organizationId: string, data: Record<string, unknown>): Promise<TModel> {
    return (await this.delegate.create({ data: { ...data, organizationId } })) as TModel;
  }

  /** Verifies tenant ownership before applying the update. */
  async updateForTenant(
    organizationId: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<TModel> {
    await this.findByIdOrFail(organizationId, id);
    return (await this.delegate.update({ where: { id }, data })) as TModel;
  }

  async deleteForTenant(organizationId: string, id: string): Promise<TModel> {
    await this.findByIdOrFail(organizationId, id);
    return (await this.delegate.delete({ where: { id } })) as TModel;
  }
}
