# Overview

This project is a cross-platform mobile chat application built with React Native and Expo, designed to offer a classic chat experience. It features real-time messaging, chat rooms, private conversations, user profiles, and social networking functionalities like friends lists and online status. The application supports iOS, Android, and Web, incorporating room browsing, favorite management, user leveling, theme customization, and a credit transfer system. The goal is to create an engaging social platform that fosters community and interaction, reminiscent of early chat services.

## Latest Changes (December 24, 2025 - Block User Feature)

- **Block User System**: Complete multi-part implementation
  - Database table `user_blocks` for storing blocked user relationships
  - Backend API endpoints: POST `/api/profile/block`, `/api/profile/unblock`, GET `/api/profile/blocked`
  - Chat command: `/block [username]` - Response: "You have blocked [username]" (private response, no colon)
  - Frontend menu option in MenuParticipantsModal: "Block User" with response dialog
  - Response message: "You have blocked [username]" (no colon, brown text #8B6F47)
  - **Blocked users cannot see messages from blocker in rooms** - Sender's messages filtered from blocked users' views via socket filtering
  - **Blocked users cannot initiate private chats with blocker** - Private message rejected with "You has blocked" response

## Latest Changes (Previous - December 24, 2025)

- **Private Chat Feature**: Complete multi-tab integration with clean UI
  - PrivateChatHeader: Back button, user avatar, username, level badge (from assets/ic_level), follow icon, 3-dot menu (#0a5229 dark green)
  - PrivateChatInput: Clean message input with ONLY emoji picker and send button (NO menu lines icon, NO coin icon)
  - PrivateChatInstance: Renders private chats as tabs in chatroom multi-tab system with standalone header and input
  - ChatRoomTabs: Intelligently detects private chats (roomId: `pm_${username}`) and renders appropriate component
  - MenuParticipantsModal: "Private Chat" option opens as new tab in chatroom tabs (same as regular rooms)
  - Layout optimization: Hides chatroom header and input when private chat is active, shows only PrivateChatHeader + PrivateChatInput
  - Displays ChatRoomContent for messages and supports emoji picker integration

- **Kick Command Response Message**: Added response display for non-admin users
  - Non-admin `/kick [username]` now shows instant feedback message
  - Success: `✅ You started a vote to kick [username]. Paid 500 IDR. [N] votes needed to kick.`
  - Error: `You don't have credite for start kick` (if insufficient credits)
  - Fixed chatEvents.js to emit `chat:message` response on kick initiation
  - Added generateMessageId import to roomEvents.js

- **User Entry Message Order**: Fixed message display order
  - Join messages now appear in correct order: Welcome (0ms) → Managed by (100ms) → Currently users (200ms) → Has entered (300ms)
  - "Has entered" message now appears BELOW "Currently users" as expected

- **User See Own Entry Message**: Users now see their own "has entered" message
  - Changed broadcast from `socket.broadcast.to()` to `io.to()` to include joining user

- **Kick Menu User List Fix**: Fixed Redis handling for participant list display
  - Backend was emitting `room:participants:list` event but frontend was listening for `room:participants:update`
  - Fixed backend to emit correct `room:participants:update` event when `/room:get-participants` is requested
  - Frontend properly displays user list in kick menu modal via Redis participant data
  - Uses `getRoomParticipantsWithNames` from redisUtils to fetch active room participants

- **Follow/Unfollow Message Formatting**: Updated message styling with brown color
  - Follow message: "You are now follow [username]" (brown text, no checkmark, no ellipsis)
  - Unfollow message: "You are now unfollow [username]" (brown text, no checkmark, no ellipsis)
  - Color: #8B6F47 (brown) for follow/unfollow messages
  - Removed emoji icons and ellipsis from responses
  - Frontend properly handles messageType prop for styling

- **Accept Follow Button Fix**: Implemented smart fallback for follow notifications
  - Notification can have fromUserId OR just username
  - Frontend fetches user ID from username if fromUserId is missing via /api/users/username/:username
  - Success alert on accept: "✅ Full Accepted - You are now following [username]!"
  - Success alert on reject: "✅ Rejected - You rejected [username]'s follow request"

- **Command /me Enhancement**: Updated to support both text and no-text usage
  - `/me` (no text): Shows only username: "migxtes4"
  - `/me <action>`: Shows with formatting: "** migxtes4 <action> **"

- **Unfollow Command**: Implemented `/uf [username]` command
  - Command unfollows a user and removes from contact list
  - Private response: "You are now unfollow [username]"
  - Checks if user exists and if currently following before unfollowing
  - Integrated with profileService.unfollowUser()

- **Follow Notification System**: Follow requests with request-accept workflow
  - `/f [username]` sends follow request (notification WITHOUT saving to DB)
  - Target user receives notification with Accept/Reject buttons
  - Follow relationship ONLY saved after acceptance
  - Both users must accept to see each other in contact lists

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend uses **Expo SDK 54**, **React Native 0.81.4**, and **React 19.1.0**, with **Expo Router 6.x** for navigation. It features a **custom component library** with themed components and **SVG-based icons** for a consistent UI. **React Native Gesture Handler** and **Reanimated** are used for custom gestures and animations. The application includes a comprehensive **theming system** supporting light, dark, and system-auto modes, with persistent storage. Navigation is tab-based with a custom swipeable implementation. Key features include a multi-tab chat system, dynamic room management, role-based user profiles with a level system, an in-app credit system with PIN authentication, and secure authentication flows. State management relies on React's built-in hooks and Context API.

## Backend Architecture

The backend is built with **Node.js** and **Express.js** for RESTful APIs, and **Socket.IO** for real-time communication. **PostgreSQL (Neon DB)** is used for persistent data storage, while **Redis Cloud** handles presence, rate limiting, and caching. The backend is structured into services for users, rooms, messages, bans, credits, merchants, and games.

### Database Schema

The PostgreSQL database includes tables for `users`, `rooms` (with 'general', 'official', 'game' categories), `messages`, `private_messages`, `credit_logs`, `merchants`, `merchant_spend_logs`, `user_levels`, `room_bans`, and `game_history`.

### Redis Usage & Presence Management

Redis is crucial for managing online user presence with a **TTL-based system** (6-hour TTL, refreshed by client heartbeats), ensuring accurate participant counts and graceful cleanup of disconnected users. It also handles banned user lists, flood control, global rate limiting, and caching.

### Real-time Communication (Socket.IO)

The `/chat` namespace facilitates real-time events such as joining/leaving rooms, sending/receiving chat and private messages, credit transfers, and game interactions.

### REST API Endpoints

Key REST API endpoints include authentication (`/api/auth/login`), user data (`/api/users/:id`), room management (`/api/rooms`, `/api/rooms/official`, `/api/rooms/game`, `/api/rooms/recent/:username`, `/api/rooms/favorites/:username`), chatroom lifecycle (`/api/chatroom/:roomId/join`, `/api/chatroom/:roomId/leave`), messages (`/api/messages/:roomId`), credit transfers (`/api/credits/transfer`), merchant creation (`/api/merchants/create`), and profile endpoints for follows (`/api/profile/follow`, `/api/profile/follow/accept`, `/api/profile/follow/reject`).

### Commands

Chat commands available to users:
- `/f [username]` - Send follow request to a user (private response, target user gets Accept/Reject notification)
  - Follow relationship is ONLY saved after target accepts the request
  - Both users must accept to see each other in contact lists
- `/uf [username]` - Unfollow a user and remove from contact list (private response)
- `/kick [username]` - Kick a user from the room (all roles)
  - Admin: Instant kick with global ban after 3 kicks
  - Non-admin: Starts vote kick (requires payment, votes from other users)
- `/me <action>` - Perform an action
- `/roll` - Roll a random number (1-100)
- `/gift <name> <username>` - Send a gift
- `/c <code>` - Claim free credits using voucher code
- `/unban <username>` - Admin only: Unban a user from all rooms
- `/suspend <username>` - Admin only: Suspend a user's account
- `/unsuspend <username>` - Admin only: Unsuspend a user's account

Commands starting with `/f` and `/uf` are special - they send private responses visible only to the sender.

### Game and Economy Systems

The application includes an **XP & Level System** where users earn experience for various actions. A **Merchant Commission System** allows mentors to create merchants who earn commissions. An **Auto Voucher system** broadcasts free credit codes to active rooms, allowing users to claim credits with a cooldown.

# External Dependencies

## Core Expo Modules

`expo-router`, `expo-font`, `expo-splash-screen`, `expo-status-bar`, `expo-constants`, `expo-system-ui`, `expo-linking`, `expo-web-browser`, `expo-image`, `expo-blur`, `expo-haptics`, `expo-linear-gradient`.

## UI & Animation Libraries

`react-native-reanimated`, `react-native-gesture-handler`, `react-native-pager-view`, `react-native-svg`, `react-native-safe-area-context`, `react-native-screens`.

## Storage

`@react-native-async-storage/async-storage`.

## Backend Specific Dependencies

`Node.js`, `Express.js`, `Socket.IO`, `PostgreSQL (Neon DB)`, `Redis Cloud`.

## API Configuration

**API Base URL**: `https://c1a0709e-b20d-4687-ab11-e0584b9914f2-00-pfaqheie55z6.pike.replit.dev` (also used for Socket.IO).