# Transaction CRUD API Documentation

## ✅ Implemented Features

### 1. **Create Transaction**
- **Endpoint**: `POST /transaction`
- **Validates**: User exists, payment method belongs to user
- **Auto-creates**: Transaction event for audit trail
- **Returns**: Transaction with user and payment method details

```json
{
  "user_id": "uuid",
  "payment_method_id": "uuid (optional)",
  "amount": 100000,
  "currency": "VND",
  "description": "Payment for order #123",
  "status": "pending",
  "gateway_provider": "payos",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "device_id": "device123"
}
```

### 2. **Get All Transactions (with Pagination & Filters)**
- **Endpoint**: `GET /transaction`
- **Query Params**:
  - `page` (default: 1)
  - `limit` (default: 10)
  - `user_id` - Filter by user
  - `status` - Filter by status
  - `gateway_provider` - Filter by gateway
  - `external_transaction_id` - Search by external ID
  - `created_from` - Date range start
  - `created_to` - Date range end

```bash
GET /transaction?page=1&limit=20&status=completed&user_id=xxx
```

### 3. **Get Transaction by ID**
- **Endpoint**: `GET /transaction/:id`
- **Returns**: Full transaction details including:
  - User information
  - Payment method details
  - Transaction events (last 10)
  - Refunds (if any)

### 4. **Update Transaction**
- **Endpoint**: `PATCH /transaction/:id`
- **Features**:
  - Auto-sets `completed_at` when status changes to completed
  - Creates transaction event on status change
  - Updates `updated_at` timestamp
  - Prevents updating `user_id`

```json
{
  "status": "completed",
  "external_transaction_id": "PAYOS123456",
  "gateway_response": { "orderCode": "123" },
  "fraud_score": 85,
  "fraud_decision": "accept"
}
```

### 5. **Delete Transaction**
- **Endpoint**: `DELETE /transaction/:id`
- **Protection**: Cannot delete transactions with existing refunds
- **Cascade**: Auto-deletes transaction_events

### 6. **Get User Transactions**
- **Endpoint**: `GET /transaction/user/:userId`
- **Returns**: Paginated transactions for specific user

### 7. **Get Transaction Statistics**
- **Endpoint**: `GET /transaction/stats?user_id=xxx`
- **Returns**:
```json
{
  "total": 150,
  "completed": 120,
  "pending": 20,
  "failed": 10,
  "totalAmount": 15000000
}
```

## 📋 Transaction Statuses

```typescript
enum TransactionStatus {
  PENDING = 'pending',
  AWAITING_PAYMENT = 'awaiting_payment',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}
```

## 🔒 Validation Rules

- `user_id`: Required, must be valid UUID and exist in DB
- `amount`: Required, must be positive number
- `payment_method_id`: Optional, must belong to the user
- `currency`: Optional, defaults to "VND"
- `status`: Optional, defaults to "pending"
- `ip_address`: Optional, must be valid IP

## 🎯 Key Features

1. **Audit Trail**: Every create/update creates transaction_events
2. **Data Integrity**: Validates user and payment method existence
3. **Pagination**: Built-in pagination for all list endpoints
4. **Flexible Filtering**: Multiple filter options for queries
5. **Security**: Cannot delete transactions with refunds
6. **Relations**: Returns related data (user, payment method, events, refunds)
7. **Statistics**: Aggregated data for dashboards

## 📊 Response Format

All list endpoints return paginated response:
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

## 🔗 Integration with Event-Driven Architecture

The service is now ready to integrate with PayOS events:

```typescript
// In PayosListener
@OnEvent('transaction.created')
async handleTransactionCreated(payload: any) {
  // Transaction already exists in DB
  // Call PayOS API
  // Update transaction with external_transaction_id
}

@OnEvent('payment.webhook_received')
async handleWebhook(webhookData: any) {
  // Update transaction status
  await this.transactionService.update(transactionId, {
    status: 'completed',
    external_transaction_id: webhookData.orderCode,
    gateway_response: webhookData
  });
}
```

## 🚀 Next Steps

1. Add authentication/authorization guards
2. Implement webhook endpoint in controller
3. Add EventEmitter integration for async processing
4. Create PayosListener to handle transaction events
5. Add retry mechanism for failed transactions

