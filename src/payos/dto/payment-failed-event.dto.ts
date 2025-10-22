export interface PaymentFailedEventDto {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  amount: number;
  reason: string;
}
