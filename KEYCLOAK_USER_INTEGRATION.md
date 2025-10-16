# Keycloak Integration with User Module

## Overview
This guide explains how Keycloak is integrated with the User module in this NestJS Payment Gateway application.

## Prerequisites
- Keycloak server running (via Docker Compose)
- PostgreSQL database
- NestJS application with `nest-keycloak-connect` package installed

## Configuration

### Environment Variables
Add these to your `.env` file:

```env
KEYCLOAK_REALM=devteria
KEYCLOAK_CLIENT_ID=devteria_app
KEYCLOAK_CLIENT_SECRET=22zIfvPGn83xbYguOdUpMCicw9To6qKh
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8180
```

## Keycloak Setup Steps

### 1. Start Keycloak
```bash
docker-compose up -d keycloak
```

Access Keycloak at: http://localhost:8180
- Username: `admin`
- Password: `admin`

### 2. Create Realm
1. Click on the realm dropdown (top left)
2. Click "Create Realm"
3. Name: `devteria`
4. Click "Create"

### 3. Create Client
1. Go to "Clients" → "Create client"
2. Client ID: `devteria_app`
3. Client type: `OpenID Connect`
4. Click "Next"
5. Enable "Client authentication" (for confidential client)
6. Enable "Authorization" if needed
7. Click "Next"
8. Valid redirect URIs: `http://localhost:3000/*`
9. Web origins: `http://localhost:3000`
10. Click "Save"

### 4. Get Client Secret
1. Go to "Clients" → `devteria_app` → "Credentials" tab
2. Copy the "Client secret" value
3. Update your `.env` file with this secret: `22zIfvPGn83xbYguOdUpMCicw9To6qKh`

### 5. Create Roles
1. Go to "Realm roles" → "Create role"
2. Create these roles:
   - `admin` - Full access to all resources
   - `user` - Regular user access

### 6. Create Client Scopes (Optional)
1. Go to "Client scopes" → "Create client scope"
2. Create scopes:
   - `user:read` - Read user information
   - `user:update` - Update user information
   - `user:delete` - Delete user information

### 7. Assign Scopes to Client
1. Go to "Clients" → `devteria_app` → "Client scopes" tab
2. Add the created scopes to "Assigned default client scopes" or "Assigned optional client scopes"

### 8. Create Test Users
1. Go to "Users" → "Add user"
2. Fill in details:
   - Username: `testuser`
   - Email: `testuser@example.com`
   - Email verified: `ON`
   - First name: `Test`
   - Last name: `User`
3. Click "Create"
4. Go to "Credentials" tab → "Set password"
5. Set password and disable "Temporary"
6. Go to "Role mapping" tab → "Assign role"
7. Assign appropriate roles (e.g., `user` or `admin`)

## User Module Features

### Authentication & Authorization

The User module uses Keycloak decorators from `nest-keycloak-connect`:

#### 1. **@Roles('role-name')** - Role-based access
```typescript
@Roles('admin')
@Get()
findAll() {
  // Only users with 'admin' role can access
}
```

#### 2. **@Scopes('scope-name')** - Scope-based access
```typescript
@Scopes('user:read')
@Get(':id')
findOne(@Param('id') id: string) {
  // Only users with 'user:read' scope can access
}
```

#### 3. **@Public()** - Public endpoints (no auth required)
```typescript
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

#### 4. **@Resource('resource-name')** - Resource-based access
```typescript
@Resource('user')
@Controller('user')
export class UserController {
  // Controller-level resource definition
}
```

### API Endpoints

#### Public Endpoints
- None (all endpoints require authentication)

#### User Endpoints
- `GET /user/profile` - Get current user profile
- `PATCH /user/profile/me` - Update current user profile

#### Scoped Endpoints
- `GET /user/:id` - Get user by ID (requires `user:read` scope)
- `PATCH /user/:id` - Update user (requires `user:update` scope)

#### Admin Only Endpoints
- `POST /user` - Create user (requires `admin` role)
- `GET /user` - Get all users (requires `admin` role)
- `DELETE /user/:id` - Delete user (requires `admin` role)

## Testing Authentication

### 1. Get Access Token

Use Postman or curl to get an access token:

```bash
curl -X POST http://localhost:8180/realms/devteria/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=devteria_app" \
  -d "client_secret=22zIfvPGn83xbYguOdUpMCicw9To6qKh" \
  -d "grant_type=password" \
  -d "username=testuser" \
  -d "password=yourpassword"
```

Response:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "expires_in": 300,
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer"
}
```

### 2. Use Access Token

Add the token to your requests:

```bash
curl -X GET http://localhost:3000/user/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## User Data Flow

1. **User Authentication**: User logs in via Keycloak
2. **Token Generation**: Keycloak generates JWT token with user info (`sub` = keycloak_id)
3. **Request to API**: User sends request with Bearer token
4. **Token Validation**: NestJS validates token with Keycloak
5. **Extract User Info**: Controller extracts `keycloak_id` from token (`req.user.sub`)
6. **Database Query**: Service queries database using `keycloak_id`
7. **Response**: API returns user data

## Database Schema

The `users` table includes:
- `id` (UUID) - Internal database ID
- `keycloak_id` (VARCHAR) - Keycloak user ID (from token `sub` claim)
- `email` (VARCHAR) - User email
- `full_name` (VARCHAR) - User full name
- `phone` (VARCHAR) - User phone number
- `status` (VARCHAR) - User status (active/inactive)
- `kyc_verified` (BOOLEAN) - KYC verification status
- `kyc_level` (INT) - KYC verification level
- `metadata` (JSON) - Additional user data
- `created_at`, `updated_at`, `last_login_at` (TIMESTAMP)

## Security Best Practices

1. **Always use HTTPS** in production
2. **Store secrets securely** - Use environment variables, never commit secrets
3. **Token expiration** - Configure appropriate token expiration times in Keycloak
4. **Refresh tokens** - Implement refresh token logic for better UX
5. **Role hierarchy** - Define clear role hierarchies in Keycloak
6. **Scope management** - Use scopes for fine-grained access control
7. **Audit logging** - Log all authentication and authorization events

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check if token is valid and not expired
   - Verify `KEYCLOAK_AUTH_SERVER_URL` is correct
   - Ensure client secret matches

2. **403 Forbidden**
   - User doesn't have required role or scope
   - Check role mappings in Keycloak
   - Verify scope assignments to client

3. **Connection refused**
   - Keycloak server not running
   - Check if Keycloak is accessible at configured URL
   - Verify network/firewall settings

4. **Invalid client credentials**
   - Client secret mismatch
   - Client ID incorrect
   - Client type not set to "confidential"

## Development vs Production

### Development (docker-compose)
```env
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8180
```

### Production
```env
KEYCLOAK_AUTH_SERVER_URL=https://keycloak.yourdomain.com
```

Update redirect URIs and web origins in Keycloak client settings accordingly.

## Next Steps

1. Implement refresh token logic
2. Add social login providers (Google, Facebook, etc.)
3. Implement two-factor authentication (2FA)
4. Add user registration endpoint
5. Implement email verification flow
6. Add password reset functionality
7. Create admin dashboard for user management

## Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [nest-keycloak-connect](https://www.npmjs.com/package/nest-keycloak-connect)
- [NestJS Security](https://docs.nestjs.com/security/authentication)

