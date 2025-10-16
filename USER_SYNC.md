# User Synchronization: Keycloak ↔ Database

## Tổng quan

Khi bạn tạo user qua endpoint `POST /user`, hệ thống sẽ **TỰ ĐỘNG** tạo user ở cả 2 nơi:
1. ✅ **Keycloak** - Quản lý authentication & authorization
2. ✅ **PostgreSQL Database** - Lưu thông tin business logic

## Quy trình tạo user

```
POST /user
  ↓
  1. Check email tồn tại chưa (database)
  ↓
  2. Tạo user trong Keycloak
     - Username = email
     - Set password
     - Assign role 'user' mặc định
  ↓
  3. Tạo user trong Database
     - Lưu keycloak_id từ Keycloak
     - Lưu thông tin user khác
  ↓
  4. Return user info (không bao gồm password)
```

## API Request

### Tạo User Mới

```bash
POST http://localhost:3000/user
Content-Type: application/json
Authorization: Bearer <ADMIN_TOKEN>

{
  "email": "newuser@example.com",
  "password": "SecurePassword123",
  "full_name": "Nguyen Van A",
  "phone": "+84123456789"
}
```

### Response

```json
{
  "id": "uuid-database-id",
  "keycloak_id": "uuid-keycloak-id",
  "email": "newuser@example.com",
  "full_name": "Nguyen Van A",
  "phone": "+84123456789",
  "status": "active",
  "created_at": "2025-10-16T10:00:00Z"
}
```

## Đồng bộ Operations

### ✅ CREATE
- Tạo user ở Keycloak trước
- Nếu thành công → Tạo ở database
- Nếu database fail → **Rollback**: Xóa user ở Keycloak

### ✅ UPDATE
- Cập nhật database
- Đồng bộ thay đổi (email, full_name) sang Keycloak
- Tất cả updates được log

### ✅ DELETE
- Xóa ở database trước
- Sau đó xóa ở Keycloak
- Không thể rollback operation này

## Keycloak Admin Service

Service mới: `KeycloakAdminService` cung cấp các methods:

```typescript
// Tạo user
await keycloakAdmin.createUser({
  email: 'user@example.com',
  password: 'password',
  firstName: 'John',
  lastName: 'Doe',
  enabled: true,
  emailVerified: true
});

// Cập nhật user
await keycloakAdmin.updateUser(keycloakId, {
  firstName: 'Updated Name'
});

// Xóa user
await keycloakAdmin.deleteUser(keycloakId);

// Quản lý roles
await keycloakAdmin.assignRole(keycloakId, 'admin');
await keycloakAdmin.removeRole(keycloakId, 'user');

// Lấy thông tin
await keycloakAdmin.getUserById(keycloakId);
```

## Security

### Authentication với Keycloak Admin API
Service sử dụng **Client Credentials** flow:
- Grant type: `client_credentials`
- Client ID: `devteria_app`
- Client Secret: Từ environment variables
- Tự động refresh token khi expired

### Permissions
Để sử dụng Admin API, client `devteria_app` cần:
1. **Service Account Enabled**
2. **Client Roles** được assign:
   - `manage-users`
   - `view-users`
   - `manage-realm`

## Cấu hình Client trong Keycloak

### Bước 1: Enable Service Account
1. Go to `Clients` → `devteria_app`
2. Settings tab:
   - ✅ Client authentication: ON
   - ✅ Service accounts roles: ON
   - ✅ Authorization: ON (optional)
3. Save

### Bước 2: Assign Service Account Roles
1. Go to `Clients` → `devteria_app` → `Service accounts roles` tab
2. Click "Assign role"
3. Filter by clients: `realm-management`
4. Assign these roles:
   - `manage-users`
   - `view-users`
   - `query-users`
   - `query-groups`
   - `manage-realm` (if needed)
5. Click "Assign"

## Error Handling

### User đã tồn tại
```json
{
  "statusCode": 409,
  "message": "User with this email already exists"
}
```

### Keycloak connection failed
```json
{
  "statusCode": 500,
  "message": "Failed to create user in Keycloak"
}
```

### Rollback scenario
```
1. Keycloak: User created ✅
2. Database: User creation failed ❌
   → Auto rollback: Delete user from Keycloak ✅
```

## Testing

### 1. Tạo user mới
```bash
# Get admin token
curl -X POST http://localhost:8180/realms/devteria/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=devteria_app" \
  -d "client_secret=22zIfvPGn83xbYguOdUpMCicw9To6qKh" \
  -d "grant_type=client_credentials"

# Create user
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{
    "email": "testuser@example.com",
    "password": "Password123",
    "full_name": "Test User",
    "phone": "+84987654321"
  }'
```

### 2. Verify trong Keycloak
1. Login to Keycloak Admin: http://localhost:8180
2. Go to Users
3. Tìm user vừa tạo
4. Check roles, credentials, etc.

### 3. Verify trong Database
```sql
SELECT * FROM users WHERE email = 'testuser@example.com';
```

### 4. Test login với user mới
```bash
curl -X POST http://localhost:8180/realms/devteria/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=devteria_app" \
  -d "client_secret=22zIfvPGn83xbYguOdUpMCicw9To6qKh" \
  -d "grant_type=password" \
  -d "username=testuser@example.com" \
  -d "password=Password123"
```

## Logs

Service có logging chi tiết:

```
[KeycloakAdminService] Keycloak Admin Client authenticated successfully
[UserService] Creating user in Keycloak: testuser@example.com
[KeycloakAdminService] User created in Keycloak: abc-123-keycloak-id
[KeycloakAdminService] Password set for user: abc-123-keycloak-id
[KeycloakAdminService] Role 'user' assigned to user: abc-123-keycloak-id
[UserService] Creating user in database with Keycloak ID: abc-123-keycloak-id
[UserService] User created successfully: xyz-456-database-id
```

## Best Practices

### ✅ DO
- Luôn validate email format
- Sử dụng password mạnh (min 6 chars trong production nên 12+)
- Log tất cả operations cho audit trail
- Handle errors properly với try-catch

### ❌ DON'T
- Không expose password trong response
- Không skip validation
- Không delete users mà không log
- Không hardcode credentials

## Troubleshooting

### Error: "Keycloak client credentials not configured"
**Solution**: Kiểm tra `.env` file có đủ:
```env
KEYCLOAK_CLIENT_ID=devteria_app
KEYCLOAK_CLIENT_SECRET=your-secret
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8180
KEYCLOAK_REALM=devteria
```

### Error: "403 Forbidden" khi tạo user
**Solution**: Client chưa có service account roles
- Enable service accounts roles
- Assign `manage-users` role

### Error: Connection timeout
**Solution**: 
- Keycloak có đang chạy không? `docker ps`
- Network có OK không?
- URL có đúng không?

## Migration từ hệ thống cũ

Nếu bạn đã có users trong database nhưng chưa có ở Keycloak:

1. Tạo migration script
2. Với mỗi user trong database:
   - Tạo user trong Keycloak
   - Update `keycloak_id` trong database
   - Set temporary password
   - Gửi email reset password

## Future Improvements

- [ ] Implement event sourcing cho better audit trail
- [ ] Add webhook notifications khi user created
- [ ] Sync periodic để đảm bảo consistency
- [ ] Implement soft delete thay vì hard delete
- [ ] Add bulk user import/export
- [ ] Two-way sync: Keycloak → Database (hiện tại chỉ Database → Keycloak)

---

**Tóm lại**: Bây giờ khi bạn `POST /user`, nó sẽ tự động tạo user ở cả Keycloak VÀ Database! 🎉

