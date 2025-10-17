import { ApiProperty } from '@nestjs/swagger';

/**
 * Metadata for paginated responses
 */
export interface PaginationMeta {
  /** Total number of records in the database */
  total: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
}

/**
 * Generic paginated response interface
 * @template T The type of data being paginated
 */
export interface PaginatedResponse<T> {
  /** Array of data items for the current page */
  data: T[];
  /** Pagination metadata */
  meta: PaginationMeta;
}

/**
 * Generic paginated response class for Swagger documentation
 * Use this in @ApiResponse decorators with type parameters
 */
export class PaginatedResponseDto<T> implements PaginatedResponse<T> {
  data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 250,
      page: 2,
      limit: 10,
      totalPages: 25,
      hasNextPage: true,
      hasPreviousPage: true,
    },
  })
  meta: PaginationMeta;
}
