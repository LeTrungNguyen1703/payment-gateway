# Quick Start Guide - Keycloak + User Module Integration

## 🚀 Getting Started

### 1. Start Services
```bash
docker-compose up -d
```

This starts:
- ✅ Keycloak (http://localhost:8180)
- ✅ Redis
- ✅ Your NestJS app (http://localhost:3000)

### 2. Configure Keycloak (First Time Only)

#### Access Keycloak Admin Console
- URL: http://localhost:8180
- Username: `admin`
- Password: `admin`

#### Create Realm
1. Click realm dropdown → "Create Realm"
2. Name: `devteria`
3. Click "Create"

#### Create Client
1. Go to "Clients" → "Create client"
2. **General Settings:**
   - Client ID: `devteria_app`
   - Client type: `OpenID Connect`
   - Click "Next"
3. **Capability config:**
   - ✅ Enable "Client authentication"
   - ✅ Enable "Authorization" (optional)
   - Click "Next"
4. **Login settings:**
   - Valid redirect URIs: `http://localhost:3000/*`
   - Web origins: `http://localhost:3000`
   - Click "Save"

#### Get Client Secret
1. Go to "Clients" → `devteria_app` → "Credentials" tab
2. Copy the "Client secret"
3. Update your `.env`:
   ```env
   KEYCLOAK_CLIENT_SECRET=<your-copied-secret>
   ```

#### Create Roles
1. Go to "Realm roles" → "Create role"
2. Create:
   - Role name: `admin` → Save
   - Role name: `user` → Save

#### Create Test User
1. Go to "Users" → "Add user"
2. Fill in:
   - Username: `testuser`
   - Email: `testuser@example.com`
   - Email verified: `ON`
   - First name: `Test`
   - Last name: `User`
3. Click "Create"
4. Go to "Credentials" tab:
   - Click "Set password"
   - Password: `password123`
   - ❌ Uncheck "Temporary"
   - Click "Save"
5. Go to "Role mapping" tab:
   - Click "Assign role"
   - Select `user` role
   - Click "Assign"

### 3. Test the API

#### Get Access Token
```bash
curl -X POST http://localhost:8180/realms/devteria/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=devteria_app" \
  -d "client_secret=22zIfvPGn83xbYguOdUpMCicw9To6qKh" \
  -d "grant_type=password" \
  -d "username=testuser" \
  -d "password=password123"
```

Save the `access_token` from the response.

#### Test Protected Endpoint
```bash
curl -X GET http://localhost:3000/user/profile \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

## 📚 Available Endpoints

### User Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/user/profile` | User | Get current user profile |
| PATCH | `/user/profile/me` | User | Update current user profile |
| GET | `/user/:id` | `user:read` scope | Get user by ID |
| PATCH | `/user/:id` | `user:update` scope | Update user |
| GET | `/user` | Admin | Get all users |
| POST | `/user` | Admin | Create user |
| DELETE | `/user/:id` | Admin | Delete user |

## 🔐 Authentication Flow

1. User logs in → Gets JWT token from Keycloak
2. User sends request with `Authorization: Bearer <token>`
3. NestJS validates token with Keycloak
4. If valid, extracts `keycloak_id` from token
5. Queries database using `keycloak_id`
6. Returns user data

## 🛠️ Development

### Start in Watch Mode
```bash
npm run start:dev
```

### Build
```bash
npm run build
```

### Run Tests
```bash
npm run test
```

## 📝 Environment Variables

Copy `.env.example` to `.env` and update:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/payment_gateway"
KEYCLOAK_REALM=devteria
KEYCLOAK_CLIENT_ID=devteria_app
KEYCLOAK_CLIENT_SECRET=22zIfvPGn83xbYguOdUpMCicw9To6qKh
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8180
```

## 🐛 Troubleshooting

### "401 Unauthorized"
- Token expired → Get a new token
- Invalid token → Check client secret
- Keycloak not running → `docker-compose up -d keycloak`

### "403 Forbidden"
- Missing role → Assign role to user in Keycloak
- Missing scope → Add scope to client in Keycloak

### "Cannot connect to Keycloak"
- Check Keycloak is running: `docker ps`
- Check URL in `.env` matches Keycloak port

## 📖 More Documentation

- [KEYCLOAK_USER_INTEGRATION.md](./KEYCLOAK_USER_INTEGRATION.md) - Detailed integration guide
- [KEYCLOAK_SETUP.md](./KEYCLOAK_SETUP.md) - Keycloak configuration guide

## 🎯 Next Steps

1. ✅ Keycloak is configured
2. ✅ User module integrated
3. 🔲 Add more roles/scopes as needed
4. 🔲 Implement refresh token logic
5. 🔲 Add social login providers
6. 🔲 Implement 2FA

---

**Need help?** Check the detailed documentation or open an issue.

