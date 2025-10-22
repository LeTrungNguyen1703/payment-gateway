export interface PaymentSuccessEventDto {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  amount: number;
  message: string;
}
