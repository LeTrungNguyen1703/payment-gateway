import { PaginatedResponse, PaginationMeta } from '../interfaces/paginated-response.interface';

/**
 * Reusable pagination helper for Prisma models
 * Provides a generic method to paginate any Prisma model with filtering, sorting, and relations
 */
export class PrismaPagination {
  /**
   * Paginate Prisma query results
   * @template T The type of the data being paginated
   * @param model Prisma model delegate (e.g., prisma.user, prisma.wallets)
   * @param page Current page number (1-indexed)
   * @param limit Number of items per page
   * @param where Optional Prisma where clause for filtering
   * @param orderBy Optional Prisma orderBy clause for sorting
   * @param include Optional Prisma include clause for relations
   * @param select Optional Prisma select clause for specific fields
   * @returns Promise resolving to paginated response with data and metadata
   *
   * @example
   * ```typescript
   * const result = await PrismaPagination.paginate(
   *   this.prisma.wallets,
   *   1,
   *   10,
   *   { user_id: userId },
   *   { created_at: 'desc' }
   * );
   * ```
   */
  static async paginate<T>(
    model: any,
    page: number = 1,
    limit: number = 10,
    where?: any,
    orderBy?: any,
    include?: any,
    select?: any,
  ): Promise<PaginatedResponse<T>> {
    // Ensure page and limit are positive integers
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));

    // Calculate skip for pagination
    const skip = (safePage - 1) * safeLimit;

    // Build the base query options
    const queryOptions: any = {
      skip,
      take: safeLimit,
    };

    // Add optional clauses
    if (where) queryOptions.where = where;
    if (orderBy) queryOptions.orderBy = orderBy;
    if (include) queryOptions.include = include;
    if (select) queryOptions.select = select;

    // Execute queries in parallel for better performance
    const [data, total] = await Promise.all([
      model.findMany(queryOptions),
      model.count({ where: where || {} }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / safeLimit);
    const hasNextPage = safePage < totalPages;
    const hasPreviousPage = safePage > 1;

    const meta: PaginationMeta = {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };

    return {
      data: data as T[],
      meta,
    };
  }

  /**
   * Calculate pagination metadata without fetching data
   * Useful when you need to know pagination info before querying
   * @param total Total number of records
   * @param page Current page number
   * @param limit Number of items per page
   * @returns Pagination metadata
   */
  static calculateMeta(total: number, page: number, limit: number): PaginationMeta {
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const totalPages = Math.ceil(total / safeLimit);

    return {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    };
  }
}

