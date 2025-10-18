export enum PaymentMethodStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  BLOCKED = 'blocked',
}

export enum PaymentProvider {
  PAYOS = 'payos',
  VNPAY = 'vnpay',
  MOMO = 'momo',
  ZALOPAY = 'zalopay',
  STRIPE = 'stripe',
  MANUAL = 'manual', // Cho test/development
}

export enum PaymentMethodType {
  CARD = 'card',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  MOMO = 'momo',
  ZALOPAY = 'zalopay',
  VNPAY_WALLET = 'vnpay_wallet',
  CASH = 'cash',
  PAYOS = 'payos',
}
