export const EVENTS = {
  TRANSACTION: {
    CREATED: 'transaction.created',
    UPDATED: 'transaction.updated',
    DELETED: 'transaction.deleted',
    FAILED: 'transaction.failed',
    STATUS_UPDATED: 'transaction.status_updated',
  },
  PAYMENT: {
    LINK_CREATED: 'payment.link_created',
    SUCCESS: 'payment.success',
    FAILED: 'payment.failed',
  },
} as const;

export const SOCKET_EVENTS = {
  TRANSACTION: {
    CREATED: 'transaction:created',
    UPDATED: 'transaction:updated',
    DELETED: 'transaction:deleted',
    FAILED: 'transaction:failed',
  },
  PAYMENT: {
    LINK_CREATED: 'payment:link_created',
    SUCCESS: 'payment:success',
    FAILED: 'payment:failed',
  },
} as const;
