# BullMQ Transaction Timeout Implementation

## Tổng quan

Hệ thống này sử dụng **BullMQ** kết hợp với **EventEmitter** để tự động hủy các giao dịch (transactions) sau 15 phút nếu không được thanh toán, và gọi API cancel của PayOS.

## Kiến trúc

### 1. Luồng hoạt động

```
Transaction Created (PENDING)
    ↓
PayOS Payment Link Created (AWAITING_PAYMENT)
    ↓
[Schedule Timeout Job - 15 phút]
    ↓
Sau 15 phút nếu chưa thanh toán:
    ↓
- Check transaction status
- Call PayOS Cancel API
- Update status → FAILED
```

### 2. Tránh Circular Dependency bằng EventEmitter

Thay vì inject `QueueService` trực tiếp vào `TransactionService` (gây circular dependency), chúng ta sử dụng **EventEmitter pattern**:

- `TransactionService` → Emit events
- `QueueListener` → Lắng nghe events và xử lý queue

## Cấu trúc file

```
src/
├── queue/
│   ├── queue.module.ts              # Module chính của BullMQ
│   ├── queue.service.ts             # Service quản lý queue operations
│   ├── listeners/
│   │   └── queue.listener.ts        # Lắng nghe events để schedule/cancel jobs
│   └── processors/
│       └── transaction-timeout.processor.ts  # Xử lý timeout logic
├── transaction/
│   └── transaction.service.ts       # Emit events khi có thay đổi
└── common/
    └── constants/
        └── events.constants.ts      # Định nghĩa events
```

## Chi tiết implementation

### 1. Queue Module (`queue.module.ts`)

```typescript
// Cấu hình BullMQ với Redis
BullModule.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    connection: {
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get('REDIS_PORT', 6379),
      password: configService.get('REDIS_PASSWORD'),
    },
  }),
})

// Đăng ký queue 'transaction-timeout'
BullModule.registerQueue({
  name: 'transaction-timeout',
})
```

### 2. Queue Service (`queue.service.ts`)

**Schedule timeout job:**
```typescript
await scheduleTransactionTimeout({
  transactionId: string,
  externalTransactionId: number,
  userId: string,
  amount: number,
  createdAt: Date,
})
```

**Cancel timeout job:**
```typescript
await cancelTransactionTimeout(transactionId: string)
```

### 3. Queue Listener (`queue.listener.ts`)

Lắng nghe 2 events chính:

#### Event 1: `PAYMENT.LINK_CREATED`
- **Khi nào:** Sau khi PayOS tạo payment link thành công
- **Làm gì:** Schedule timeout job 15 phút
```typescript
@OnEvent(EVENTS.PAYMENT.LINK_CREATED)
async handlePaymentLinkCreated(payload) {
  await this.queueService.scheduleTransactionTimeout({...});
}
```

#### Event 2: `TRANSACTION.STATUS_UPDATED`
- **Khi nào:** Khi transaction chuyển sang COMPLETED/FAILED/CANCELLED
- **Làm gì:** Hủy timeout job (nếu có)
```typescript
@OnEvent(EVENTS.TRANSACTION.STATUS_UPDATED)
async handleTransactionStatusUpdated(payload) {
  if (payload.shouldCancelTimeout) {
    await this.queueService.cancelTransactionTimeout(...);
  }
}
```

### 4. Transaction Timeout Processor (`transaction-timeout.processor.ts`)

Xử lý logic khi timeout job được trigger sau 15 phút:

```typescript
@Processor('transaction-timeout')
export class TransactionTimeoutProcessor extends WorkerHost {
  async process(job: Job<TransactionTimeoutJobData>) {
    // 1. Lấy transaction hiện tại
    const transaction = await this.transactionService.findOne(transactionId);
    
    // 2. Kiểm tra status
    if (status === PENDING || status === AWAITING_PAYMENT) {
      // 3. Gọi PayOS Cancel API
      await this.payosService.cancelPayment(externalTransactionId);
      
      // 4. Update status → FAILED
      await this.transactionService.updateStatus(transactionId, 'FAILED');
    }
  }
}
```

### 5. PayOS Service - Cancel Method

```typescript
async cancelPayment(orderCode: number) {
  const url = `https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`;
  const response = await this.httpService.delete(url, config);
  return response.data;
}
```

## Cấu hình môi trường (.env)

```env
# Redis Configuration (cho BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# PayOS Configuration
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key
```

## Luồng hoạt động chi tiết

### Scenario 1: Tạo transaction và schedule timeout

```
1. User tạo transaction
   → TransactionService.create()
   → Emit TRANSACTION.CREATED

2. PayosListener nhận event
   → Gọi PayOS API tạo payment link
   → Update transaction với external_transaction_id
   → Emit PAYMENT.LINK_CREATED (với orderCode)

3. QueueListener nhận event
   → Schedule timeout job với delay = 15 phút
   → Job ID: "timeout-{transactionId}"
```

### Scenario 2: User thanh toán thành công (trước 15 phút)

```
1. PayOS webhook → Payment success
   → TransactionService.updateGatewayResponse()
   → Update status = COMPLETED
   → Emit TRANSACTION.STATUS_UPDATED

2. QueueListener nhận event
   → Cancel timeout job
   → Job bị remove khỏi queue
```

### Scenario 3: Timeout sau 15 phút (không thanh toán)

```
1. BullMQ trigger job sau 15 phút
   → TransactionTimeoutProcessor.process()

2. Check transaction status
   → Vẫn là PENDING hoặc AWAITING_PAYMENT

3. Gọi PayOS Cancel API
   → DELETE /v2/payment-requests/{orderCode}

4. Update transaction
   → status = FAILED
   → Emit TRANSACTION.STATUS_UPDATED
```

## Advantages của approach này

### ✅ Tránh Circular Dependency
- `TransactionService` không phụ thuộc vào `QueueService`
- Sử dụng EventEmitter làm mediator
- Modules có thể phát triển độc lập

### ✅ Decoupled Architecture
- Transaction logic tách biệt khỏi queue logic
- Dễ test từng component riêng
- Có thể thêm listeners khác mà không ảnh hưởng code cũ

### ✅ Reliable Processing
- BullMQ retry mechanism (3 lần với exponential backoff)
- Job persistence trong Redis
- Xử lý được trường hợp server restart

### ✅ Scalable
- Có thể chạy nhiều workers song song
- Redis cluster support
- Horizontal scaling

## Testing

### Test timeout functionality

```bash
# 1. Tạo transaction
POST /transactions
{
  "amount": 10000,
  "description": "Test timeout"
}

# 2. Kiểm tra Redis queue
# Job sẽ được schedule với delay 15 phút

# 3. Đợi 15 phút hoặc manually trigger job

# 4. Verify transaction status → FAILED
```

### Debug commands

```bash
# Check BullMQ jobs in Redis
redis-cli
> KEYS bull:transaction-timeout:*

# Check specific job
> HGETALL bull:transaction-timeout:{jobId}
```

## Troubleshooting

### Issue: Job không được tạo
- Kiểm tra Redis connection
- Verify REDIS_HOST, REDIS_PORT trong .env
- Check logs: "Scheduled timeout job for transaction..."

### Issue: Job không chạy sau 15 phút
- Verify BullMQ worker đang running
- Check job status trong Redis
- Review processor logs

### Issue: Circular dependency error
- Đảm bảo không inject QueueService vào TransactionService
- Chỉ sử dụng EventEmitter pattern

## Future Enhancements

1. **Configurable timeout:** Cho phép set timeout khác nhau cho mỗi transaction
2. **Notification:** Gửi email/SMS trước khi timeout
3. **Grace period:** Warn user trước 2-3 phút
4. **Dashboard:** UI để monitor pending jobs

## Kết luận

Hệ thống này cung cấp:
- ✅ Tự động cancel transactions sau 15 phút
- ✅ Gọi PayOS Cancel API
- ✅ Kiến trúc clean, không circular dependency  
- ✅ Scalable và reliable
- ✅ Dễ maintain và extend

