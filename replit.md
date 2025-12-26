# Overview

This project is a cross-platform mobile chat application built with React Native and Expo, offering a classic chat experience with modern features. It provides real-time messaging, chat rooms, private conversations, user profiles, and social networking functionalities such as friends lists and online status. The application supports iOS, Android, and Web, incorporating room browsing, favorite management, user leveling, theme customization, and a credit transfer system. An integrated admin panel facilitates content moderation and user/room management, aiming to foster community and interaction.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend

The frontend uses Expo SDK 54, React Native 0.81.4, React 19.1.0, and Expo Router 6.x for navigation. It features a custom component library with theming (light, dark, system-auto), SVG icons, and animations with React Native Gesture Handler and Reanimated. Key features include a multi-tab chat system, dynamic room management, role-based user profiles with a level system, an in-app credit system with PIN authentication, and secure authentication flows. State management is handled by React hooks and Context API.

A React + Vite admin panel (`/admin-panel`) provides management for users, rooms, abuse reports, gifts, and daily login streaks. It includes real-time statistics and JWT-based authentication, with a dark green theme and responsive design.

## Backend

The backend is built with Node.js and Express.js for RESTful APIs and Socket.IO for real-time communication. PostgreSQL (Neon DB) is used for persistent data storage, and Redis Cloud manages presence, rate limiting, and caching. The backend is structured into services for users, rooms, messages, bans, credits, merchants, and games.

### Database Schema

The PostgreSQL database includes tables for `users`, `rooms`, `messages`, `private_messages`, `credit_logs`, `merchants`, `merchant_spend_logs`, `user_levels`, `room_bans`, `game_history`, `user_blocks`, `room_moderators`, `gifts`, `audit_logs`, and `announcements`.

### Redis Usage

Redis manages online user presence, banned user lists, flood control, global rate limiting, and caching, acting as the source of truth for online/offline status.

### Real-time Communication (Socket.IO)

The `/chat` namespace handles real-time events for room interactions, chat and private messages, credit transfers, and game interactions. Private messages are exclusively handled via Socket.IO.

### REST API Endpoints

Key REST API endpoints cover authentication, user data, room management (official, game, favorite), chatroom lifecycle, messages, credit transfers, merchant creation, profile management (follow/block), and admin functionalities. Credit transfers specifically use `POST /api/credit/transfer` requiring `fromUserId`, `toUserId`, `amount`, and bearer token authentication.

### Chat Commands

Users can utilize commands like `/f`, `/uf`, `/kick`, `/me`, `/roll`, `/goal`, `/go`, `/gift`, `/whois`, `/c`, `/block`, `/unblock`. Admin-specific commands include `/unban`, `/suspend`, `/unsuspend`, `/mod`, and `/unmod`.

### Game and Economy Systems

The application includes an XP & Level System, a Merchant Commission System, an Auto Voucher system for credit codes, and a Daily Login Streak System with credit rewards.

### Security Features

The system incorporates eleven layers of security: strict server-side validation, Redis rate limiting, robust error handling and logging, Redis distributed locks, idempotency tracking, PIN attempt limiting with cooldowns, enhanced error message sanitization, JWT token expiry management (15-minute access, 7-day refresh), server-side amount authority to prevent client manipulation, immutable audit log for all transactions, and device binding to prevent token theft.

# External Dependencies

## Core Expo Modules

`expo-router`, `expo-font`, `expo-splash-screen`, `expo-status-bar`, `expo-constants`, `expo-system-ui`, `expo-linking`, `expo-web-browser`, `expo-image`, `expo-blur`, `expo-haptics`, `expo-linear-gradient`.

## UI & Animation Libraries

`react-native-reanimated`, `react-native-gesture-handler`, `react-native-pager-view`, `react-native-svg`, `react-native-safe-area-context`, `react-native-screens`.

## Storage

`@react-native-async-storage/async-storage`.

## Backend Specific Dependencies

`Node.js`, `Express.js`, `Socket.IO`, `PostgreSQL (Neon DB)`, `Redis Cloud`.

## Image Upload

`Cloudinary` for gift image storage.

## API Configuration

**API Base URL**: `https://d1a7ddfc-5415-44f9-92c0-a278e94f8f08-00-1i8qhqy6zm7hx.sisko.replit.dev` (also used for Socket.IO).

---

# 🔐 Security Implementation Details

## 🔐 🔟 Immutable Audit Log (Write-Once)
**Status:** ✅ IMPLEMENTED & PRODUCTION-READY

### Implementation:
- **Immutable Table:** `audit_logs` - write-once, no UPDATE/DELETE allowed
- **Triggers:** Database triggers prevent all modifications
- **Logging Points:**
  1. **Start:** Log with status='pending' when transfer begins
  2. **Success:** Update to status='completed' after transfer succeeds
  3. **Failure:** Update to status='failed' + error_reason if transfer fails

### Fields Logged (Immutable):
- `request_id` - Unique identifier (UNIQUE constraint)
- `from_user_id` / `from_username` - Sender details
- `to_user_id` / `to_username` - Recipient details
- `amount` - Transfer amount (normalized to integer)
- `status` - pending → completed | failed
- `error_reason` - Only populated if status = failed
- `created_at` - Timestamp (immutable)

### Benefits:
✅ **Fraud Investigation:** Complete immutable record of all attempts
✅ **Dispute Resolution:** Cannot tamper with transaction history
✅ **Rollback Support:** Identify which transactions need reversal
✅ **Audit Trail:** Every transfer logged with exact timestamp + status
✅ **Database Level:** Triggers prevent UPDATE/DELETE at database level (cannot be bypassed by app code)

### Access for Admin Panel:
- Fetch by request_id for specific transaction details
- Query by date range for dispute investigation
- Filter by status (pending/completed/failed) for anomaly detection

## 🔐 1️⃣1️⃣ Device Binding (Anti-Token-Theft)
**Status:** ✅ IMPLEMENTED & PRODUCTION-READY

### Implementation:
- **Login:** Generate unique `deviceId` (random 24-char hex) tied to user
- **Token Payload:** Both access & refresh tokens include `deviceId`
- **Validation:** Auth middleware compares `token.deviceId` vs `request.x-device-id` header
- **Rejection Point:** **Front door** (middleware) - before any business logic

### How It Works (Normal Flow):
```
Device A Login:
1. User logs in → Server generates deviceId = "abc123..."
2. Token created with payload: { userId, deviceId: "abc123..." }
3. Frontend stores: deviceId in AsyncStorage
4. Request: Headers include Authorization + x-device-id headers
5. Middleware validates: token.deviceId === request.x-device-id ✅
6. Proceed to business logic

Injection Attack (Device B/Postman):
1. Attacker copies token from Device A
2. Sends request from Device B/Postman
3. Middleware checks: token.deviceId="abc123..." vs request.x-device-id=null or different
4. ❌ REJECTED: "Session expired. Please login again."
5. 🚨 Suspicious activity logged
6. ➡️ NO DB ACCESS, NO TRANSFER LOGIC, NO BALANCE CHANGES
```

### Response On Mismatch:
```json
{
  "success": false,
  "error": "Session expired. Please login again."
}
```

### Security Benefits:
✅ **Immediate Rejection:** Device mismatch = instant 401 at middleware
✅ **No Token Reuse:** Token copied to different device = useless
✅ **Front-Door Defense:** Blocks before touching DB/transfer logic
✅ **Logging:** Server logs suspicious device mismatches for detection
✅ **Complement to JWT Expiry:** Additional layer beyond token expiry

### Frontend Implementation:
- `login.tsx` - Stores `deviceId` from login response in AsyncStorage
- `transfer-credit.tsx` - Sends `x-device-id` header in requests
- `feed.tsx` + all authenticated requests - Include `x-device-id` header
- All authenticated requests must include `x-device-id` header

### Backend Implementation:
- `auth.route.js` - Generates `deviceId` on login, includes in JWT payload
- `auth.js middleware` - Validates `deviceId` before any route handler execution

## 11-Layer Security Summary
✅ **Layer 1:** Strict server-side validation (MIN/MAX amounts: 1,000-1,000,000)
✅ **Layer 2:** Redis rate limiting (5 transfers/min per user)
✅ **Layer 3:** Error handling & logging (server-side, no sensitive client errors)
✅ **Layer 4:** Distributed locks (5-sec TTL to prevent race conditions)
✅ **Layer 5:** Idempotency tracking (request_id UNIQUE prevents duplicate processing)
✅ **Layer 6:** PIN attempt limiting (3 max → 10-min cooldown per IP)
✅ **Layer 7:** Enhanced error message sanitization (no DB/system info leaks)
✅ **Layer 8:** JWT expiry (15-min access + 7-day refresh token rotation)
✅ **Layer 9:** Server-side amount authority (normalized integers, no client manipulation)
✅ **Layer 10:** Immutable audit log (write-once, database-level enforcement)
✅ **Layer 11:** Device binding (token tied to device_id, prevents token theft)

### Updated Files:
- `backend/api/auth.route.js` - Device ID generation + JWT payload
- `backend/middleware/auth.js` - Device ID validation at AUTH layer
- `app/login.tsx` - Store device_id from login response
- `app/transfer-credit.tsx` - Send x-device-id header
- `app/(tabs)/feed.tsx` - Send x-device-id header
- All authenticated API calls - Include x-device-id header

---

# 🔐 Backend Logging & Data Security

## Centralized Logger Implementation
**Status:** ✅ IMPLEMENTED & PRODUCTION-READY

### Logger Utility (`backend/utils/logger.js`)
Prevents data leakage while maintaining audit capability:

```javascript
// Logger Levels:
- INFO     → Normal operation (login success, transfer complete)
- WARN     → Validation failures (invalid PIN, insufficient balance)
- SECURITY → Abuse attempts (rate limit, device mismatch, fraud)
- ERROR    → Internal errors (DB errors, system failures)
```

### Data Masking Features:
✅ **Token Masking:** First 10 + last 4 chars only
✅ **PIN Protection:** Never logged (shows "***")
✅ **Password Protection:** Never logged (shows "***")
✅ **Device ID Masking:** First 8 chars only
✅ **Request Amount:** Marked as "[MASKED]" in fraud logs
✅ **Authorization Header:** Shows "[MASKED]" in logs

### Log Format (Structured):
```json
{
  "timestamp": "2025-12-26T08:05:15.123Z",
  "level": "SECURITY",
  "message": "DEVICE_MISMATCH_DETECTED",
  "data": {
    "userId": 123,
    "endpoint": "/api/credit/transfer"
  }
}
```

### Security Events Logged:
- **AUTH_SUCCESS:** Device binding verified (no tokens logged)
- **AUTH_FAILED:** Token/format errors (safe details only)
- **DEVICE_MISMATCH_DETECTED:** Token theft attempt (userId + endpoint)
- **FRAUD_ATTEMPT:** Amount exceeds max (userId only, no amount)
- **TRANSFER_VALIDATION_FAILED:** Reason for failure
- **TRANSFER_COMPLETED:** Success confirmation with usernames
- **TRANSFER_FAILED:** Error without payload details

### Environment-Based Behavior:
- **Development:** Verbose logging with details (still masked)
- **Production:** Minimal logging, only critical events
- **Never:** Full request bodies, raw tokens, PINs, passwords

### Updated Endpoints:
- `backend/api/auth.route.js` - Login logging with security events
- `backend/api/credit.route.js` - Transfer logging + fraud detection
- `backend/services/creditService.js` - Transfer completion/failure
- `backend/middleware/auth.js` - Device binding validation logs
