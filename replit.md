# Overview

This is a mobile chat application built with React Native and Expo, recreating a classic chat experience similar to mig33. The app features real-time messaging, chat rooms, private conversations, user profiles, and a social networking component with friends lists and online status indicators.

The application is designed for cross-platform deployment (iOS, Android, and Web) and includes features like room browsing, favorites management, email notifications, user levels, theme switching, and credit transfer functionality.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

### Framework & Routing
- **Expo SDK 54** with React Native 0.81.4 and React 19.1.0
- **Expo Router 6.x** for file-based navigation with typed routes
- Tab-based navigation with custom swipeable implementation using `PagerView`
- Support for new React Native architecture enabled (`newArchEnabled: true`)

### UI Components & Styling
- **Custom component library** with themed components (`ThemedView`, `ThemedText`)
- **SVG-based icons** using `react-native-svg` for cross-platform consistency
- **Custom gestures** via `react-native-gesture-handler` and animations with `react-native-reanimated`
- **Native platform differentiation** - SF Symbols on iOS, Material Icons elsewhere
- Responsive layouts using React Native StyleSheet API

### Theming System
- **Global theme provider** (`theme/provider.tsx`) with context-based state management
- **Light and dark mode** support with system preference detection
- **Persistent theme storage** using AsyncStorage
- Three theme modes: light, dark, and system-auto
- Predefined color schemes in `theme/index.ts` with type safety

### State Management
- React hooks (`useState`, `useEffect`, `useContext`) for local and global state
- Custom hooks for theme management (`useThemeCustom`)
- No external state management library - uses React Context API

### Navigation Structure
```
app/
├── (tabs)/          # Main tab navigation
│   ├── index.tsx    # Home/Friends screen
│   ├── room.tsx     # Chat rooms browser
│   ├── chat.tsx     # Private chats list
│   └── profile.tsx  # User profile
├── chatroom/[id].tsx    # Dynamic chat room view
├── transfer-credit.tsx  # Credit transfer feature
├── transfer-history.tsx # Transaction history
└── official-comment.tsx # Announcements
```

### Key Features Implementation

**Chat System:**
- Tab-based chat interface with support for multiple concurrent conversations
- Message rendering with system messages, timestamps, and user roles
- Chat input with emoji and menu support
- Real-time-ready architecture (currently using mock data)

**Room Management:**
- Collapsible room categories (Favorites, Recent, What's Hot)
- Room capacity indicators
- Search and refresh functionality
- Dynamic room creation support

**User Profile:**
- Role-based features (merchant vs. regular user)
- Level system with badge display
- Dark mode toggle with persistence
- Menu items for account management, announcements, gift store, leaderboard

**Credit System:**
- Transfer functionality with PIN authentication
- Transaction history with sent/received tracking
- Mock balance display (extensible for real backend)

## External Dependencies

### Core Expo Modules
- **expo-router**: File-based routing and navigation
- **expo-font**: Custom font loading (SpaceMono)
- **expo-splash-screen**: Splash screen management
- **expo-status-bar**: Status bar styling
- **expo-constants**: App configuration access
- **expo-system-ui**: System UI customization
- **expo-linking**: Deep linking support
- **expo-web-browser**: In-app browser for external links
- **expo-image**: Optimized image component
- **expo-blur**: Blur effects for iOS tab bar
- **expo-haptics**: Haptic feedback for iOS interactions

### React Navigation
- **@react-navigation/native**: Core navigation library
- **@react-navigation/bottom-tabs**: Tab navigation implementation
- **@react-navigation/elements**: Navigation UI components
- Navigation theme integration with custom theme system

### UI & Animation
- **react-native-reanimated**: Advanced animations and worklets
- **react-native-gesture-handler**: Touch gesture handling
- **react-native-pager-view**: Swipeable page views for tabs
- **react-native-svg**: Vector graphics rendering
- **react-native-safe-area-context**: Safe area handling
- **react-native-screens**: Native screen optimization

### Storage & Data
- **@react-native-async-storage/async-storage**: Persistent local storage for theme preferences and potentially user data

### Web Support
- **react-dom**: React web rendering
- **react-native-web**: Web compatibility layer
- **metro-runtime**: Metro bundler runtime for web output

### Development Tools
- **TypeScript**: Type safety with strict mode enabled
- **ESLint**: Code linting with Expo configuration
- **Jest**: Testing framework with jest-expo preset
- **Babel**: JavaScript transpilation

### Additional Integrations
- **@expo/ngrok**: Development tunneling for testing
- **react-native-webview**: Embedded web content support (for potential future features)

### Platform-Specific Considerations
- iOS: Uses SF Symbols, haptic feedback, and blur effects
- Android: Material Icons, edge-to-edge display enabled
- Web: Static output with Metro bundler, favicon support

### Extensibility Points
- Chat system ready for WebSocket or real-time database integration
- Credit system prepared for backend API integration
- Authentication system placeholder (currently no auth implementation)
- User roles system in place for future permission management

## Backend Architecture

### Server Stack
- **Node.js** with Express.js framework
- **Socket.IO** for real-time communication
- **PostgreSQL (Neon DB)** for persistent data storage
- **Redis Cloud** for presence, rate limiting, and caching

### Backend Structure
```
backend/
├── server/
│   ├── server.js          # Main Express + Socket.IO server
│   ├── redis.js           # Redis Cloud connection
│   ├── events/            # Socket.IO event handlers
│   │   ├── roomEvents.js      # Join/leave room, kick/ban
│   │   ├── chatEvents.js      # Chat messages
│   │   ├── pmEvents.js        # Private messages
│   │   ├── systemEvents.js    # Auth, presence, user info
│   │   ├── creditEvents.js    # Credit transfer
│   │   ├── merchantEvents.js  # Merchant management
│   │   └── gameEvents.js      # Game system
│   ├── services/          # Business logic
│   │   ├── userService.js
│   │   ├── roomService.js
│   │   ├── messageService.js
│   │   ├── banService.js
│   │   ├── creditService.js
│   │   ├── merchantService.js
│   │   └── gameService.js
│   └── utils/             # Utility functions
│       ├── idGenerator.js
│       ├── presence.js
│       ├── floodControl.js
│       ├── xpLeveling.js
│       └── merchantTags.js
├── api/                   # REST API routes
│   ├── auth.route.js
│   ├── user.route.js
│   ├── room.route.js
│   ├── message.route.js
│   ├── credit.route.js
│   └── merchant.route.js
└── db/
    ├── db.js              # PostgreSQL connection
    └── schema.sql         # Database schema
```

### Database Schema (PostgreSQL)
- **users**: User accounts with role (user/mentor/merchant/admin)
- **rooms**: Chat rooms with owner and capacity
- **room_admins**: Room administrators
- **messages**: Chat messages with room reference
- **private_messages**: PM between users
- **credit_logs**: Transaction history
- **merchants**: Merchant profiles (created by mentors)
- **merchant_spend_logs**: Game spend with 30% commission
- **user_levels**: XP and level tracking
- **room_bans**: Persistent ban records
- **game_history**: Game play records

### Redis Cloud Usage
- **Presence**: `room:{roomId}:users` - Online users in room
- **Banned**: `room:{roomId}:banned` - Banned users
- **Flood Control**: `flood:{userId}:{roomId}` - 700ms rate limit
- **Rate Limit**: `rate:global:{userId}` - 30 msgs/min
- **Merchant Income**: `merchant:{id}:income` - Cached earnings
- **User Socket**: `user:{userId}:socket` - Socket mapping

### Socket.IO Events (Namespace: /chat)
**Room Events:**
- `join_room`, `leave_room` - Room participation
- `room:admin:kick`, `room:admin:ban`, `room:admin:unban`
- `room:users`, `room:info`

**Chat Events:**
- `chat:message` - Send message (700ms anti-flood)
- `chat:messages:get` - Get room history

**PM Events:**
- `pm:send`, `pm:receive` - Private messages
- `pm:unread:get`, `pm:conversations:get`

**Credit Events:**
- `credit:transfer` - Transfer credits
- `credit:balance:get`, `credit:history:get`

**Game Events:**
- `game:play` - Play game (coin_flip, dice_roll, slots, etc.)
- `game:result` - Game outcome
- `game:spend` - Merchant commission (30%)

**Merchant Events:**
- `merchant:create` - Create merchant (mentor only)
- `merchant:disable`, `merchant:enable`
- `merchant:income:get`, `merchant:withdraw`

### REST API Endpoints
- **POST /api/auth/login** - Simple login/register
- **GET /api/users/:id** - User profile with XP/level
- **GET /api/rooms** - List all rooms with user counts
- **GET /api/messages/:roomId** - Room message history
- **POST /api/credits/transfer** - Transfer credits
- **POST /api/merchants/create** - Create merchant (mentor only)
- **GET /api/merchants/income/:id** - Merchant earnings

### XP & Level System
- **Send message**: +1 XP
- **Join room**: +5 XP
- **Play game**: +3 XP
- **Win game**: +10 XP
- **Transfer credit**: +2 XP
- Level thresholds: 100, 300, 600, 1000, 1500... XP

### Merchant Commission System
- Only 30% commission from **game spend**
- No commission from gifts, chat, or transfers
- Only mentors can create/disable merchants
- Earnings cached in Redis, persisted in PostgreSQL

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis Cloud
- `BACKEND_PORT` - Server port (default: 3001)