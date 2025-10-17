# Authentication API Documentation

## Tổng quan

Module Authentication cung cấp các API để đăng nhập, làm mới token và đăng xuất người dùng thông qua Keycloak.

## Endpoints

### 1. Đăng nhập (Login)

**Endpoint:** `POST /auth/login`

**Mô tả:** Đăng nhập người dùng bằng email và mật khẩu

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 300,
  "refresh_expires_in": 1800,
  "token_type": "Bearer"
}
```

**Lỗi:**
- `401 Unauthorized`: Email hoặc mật khẩu không đúng
- `500 Internal Server Error`: Lỗi server

**Cách sử dụng:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

---

### 2. Làm mới Token (Refresh Token)

**Endpoint:** `POST /auth/refresh`

**Mô tả:** Lấy access token mới bằng refresh token

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 300,
  "refresh_expires_in": 1800,
  "token_type": "Bearer"
}
```

**Lỗi:**
- `401 Unauthorized`: Refresh token không hợp lệ hoặc đã hết hạn
- `500 Internal Server Error`: Lỗi server

**Cách sử dụng:**
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

---

### 3. Đăng xuất (Logout)

**Endpoint:** `POST /auth/logout`

**Mô tả:** Đăng xuất người dùng và vô hiệu hóa refresh token

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Cách sử dụng:**
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

---

## Luồng hoạt động

### 1. Đăng nhập lần đầu
```
Client -> POST /auth/login (email, password)
Server -> Keycloak (xác thực)
Keycloak -> Server (access_token, refresh_token)
Server -> Client (tokens)
Server -> Database (cập nhật last_login_at)
```

### 2. Sử dụng Access Token
```
Client -> API Request với header: 
  Authorization: Bearer {access_token}
Server -> Xác thực token với Keycloak
Server -> Xử lý request
```

### 3. Làm mới Token khi hết hạn
```
Client -> POST /auth/refresh (refresh_token)
Server -> Keycloak (lấy token mới)
Keycloak -> Server (access_token mới, refresh_token mới)
Server -> Client (tokens mới)
```

### 4. Đăng xuất
```
Client -> POST /auth/logout (refresh_token)
Server -> Keycloak (vô hiệu hóa token)
Client -> Xóa tokens từ storage
```

---

## Sử dụng Token trong các API khác

Sau khi đăng nhập thành công, sử dụng `access_token` trong header của các request:

```bash
curl -X GET http://localhost:3000/user/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Lưu ý quan trọng

1. **Access Token**: 
   - Có thời gian sống ngắn (mặc định 5 phút)
   - Sử dụng để xác thực các API request
   - Lưu trong memory hoặc session storage

2. **Refresh Token**:
   - Có thời gian sống dài hơn (mặc định 30 phút)
   - Sử dụng để lấy access token mới
   - Lưu an toàn (httpOnly cookie hoặc secure storage)

3. **Security Best Practices**:
   - Không lưu tokens trong localStorage nếu có thể
   - Sử dụng HTTPS trong production
   - Xử lý token expiration một cách graceful
   - Implement token refresh tự động trước khi token hết hạn

---

## Testing với Swagger

Truy cập Swagger UI tại: `http://localhost:3000/api`

1. Mở endpoint `/auth/login`
2. Click "Try it out"
3. Nhập email và password
4. Click "Execute"
5. Copy `access_token` từ response
6. Click nút "Authorize" ở đầu trang
7. Paste token vào field "Value" (với prefix "Bearer ")
8. Bây giờ bạn có thể test các protected endpoints

---

## Ví dụ Integration với Frontend

### React/Next.js Example

```typescript
// auth.service.ts
export const authService = {
  async login(email: string, password: string) {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const data = await response.json();
    // Lưu tokens
    sessionStorage.setItem('access_token', data.access_token);
    sessionStorage.setItem('refresh_token', data.refresh_token);
    
    return data;
  },
  
  async refreshToken() {
    const refreshToken = sessionStorage.getItem('refresh_token');
    
    const response = await fetch('http://localhost:3000/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    
    if (!response.ok) {
      // Redirect to login
      this.logout();
      throw new Error('Token refresh failed');
    }
    
    const data = await response.json();
    sessionStorage.setItem('access_token', data.access_token);
    sessionStorage.setItem('refresh_token', data.refresh_token);
    
    return data;
  },
  
  async logout() {
    const refreshToken = sessionStorage.getItem('refresh_token');
    
    if (refreshToken) {
      await fetch('http://localhost:3000/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
    
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
  },
};

// API interceptor
export const apiClient = {
  async fetch(url: string, options: RequestInit = {}) {
    const accessToken = sessionStorage.getItem('access_token');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    // Nếu token hết hạn, refresh và thử lại
    if (response.status === 401) {
      await authService.refreshToken();
      const newAccessToken = sessionStorage.getItem('access_token');
      
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newAccessToken}`,
        },
      });
    }
    
    return response;
  },
};
```

---

## Troubleshooting

### Lỗi 401 khi login
- Kiểm tra email và password có đúng không
- Kiểm tra user đã được tạo trong Keycloak chưa
- Kiểm tra Keycloak service có đang chạy không

### Lỗi 500 Internal Server Error
- Kiểm tra environment variables (KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET)
- Kiểm tra logs để xem chi tiết lỗi
- Đảm bảo Keycloak client có grant_type "password" được enable

### Token refresh không hoạt động
- Kiểm tra refresh token còn hạn không
- Kiểm tra Keycloak client settings (Refresh Token Timeout)

---

## Environment Variables cần thiết

```env
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=your-realm
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret
```

