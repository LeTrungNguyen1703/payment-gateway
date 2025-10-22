export interface PaymentCreatedLinkEventDto {
  userId: string;
  transactionId: string;
  checkoutUrl: string;
  qrCode: string;
}
