# Overview

This project is a cross-platform mobile chat application, built with React Native and Expo, designed to replicate a classic chat experience. It offers real-time messaging, chat rooms, private conversations, user profiles, and social networking features like friends lists and online status. The application supports iOS, Android, and Web deployment, incorporating features such as room browsing, favorite management, user leveling, theme customization, and a credit transfer system. The overarching vision is to create a dynamic and engaging social platform reminiscent of early chat services, fostering community and interaction.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Updates (Dec 22, 2025)

## Message Send Validation - Left Room Warning
- **Frontend Check**: Before sending message, checks if `currentUsername` exists in `roomUsers` array
- **User Experience**: If user left the room but tab is still open, shows alert: "You are not in the room {roomName}"
- **Implementation**: Added check in `handleSendMessage()` function to validate room membership
- **Prevents**: Messages being sent after user leaves, avoiding "not in room" backend errors

## Room Participant Sync - Redis Set as Single Source of Truth
- **Backend Redis Storage**: `room:{roomId}:participants` = Redis Set of usernames (classic MIG33 style)
- **Functions Updated**:
  - `addRoomParticipant(roomId, username)` - adds username to Set
  - `removeRoomParticipant(roomId, username)` - removes username from Set
  - `getRoomParticipants(roomId)` - returns array of usernames from Set
- **Socket Events**:
  - On join/rejoin: add to set, emit `room:participants:update` with full list to all users
  - On leave/disconnect/kick: remove from set, emit `room:participants:update`
- **Frontend Behavior**:
  - Listens to `room:participants:update` with participant list (string array)
  - Updates roomUsers state instantly
  - MenuKickModal automatically excludes current user
  - "Currently users in the room" always matches participant list

# Earlier Updates (Dec 21, 2025)

## Feed System - Anonymous Posts Filtering & Avatars
- **Backend**: Posts without username or with "Anonymous" are filtered out at API level (normalizeFeedItem)
- **Frontend**: Double filter in normalizeFeedArray removes null/Anonymous usernames
- **Avatar Display**: 40x40px rounded avatars now display in feed posts (from user database or placeholder)

## Chat Tab - Room List Real-time Updates
- **ChatList.tsx**: Now fetches joined rooms from `/api/chat/list/:username` with proper error logging
- **ChatItem.tsx**: Accepts roomId parameter, uses SVG room icon, displays last message with timestamp
- **Real-time**: Socket listeners for chatlist:update, chatlist:roomJoined, chatlist:roomLeft automatically reload room list
- **Navigation**: Clicking room uses actual roomId from backend for proper navigation to chatroom

# System Architecture

## Frontend Architecture

### Core Technologies
The frontend is built using **Expo SDK 54**, **React Native 0.81.4**, and **React 19.1.0**, leveraging **Expo Router 6.x** for file-based navigation. It supports the new React Native architecture and is designed for cross-platform consistency.

### UI/UX Design
A **custom component library** with themed components (`ThemedView`, `ThemedText`) and **SVG-based icons** ensures a consistent look. **React Native Gesture Handler** and **Reanimated** provide custom gestures and animations. The app features responsive layouts and platform-specific UI elements (SF Symbols on iOS, Material Icons elsewhere). A comprehensive **theming system** supports light, dark, and system-auto modes, with persistent storage via AsyncStorage and predefined color schemes. The current active theme incorporates an emerald gradient.

### Navigation and Features
The application uses tab-based navigation with a custom swipeable implementation via `PagerView`. Key features include:
- **Chat System**: Multi-tab interface supporting concurrent conversations, message rendering, emoji support, and a real-time ready architecture.
- **Room Management**: Collapsible categories, capacity indicators, search, and dynamic room creation.
- **User Profile**: Role-based features, a level system with badge display, and account management options.
- **Credit System**: In-app credit transfer with PIN authentication and transaction history.
- **Authentication**: Login and signup screens with teal/cyan gradients, "remember me" functionality, and email validation.
- **Splash Screen**: Custom animated splash screen with a gradient background and dynamic elements.

### State Management
React's built-in hooks (`useState`, `useEffect`, `useContext`) and the Context API are used for both local and global state management, without external state libraries.

## Backend Architecture

### Server Stack
The backend is powered by **Node.js** with **Express.js** for RESTful APIs and **Socket.IO** for real-time communication. **PostgreSQL (Neon DB)** is used for persistent data storage, and **Redis Cloud** handles presence, rate limiting, and caching.

### Backend Structure and Services
The backend is organized into services for users, rooms, messages, bans, credits, merchants, and games. It includes dedicated Socket.IO event handlers for various functionalities such as room events, chat messages, private messages, system events, credit transfers, merchant management, and games.

### Database Schema
The PostgreSQL database includes tables for `users`, `rooms`, `messages`, `private_messages`, `credit_logs`, `merchants`, `merchant_spend_logs`, `user_levels`, `room_bans`, and `game_history`.

The `rooms` table includes a `category` column with values: 'general' (default), 'official', and 'game'.

### Redis Usage & Presence Management
Redis is utilized for managing online user presence in rooms, banned user lists, flood control, global rate limiting, caching merchant income, and mapping user IDs to socket connections.

#### Redis TTL Presence System (Single Source of Truth)
Implemented for clean and reliable participant/viewer count management. Key design:
- **Key Format**: `room:{roomId}:user:{userId}` with **6-hour TTL (21600 seconds)**
- **Value**: User presence JSON (socketId, username, timestamp)
- **Client Heartbeat**: Frontend emits `room:heartbeat` every 28 seconds to refresh TTL
- **Server Cleanup Job**: Runs every 60 seconds via `startPresenceCleanup()` to detect expired presences and emit `room:force-leave` events to clients
- **Participant List**: Always fetched from Redis TTL keys via `getRoomParticipants()`, never from DB/Set
- **Server Startup**: Automatically clears legacy Redis keys (`room:users:*`, `room:participants:*`, `room:userRoom:*`) on startup for clean state
- **Guarantees**: 
  - No ghost users after server restart (legacy keys cleared, participants recalculated from TTL keys only)
  - No stale participant data (6-hour TTL + heartbeat refresh)
  - Graceful cleanup of timed-out connections (force-leave event to client)
  - Accurate viewer count always (count = number of active TTL keys in room)

### Real-time Communication (Socket.IO)
The `/chat` namespace handles a wide array of real-time events, including joining/leaving rooms, sending/receiving chat messages, private messages, credit transfers, and game interactions.

### REST API Endpoints
Key API endpoints include:
- `/api/auth/login` - User authentication
- `/api/users/:id` - User data
- `/api/rooms` - Room listing, details, favorites, recent (READ operations)
- `/api/rooms/official` - Get official rooms (category='official')
- `/api/rooms/game` - Get game rooms (category='game')
- `/api/rooms/recent/:username` - Get user's recent rooms
- `/api/rooms/favorites/:username` - Get user's favorite rooms
- `/api/chatroom/:roomId/join` - Join chatroom (lifecycle)
- `/api/chatroom/:roomId/leave` - Leave chatroom (lifecycle)
- `/api/chatroom/:roomId/participants` - Get room participants
- `/api/chatroom/:roomId/status` - Get room status
- `/api/messages/:roomId` - Room messages
- `/api/credits/transfer` - Credit transfers
- `/api/merchants/create` - Merchant creation

**Note**: The legacy `/api/rooms/join` and `/api/rooms/leave` endpoints are deprecated. Use `/api/chatroom/:roomId/join` and `/api/chatroom/:roomId/leave` instead.

### Game and Economy Systems
- **XP & Level System**: Users gain XP for various actions (sending messages, joining rooms, playing/winning games, transferring credits) to progress through levels.
- **Merchant Commission System**: Mentors can create merchants who earn a 30% commission from game spend.
- **Free Credit Claim System (Auto Voucher)**: Automatic voucher system that broadcasts free credit codes to all active rooms. Features include:
  - Auto-generated 7-digit codes every 30 minutes
  - Each voucher expires after 60 seconds
  - Random IDR amount between configured min/max (default: 500-1000 IDR)
  - Users claim via `/c <code>` chat command
  - 30-minute cooldown per user after successful claim
  - Users can only claim each voucher once
  - Private claim responses (not broadcast to room)
  - Voucher announcement broadcast to all active rooms via `chat:message` event

# External Dependencies

## Core Expo Modules
- `expo-router`: Navigation and routing.
- `expo-font`: Custom font loading.
- `expo-splash-screen`: Splash screen management.
- `expo-status-bar`: Status bar styling.
- `expo-constants`: App configuration.
- `expo-system-ui`: System UI customization.
- `expo-linking`: Deep linking.
- `expo-web-browser`: In-app browser.
- `expo-image`: Optimized image component.
- `expo-blur`: Blur effects (iOS).
- `expo-haptics`: Haptic feedback (iOS).
- `expo-linear-gradient`: Gradient styling.

## UI & Animation Libraries
- `react-native-reanimated`: Advanced animations.
- `react-native-gesture-handler`: Touch gestures.
- `react-native-pager-view`: Swipeable page views.
- `react-native-svg`: Vector graphics.
- `react-native-safe-area-context`: Safe area handling.
- `react-native-screens`: Native screen optimization.

## Storage
- `@react-native-async-storage/async-storage`: Persistent local storage.

## Development Tools & Integrations
- `TypeScript`: For type safety.
- `ESLint`: Code linting.
- `Jest`: Testing framework.
- `Babel`: JavaScript transpilation.
- `@expo/ngrok`: Development tunneling.
- `react-native-webview`: Embedded web content (for future use).

## Backend Specific Dependencies
- `Node.js`: Runtime environment.
- `Express.js`: Web framework.
- `Socket.IO`: Real-time communication library.
- `PostgreSQL (Neon DB)`: Primary database.
- `Redis Cloud`: Caching and real-time data store.

## API Configuration
- **API Base URL**: `https://c1a0709e-b20d-4687-ab11-e0584b9914f2-00-pfaqheie55z6.pike.replit.dev`
- Socket.IO connection also uses `API_BASE_URL`.