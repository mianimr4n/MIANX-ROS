# 🎨 FRONTEND PROJECT STRUCTURE

> Frontend directory structure and organization for Next.js applications

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Frontend Architecture |
| Document | FRONTEND_PROJECT_STRUCTURE.md |
| Version | 1.0 |
| Status | Active |
| Owner | Frontend Team |
| Classification | Architecture Guide |

---

# Frontend Directory Structure

```
apps/website/
├── src/
│   ├── pages/                          # Next.js pages (routing)
│   │   ├── _app.tsx                    # App wrapper
│   │   ├── _document.tsx               # Document wrapper
│   │   ├── 404.tsx                     # 404 page
│   │   ├── 500.tsx                     # 500 error page
│   │   ├── index.tsx                   # Home page
│   │   │
│   │   ├── auth/
│   │   │   ├── login.tsx               # Login page
│   │   │   ├── register.tsx            # Registration page
│   │   │   └── forgot-password.tsx     # Password reset
│   │   │
│   │   ├── dashboard/
│   │   │   ├── index.tsx               # Dashboard home
│   │   │   ├── orders.tsx              # Orders page
│   │   │   ├── profile.tsx             # User profile
│   │   │   └── settings.tsx            # Settings page
│   │   │
│   │   ├── menu/
│   │   │   ├── index.tsx               # Menu listing
│   │   │   ├── [category].tsx          # Category detail
│   │   │   └── [id].tsx                # Item detail
│   │   │
│   │   └── checkout/
│   │       ├── index.tsx               # Checkout page
│   │       └── success.tsx             # Order success
│   │
│   ├── components/                     # Reusable React components
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Navigation.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── Error.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   │
│   │   ├── order/
│   │   │   ├── OrderForm.tsx
│   │   │   ├── OrderList.tsx
│   │   │   ├── OrderDetail.tsx
│   │   │   └── CartItem.tsx
│   │   │
│   │   ├── menu/
│   │   │   ├── MenuCategory.tsx
│   │   │   ├── MenuItem.tsx
│   │   │   ├── MenuFilter.tsx
│   │   │   └── MenuSearch.tsx
│   │   │
│   │   └── dashboard/
│   │       ├── DashboardHeader.tsx
│   │       ├── UserProfile.tsx
│   │       ├── OrderHistory.tsx
│   │       └── Statistics.tsx
│   │
│   ├── hooks/                          # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   ├── usePagination.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useForm.ts
│   │   └── useAsync.ts
│   │
│   ├── store/                          # State management (Redux/Zustand)
│   │   ├── index.ts                    # Store setup
│   │   │
│   │   ├── auth/
│   │   │   ├── authSlice.ts
│   │   │   ├── authActions.ts
│   │   │   └── authSelectors.ts
│   │   │
│   │   ├── cart/
│   │   │   ├── cartSlice.ts
│   │   │   ├── cartActions.ts
│   │   │   └── cartSelectors.ts
│   │   │
│   │   ├── order/
│   │   │   ├── orderSlice.ts
│   │   │   ├── orderActions.ts
│   │   │   └── orderSelectors.ts
│   │   │
│   │   └── menu/
│   │       ├── menuSlice.ts
│   │       ├── menuActions.ts
│   │       └── menuSelectors.ts
│   │
│   ├── services/                       # API services
│   │   ├── api.ts                      # Axios/Fetch setup
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── order.service.ts
│   │   ├── menu.service.ts
│   │   └── payment.service.ts
│   │
│   ├── utils/                          # Utility functions
│   │   ├── constants.ts                # App constants
│   │   ├── formatters.ts               # Formatting functions
│   │   ├── validators.ts               # Validation functions
│   │   ├── helpers.ts                  # Helper functions
│   │   ├── logger.ts                   # Client-side logging
│   │   └── storage.ts                  # Local storage helpers
│   │
│   ├── types/                          # TypeScript types
│   │   ├── index.ts
│   │   ├── auth.types.ts
│   │   ├── order.types.ts
│   │   ├── menu.types.ts
│   │   ├── user.types.ts
│   │   ├── api.types.ts
│   │   └── common.types.ts
│   │
│   ├── styles/                         # Global styles
│   │   ├── globals.css
│   │   ├── variables.css               # CSS variables
│   │   ├── layout.css
│   │   └── theme.css
│   │
│   ├── middleware/                     # Next.js middleware
│   │   └── auth.middleware.ts
│   │
│   ├── config/
│   │   ├── index.ts
│   │   ├── api.config.ts
│   │   ├── routes.ts                   # Route definitions
│   │   └── environment.ts
│   │
│   └── layout/
│       ├── MainLayout.tsx
│       ├── AuthLayout.tsx
│       └── AdminLayout.tsx
│
├── public/
│   ├── images/
│   │   ├── logo.png
│   │   ├── hero/
│   │   ├── menu/
│   │   └── icons/
│   │
│   ├── icons/
│   │   ├── favicon.ico
│   │   └── manifest.json
│   │
│   └── fonts/
│       └── custom-fonts/
│
├── tests/
│   ├── unit/
│   │   ├── components/
│   │   │   └── Button.test.tsx
│   │   │
│   │   ├── utils/
│   │   │   └── formatters.test.ts
│   │   │
│   │   └── hooks/
│   │       └── useAuth.test.ts
│   │
│   ├── integration/
│   │   ├── auth.integration.test.tsx
│   │   └── order.integration.test.tsx
│   │
│   ├── e2e/
│   │   ├── login.e2e.test.ts
│   │   ├── checkout.e2e.test.ts
│   │   └── order.e2e.test.ts
│   │
│   └── fixtures/
│       └── mockData.ts
│
├── .env.example
├── .env.local
├── next.config.js                     # Next.js configuration
├── tsconfig.json                      # TypeScript configuration
├── jest.config.js                     # Jest configuration
├── tailwind.config.js                 # Tailwind CSS configuration
├── postcss.config.js                  # PostCSS configuration
├── package.json
├── Dockerfile
└── README.md
```

---

# Component Structure

## Functional Component Pattern

```typescript
// components/auth/LoginForm.tsx
import React, { FC } from 'react';
import { useForm } from '@hooks/useForm';
import { loginUser } from '@services/auth.service';
import { LoginFormProps, LoginFormData } from '@types/auth.types';

const LoginForm: FC<LoginFormProps> = ({ onSuccess, onError }) => {
  const { values, errors, handleChange, handleSubmit } = useForm<LoginFormData>(
    { email: '', password: '' },
    async (data) => {
      try {
        await loginUser(data);
        onSuccess?.();
      } catch (error) {
        onError?.(error);
      }
    }
  );

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="email"
        type="email"
        value={values.email}
        onChange={handleChange}
        placeholder="Email"
      />
      {errors.email && <span>{errors.email}</span>}
      
      <input
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
        placeholder="Password"
      />
      {errors.password && <span>{errors.password}</span>}
      
      <button type="submit">Login</button>
    </form>
  );
};

export default LoginForm;
```

---

# Folder Structure Conventions

| Folder | Purpose | Content |
|--------|---------|---------|
| `pages/` | Route pages (auto-routed by Next.js) | Page components |
| `components/` | Reusable React components | `.tsx` files |
| `hooks/` | Custom React hooks | `useXxx.ts` files |
| `store/` | State management | Redux/Zustand slices |
| `services/` | API services | API calls |
| `utils/` | Utility functions | Helper functions |
| `types/` | TypeScript definitions | `.ts` type files |
| `styles/` | Global/shared styles | CSS files |
| `public/` | Static assets | Images, fonts, icons |

---

# TypeScript Path Aliases

## tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@pages/*": ["src/pages/*"],
      "@hooks/*": ["src/hooks/*"],
      "@store/*": ["src/store/*"],
      "@services/*": ["src/services/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"],
      "@styles/*": ["src/styles/*"],
      "@layout/*": ["src/layout/*"],
      "@config/*": ["src/config/*"]
    }
  }
}
```

## Usage

```typescript
import LoginForm from '@components/auth/LoginForm';
import { useAuth } from '@hooks/useAuth';
import { loginUser } from '@services/auth.service';
import type { User } from '@types/auth.types';
```

---

# State Management with Redux

## Store Setup

```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth/authSlice';
import cartReducer from './cart/cartSlice';
import orderReducer from './order/orderSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    order: orderReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

## Slice Example

```typescript
// store/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@types/auth.types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;
```

---

# Custom Hooks Pattern

```typescript
// hooks/useAuth.ts
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@store';
import { setUser, logout } from '@store/auth/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((state: RootState) => state.auth);

  const login = async (email: string, password: string) => {
    // Login logic
  };

  const logoutUser = () => {
    dispatch(logout());
  };

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    login,
    logout: logoutUser,
  };
};
```

---

# API Service Pattern

```typescript
// services/auth.service.ts
import api from './api';
import { User, LoginCredentials, RegisterData } from '@types/auth.types';

export const loginUser = async (credentials: LoginCredentials): Promise<User> => {
  const { data } = await api.post('/auth/login', credentials);
  return data;
};

export const registerUser = async (data: RegisterData): Promise<User> => {
  const { data: response } = await api.post('/auth/register', data);
  return response;
};

export const getCurrentUser = async (): Promise<User> => {
  const { data } = await api.get('/auth/me');
  return data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};
```

---

# Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "cypress run",
    "format": "prettier --write src/",
    "type-check": "tsc --noEmit"
  }
}
```

---

# Environment Configuration

## .env.example

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Telepizza Platform
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_GA_ID=

# Feature Flags
NEXT_PUBLIC_FEATURE_AI=true
NEXT_PUBLIC_FEATURE_LOYALTY=true
```

---

# File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Pages | lowercase | `login.tsx` |
| Components | PascalCase | `LoginForm.tsx` |
| Hooks | camelCase | `useAuth.ts` |
| Services | camelCase | `auth.service.ts` |
| Types | camelCase | `auth.types.ts` |
| Utils | camelCase | `formatters.ts` |
| Tests | `{name}.test.tsx` | `Button.test.tsx` |

---

# Best Practices

✅ **Do:**
- Keep components small and focused
- Use custom hooks for logic
- Separate styles from components
- Use TypeScript strictly
- Write unit tests
- Organize imports consistently
- Use semantic HTML
- Optimize images

❌ **Don't:**
- Put business logic in components
- Use inline styles
- Use any types
- Skip accessibility
- Create deeply nested folders
- Pass multiple props down
- Ignore TypeScript errors

---

# Next Steps

1. Create page structure
2. Set up Redux store
3. Create reusable components
4. Implement API services
5. Add authentication

---

**Document Status:** ACTIVE  
**Last Updated:** 09 July 2026
