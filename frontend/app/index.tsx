/**
 * Bootstrap route — `/`
 *
 * The root layout (`app/_layout.tsx`) handles onboarding gating BEFORE
 * the router ever reaches this file. Once onboarding is complete and the
 * Stack is rendered, the router lands on `/`, which matches this file.
 *
 * This file must NOT return null — that produces a black screen. Instead
 * we use <Redirect> to send the user into the tab navigator. expo-router
 * matches `/(tabs)` to `(tabs)/_layout.tsx` + `(tabs)/index.tsx`
 * (which re-exports nexushome).
 */
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)/nexushome" />;
}
