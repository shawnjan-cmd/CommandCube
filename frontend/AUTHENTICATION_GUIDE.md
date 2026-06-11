# 🔐 BOTLER AUTHENTICATION GUIDE

## Current Architecture

### ✅ What's Working
1. **PC Server Connection**
   - IP: 192.168.1.185:8000 (configurable)
   - Device authentication via unique device ID
   - Connection locking (persistent storage)
   - Auto-reconnect on app restart

2. **Connection Status**
   - **NEW**: CommandBar appears on ALL screens (moved to root layout)
   - Shows connection status, latency, active clients
   - Live terminal output preview
   - Collapsible design

### ❌ What's Missing
**Supabase User Authentication** - Your backend has user tables but the app doesn't use them!

---

## Do You Need User Authentication?

### **Option 1: Keep Current (PC-only connection)**
✅ Use if:
- Single user per device
- No cloud features needed
- Privacy-first (everything local)
- No cross-device sync

**Current Flow:**
```
User opens app → Connects to PC → Executes scripts → Done
(No login, no user accounts)
```

---

### **Option 2: Add Supabase Authentication**
✅ Use if:
- Multiple users sharing devices
- Cloud script library
- Cross-device sync
- User profiles & settings
- Script sharing between users

**New Flow:**
```
User opens app → Login/Signup (Supabase) → Connects to PC → Executes scripts
(User accounts, cloud storage, multi-user support)
```

---

## How to Implement Option 2

### **Step 1: Enable Supabase Auth**

Your backend is already configured! You have:
- ✅ `profiles` table (user profiles)
- ✅ `scripts`, `devices`, `schedules` tables with `user_id`
- ✅ RLS policies (authenticated users only)
- ✅ Auto-sync trigger (`on_auth_user_created`)

### **Step 2: Create Auth Context**

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }, // Trigger will save to profiles
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, user, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### **Step 3: Wrap App**

```typescript
// app/_layout.tsx
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <TabBarProvider>
        {/* existing code */}
      </TabBarProvider>
    </AuthProvider>
  );
}
```

### **Step 4: Create Login Screen**

```typescript
// app/login.tsx
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" />
      <Button title="Login" onPress={() => signIn(email, password)} />
      <Button title="Sign Up" onPress={() => signUp(email, password, 'username')} />
    </View>
  );
}
```

### **Step 5: Protect Routes**

```typescript
// app/(tabs)/_layout.tsx
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';

function TabLayoutContent() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect href="/login" />;

  return <Tabs>...</Tabs>;
}
```

---

## Recommendation

### **For Your Current Use Case: Keep Option 1**

Your app is focused on **PC automation** (local network), not multi-user cloud features. Adding user authentication would:
- ❌ Add unnecessary complexity
- ❌ Require internet for login
- ❌ Slow down local PC control

**Current architecture is perfect for:**
- Single user controlling their PC
- Privacy-first approach
- Fast local automation
- No cloud dependencies

### **When to Add Authentication:**
- You want script cloud backup
- Multiple users share devices
- Cross-device script sync
- Public script marketplace

---

## Connection Status on All Screens ✅

**FIXED**: CommandBar now appears on **EVERY screen** (moved to root `app/_layout.tsx`):
- ✅ Tab screens (Home, Library, Butler, Scripts, etc.)
- ✅ Modal screens
- ✅ Detail screens
- ✅ Settings screens

The connection status/terminal bar is now **globally visible** everywhere in your app!

---

## Summary

| Feature | Current Status | Action Needed |
|---------|---------------|---------------|
| **PC Connection** | ✅ Working | None - working perfectly |
| **IP Setup** | ✅ 192.168.1.185:8000 | None - auto-loads defaults |
| **Connection Status** | ✅ Fixed - Shows on all screens | **DONE** (moved to root) |
| **Device Auth** | ✅ Working | None - device ID authentication works |
| **User Authentication** | ❌ Not implemented | **Optional** - only if you need multi-user features |

**You DON'T need user authentication unless you want cloud features or multi-user support!**

Your current architecture is perfect for local PC automation. 🎯
