# Hướng dẫn Setup Keycloak với Docker Compose

## Bước 1: Khởi động Docker Compose

```bash
docker-compose up -d
```

Keycloak sẽ chạy tại: http://localhost:8180

## Bước 2: Đăng nhập vào Keycloak Admin Console

1. Truy cập: http://localhost:8180
2. Click vào **Administration Console**
3. Đăng nhập với:
   - Username: `admin`
   - Password: `admin`

## Bước 3: Tạo Realm mới

1. Click vào dropdown "master" ở góc trên bên trái
2. Click **Create Realm**
3. Nhập Realm name: `devteria`
4. Click **Create**

## Bước 4: Tạo Client

1. Trong realm `devteria`, vào menu **Clients**
2. Click **Create client**
3. Điền thông tin:
   - **Client type**: OpenID Connect
   - **Client ID**: `devteria_app`
4. Click **Next**
5. Cấu hình Capability:
   - ✅ Client authentication: **ON**
   - ✅ Authorization: **OFF** (hoặc ON nếu cần)
   - Authentication flow:
     - ✅ Standard flow
     - ✅ Direct access grants
6. Click **Next**
7. Valid redirect URIs:
   - `http://localhost:3001/*`
   - `http://localhost:3000/*` (nếu có frontend)
8. Web origins:
   - `http://localhost:3001`
   - `http://localhost:3000`
9. Click **Save**

## Bước 5: Lấy Client Secret

1. Vào client `devteria_app` vừa tạo
2. Chọn tab **Credentials**
3. Copy **Client secret**
4. Cập nhật vào file `.env`:
   ```
   KEYCLOAK_CLIENT_SECRET=your-secret-here
   ```
   
   **Lưu ý**: Secret đã được cấu hình sẵn là `22zIfvPGn83xbYguOdUpMCicw9To6qKh`. Nếu Keycloak generate secret khác, hãy cập nhật lại.

## Bước 6: Tạo User

1. Vào menu **Users**
2. Click **Add user**
3. Điền thông tin:
   - Username: `testuser`
   - Email: `testuser@example.com`
   - Email verified: **ON**
   - First name: `Test`
   - Last name: `User`
4. Click **Create**
5. Chọn tab **Credentials**
6. Click **Set password**
   - Password: `password123`
   - Temporary: **OFF**
7. Click **Save**

## Bước 7: Tạo Roles (Optional)

1. Vào menu **Realm roles**
2. Click **Create role**
3. Tạo các roles:
   - `admin`
   - `user`
   - `moderator`

## Bước 8: Gán Role cho User

1. Vào **Users** → chọn user `testuser`
2. Chọn tab **Role mapping**
3. Click **Assign role**
4. Chọn roles cần gán (ví dụ: `user`, `admin`)
5. Click **Assign**

## Bước 9: Test Authentication

### Lấy Access Token

```bash
curl -X POST http://localhost:8180/realms/devteria/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=devteria_app" \
  -d "client_secret=22zIfvPGn83xbYguOdUpMCicw9To6qKh" \
  -d "grant_type=password" \
  -d "username=testuser" \
  -d "password=password123"
```

Response sẽ chứa `access_token`.

### Test Protected Route

```bash
curl -X GET http://localhost:3001/protected \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test Public Route

```bash
curl -X GET http://localhost:3001/health
```

## Cấu hình cho Production

Khi deploy lên production, cập nhật `.env`:

```env
KEYCLOAK_REALM=devteria
KEYCLOAK_CLIENT_ID=devteria_app
KEYCLOAK_CLIENT_SECRET=your-production-secret
KEYCLOAK_AUTH_SERVER_URL=https://your-keycloak-domain.com
```

Và trong `docker-compose.yml`, cập nhật environment cho service `app`:

```yaml
environment:
  KEYCLOAK_BASE_URL: http://keycloak:8080  # Internal network
  # hoặc external URL nếu Keycloak deploy riêng
```

## Troubleshooting

### Lỗi: Connection refused

- Đảm bảo Keycloak đã khởi động xong: `docker-compose ps`
- Check logs: `docker-compose logs keycloak`

### Lỗi: Invalid client credentials

- Verify client_id và client_secret trong `.env`
- Kiểm tra Client Authentication đã bật trong Keycloak

### Lỗi: User not found

- Đảm bảo đã tạo user và set password
- Kiểm tra realm name đúng

