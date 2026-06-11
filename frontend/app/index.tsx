/**
 * Bootstrap route — `/`
 *
 * Renders nothing; the root layout (`app/_layout.tsx`) reads onboarding
 * state from AsyncStorage and calls `router.replace('/welcome' | '/(tabs)/nexushome')`
 * exactly once. Keeping this file as an empty component avoids the
 * expo-router warning about a missing initial route.
 */
export default function Index() {
  return null;
}
