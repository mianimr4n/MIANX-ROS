# 📱 MOBILE PROJECT STRUCTURE

> React Native & Expo project structure for Telepizza Platform mobile apps

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Mobile Application |
| Document | MOBILE_PROJECT_STRUCTURE.md |
| Version | 1.0 |
| Status | Active |
| Owner | Mobile Team |
| Classification | Architecture Guide |

---

# Mobile Apps Structure

```
apps/mobile-app/
├── src/
│   ├── screens/                        # App screens
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   ├── ForgotPasswordScreen.tsx
│   │   │   └── SplashScreen.tsx
│   │   │
│   │   ├── home/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── MenuScreen.tsx
│   │   │   ├── SearchScreen.tsx
│   │   │   └── CategoriesScreen.tsx
│   │   │
│   │   ├── order/
│   │   │   ├── CartScreen.tsx
│   │   │   ├── CheckoutScreen.tsx
│   │   │   ├── OrderDetailScreen.tsx
│   │   │   ├── OrderTrackingScreen.tsx
│   │   │   └── OrderHistoryScreen.tsx
│   │   │
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── AddressesScreen.tsx
│   │   │   ├── PaymentMethodsScreen.tsx
│   │   │   ├── LoyaltyScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   │
│   │   └── support/
│   │       ├── SupportScreen.tsx
│   │       └── ChatScreen.tsx
│   │
│   ├── components/                     # Reusable components
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── Error.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── SafeAreaView.tsx
│   │   │
│   │   ├── menu/
│   │   │   ├── MenuItem.tsx
│   │   │   ├── MenuCategory.tsx
│   │   │   ├── MenuFilter.tsx
│   │   │   └── MenuSearch.tsx
│   │   │
│   │   ├── order/
│   │   │   ├── CartItem.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderStatus.tsx
│   │   │   └── DeliveryTracker.tsx
│   │   │
│   │   ├── payment/
│   │   │   ├── PaymentForm.tsx
│   │   │   └── PaymentMethods.tsx
│   │   │
│   │   └── profile/
│   │       ├── ProfileHeader.tsx
│   │       └── AddressForm.tsx
│   │
│   ├── navigation/                     # Navigation configuration
│   │   ├── index.tsx                   # Main navigator
│   │   ├── AuthStack.tsx               # Auth navigator
│   │   ├── AppStack.tsx                # App navigator
│   │   ├── BottomTabNavigator.tsx      # Bottom tabs
│   │   ├── StackNavigator.tsx          # Stack navigation
│   │   └── LinkingConfiguration.ts     # Deep linking
│   │
│   ├── hooks/                          # Custom React Native hooks
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   ├── usePagination.ts
│   │   ├── useCart.ts
│   │   ├── useLocation.ts
│   │   ├── useNotifications.ts
│   │   └── usePermissions.ts
│   │
│   ├── store/                          # Redux store
│   │   ├── index.ts
│   │   ├── auth/
│   │   ├── cart/
│   │   ├── order/
│   │   ├── menu/
│   │   ├── user/
│   │   └── app/
│   │
│   ├── services/                       # API and business logic
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── order.service.ts
│   │   ├── menu.service.ts
│   │   ├── user.service.ts
│   │   ├── payment.service.ts
│   │   ├── location.service.ts
│   │   └── notification.service.ts
│   │
│   ├── utils/                          # Utility functions
│   │   ├── constants.ts
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── helpers.ts
│   │   ├── storage.ts
│   │   ├── permissions.ts
│   │   └── logger.ts
│   │
│   ├── types/                          # TypeScript types
│   │   ├── index.ts
│   │   ├── auth.types.ts
│   │   ├── order.types.ts
│   │   ├── menu.types.ts
│   │   ├── user.types.ts
│   │   ├── api.types.ts
│   │   ├── navigation.types.ts
│   │   └── common.types.ts
│   │
│   ├── styles/                         # Global styles & theme
│   │   ├── theme.ts
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── globalStyles.ts
│   │
│   ├── config/
│   │   ├── index.ts
│   │   ├── api.config.ts
│   │   ├── environment.ts
│   │   └── app.config.ts
│   │
│   └── App.tsx                         # Root component
│
├── tests/
│   ├── unit/
│   │   ├── utils/
│   │   ├── services/
│   │   └── hooks/
│   │
│   ├── integration/
│   │   ├── auth.integration.test.ts
│   │   └── order.integration.test.ts
│   │
│   ├── e2e/
│   │   ├── login.e2e.test.ts
│   │   └── order.e2e.test.ts
│   │
│   └── fixtures/
│       └── mockData.ts
│
├── assets/
│   ├── images/
│   │   ├── logo.png
│   │   ├── splash.png
│   │   ├── icons/
│   │   └── illustrations/
│   │
│   ├── fonts/
│   │   └── custom/
│   │
│   └── animations/
│       └── *.json
│
├── app.json                            # Expo configuration
├── eas.json                            # EAS Build configuration
├── metro.config.js                     # Metro bundler config
├── tsconfig.json                       # TypeScript config
├── jest.config.js                      # Jest testing config
├── babel.config.js                     # Babel config
├── .env.example
├── package.json
├── Dockerfile
└── README.md

apps/rider-app/
├── Similar structure to mobile-app

apps/admin-panel/
├── Similar structure but desktop optimized
```

---

# Expo Configuration

## app.json

```json
{
  "expo": {
    "name": "Telepizza",
    "slug": "telepizza-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ff6600"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTabletMode": true,
      "bundleIdentifier": "com.telepizza.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ff6600"
      },
      "package": "com.telepizza.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow Telepizza to access your location"
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png"
        }
      ]
    ]
  }
}
```

## eas.json

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": true
      }
    },
    "preview2": {
      "android": {
        "gradleCommand": ":app:assembleRelease"
      }
    },
    "preview3": {
      "developmentClient": true
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

---

# Screen Structure

## Screen Template

```typescript
// screens/auth/LoginScreen.tsx
import React, { FC, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '@hooks/useAuth';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@types/navigation.types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: FC<Props> = ({ navigation }) => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await login(email, password);
      // Navigation handled by auth context
    } catch (error) {
      // Show error
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Login form */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
});

export default LoginScreen;
```

---

# Navigation Setup

## Root Navigator

```typescript
// navigation/index.tsx
import React, { useEffect, FC } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '@hooks/useAuth';
import AuthStack from './AuthStack';
import AppStack from './AppStack';

const RootNavigator: FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default RootNavigator;
```

## App Stack

```typescript
// navigation/AppStack.tsx
import React, { FC } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '@screens/home/HomeScreen';
import MenuScreen from '@screens/home/MenuScreen';
import ProfileScreen from '@screens/profile/ProfileScreen';
import OrderHistoryScreen from '@screens/order/OrderHistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const AppStack: FC = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Menu" component={MenuScreen} />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default AppStack;
```

---

# State Management with Redux

```typescript
// store/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@types/auth.types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  token: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.token = null;
    },
  },
});

export default authSlice.reducer;
export const { setUser, setToken, logout } = authSlice.actions;
```

---

# API Integration

```typescript
// services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@config';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

# Custom Hooks

```typescript
// hooks/useAuth.ts
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUser, setToken, logout } from '@store/auth/authSlice';
import { loginUser, getCurrentUser } from '@services/auth.service';
import type { RootState } from '@store';

export const useAuth = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);

  // Check authentication on app start
  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        dispatch(setToken(token));
        const user = await getCurrentUser();
        dispatch(setUser(user));
      }
    } catch (error) {
      console.error('Failed to restore token', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await loginUser(email, password);
      await AsyncStorage.setItem('authToken', response.token);
      dispatch(setToken(response.token));
      dispatch(setUser(response.user));
    },
    [dispatch]
  );

  const logoutUser = useCallback(async () => {
    await AsyncStorage.removeItem('authToken');
    dispatch(logout());
  }, [dispatch]);

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    token: auth.token,
    loading,
    login,
    logout: logoutUser,
  };
};
```

---

# Theme & Styling

```typescript
// styles/theme.ts
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const theme = {
  colors: {
    primary: '#FF6600',
    secondary: '#00A859',
    danger: '#EE3444',
    warning: '#FFA500',
    success: '#27AE60',
    info: '#3498DB',
    dark: '#2C3E50',
    light: '#ECF0F1',
    white: '#FFFFFF',
    black: '#000000',
    gray: '#95A5A6',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' },
    h2: { fontSize: 24, fontWeight: '600' },
    h3: { fontSize: 18, fontWeight: '600' },
    body: { fontSize: 14, fontWeight: '400' },
    caption: { fontSize: 12, fontWeight: '400' },
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
  },
  dimensions: {
    screenWidth: width,
    screenHeight: height,
  },
};

export type Theme = typeof theme;
```

---

# Package.json Scripts

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "eject": "expo eject",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "submit": "eas submit"
  }
}
```

---

# File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Screens | PascalCase | `LoginScreen.tsx` |
| Components | PascalCase | `MenuItem.tsx` |
| Hooks | camelCase | `useAuth.ts` |
| Services | camelCase | `auth.service.ts` |
| Types | camelCase | `auth.types.ts` |
| Utils | camelCase | `formatters.ts` |
| Styles | camelCase | `theme.ts` |

---

# Best Practices

✅ **Do:**
- Keep components small and focused
- Use hooks for state management
- Use TypeScript strictly
- Optimize images & assets
- Handle permissions properly
- Test on real devices
- Use native components
- Implement error boundaries

❌ **Don't:**
- Use any types
- Skip accessibility
- Import from node_modules directly
- Create deeply nested components
- Ignore performance warnings
- Use console.log in production
- Import platform-specific code globally

---

**Document Status:** ACTIVE  
**Last Updated:** 09 July 2026
