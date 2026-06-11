// main-menu.tsx — Bulletproof redirect hub to nexushome
// Fires 7 independent navigation paths + retry loop.
// Unmount = success. Never leaves user stuck.
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_DONE_KEY } from '@/constants/onboardingKeys';

export default function MainMenuScreen() {
  const router = useRouter();
  const mountedRef = useRef(true);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    // Ensure onboarding is marked done (defensive write)
    AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1').catch(() => {});

    const fireAllPaths = () => {
      // Path 1: layout state flip
      try { (global as any).__setNeedsOnboarding?.(false); } catch {}
      // Path 2: layout global router ref
      try { (global as any).__onboardingComplete?.(); } catch {}
      // Path 3: nexushome direct
      try { router.replace('/(tabs)/nexushome' as any); } catch {}
      // Path 4: tabs root
      try { router.replace('/(tabs)' as any); } catch {}
      // Path 5: navigate variant
      try { router.navigate('/(tabs)/nexushome' as any); } catch {}
      // Path 6: index (re-exports nexushome)
      try { router.replace('/(tabs)/index' as any); } catch {}
      // Path 7: deferred micro-task re-fire of globals
      Promise.resolve().then(() => {
        try { (global as any).__setNeedsOnboarding?.(false); } catch {}
        try { (global as any).__onboardingComplete?.(); } catch {}
      });
    };

    fireAllPaths();

    // Retry every 1s for up to 10s
    let attempts = 0;
    retryRef.current = setInterval(() => {
      if (!mountedRef.current) { clearInterval(retryRef.current!); return; }
      attempts++;
      if (attempts >= 10) { clearInterval(retryRef.current!); return; }
      fireAllPaths();
    }, 1000);

    return () => {
      mountedRef.current = false;
      if (retryRef.current) clearInterval(retryRef.current);
    };
  }, []);

  return null;
}
