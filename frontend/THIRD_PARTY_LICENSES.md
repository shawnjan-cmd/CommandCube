# Third-Party Licenses - Botler Project

**All dependencies verified GPL-free ✅**  
**Last Audit**: 2026-03-25

---

## Core Framework

### React Native (MIT)
- **Copyright**: Meta Platforms, Inc. and affiliates
- **Source**: https://github.com/facebook/react-native
- **License**: MIT
- **Usage**: Core mobile framework

### Expo (MIT)
- **Copyright**: 650 Industries, Inc. (Expo)
- **Source**: https://github.com/expo/expo
- **License**: MIT
- **Usage**: Development platform, native modules

---

## Backend & Database

### @supabase/supabase-js (MIT)
- **Copyright**: Supabase
- **Source**: https://github.com/supabase/supabase-js
- **License**: MIT
- **Usage**: Database, authentication, storage

### @react-native-async-storage/async-storage (MIT)
- **Copyright**: React Native Community
- **Source**: https://github.com/react-native-async-storage/async-storage
- **License**: MIT
- **Usage**: Local persistent storage

---

## UI Components

### react-native-safe-area-context (MIT)
- **Copyright**: Th3rd Wave
- **Source**: https://github.com/th3rdwave/react-native-safe-area-context
- **License**: MIT
- **Usage**: Safe area handling (notches, status bars)

### expo-linear-gradient (MIT)
- **Copyright**: 650 Industries, Inc. (Expo)
- **Source**: https://github.com/expo/expo
- **License**: MIT
- **Usage**: Gradient backgrounds

### expo-blur (MIT)
- **Copyright**: 650 Industries, Inc. (Expo)
- **Source**: https://github.com/expo/expo
- **License**: MIT
- **Usage**: Blur effects for glass UI

### @expo/vector-icons (MIT)
- **Copyright**: 650 Industries, Inc. (Expo)
- **Source**: https://github.com/expo/vector-icons
- **License**: MIT
- **Usage**: Icon library (Material Icons, MaterialCommunityIcons)

---

## Animations

### react-native-reanimated (MIT)
- **Copyright**: Software Mansion
- **Source**: https://github.com/software-mansion/react-native-reanimated
- **License**: MIT
- **Usage**: High-performance animations

### moti (MIT)
- **Copyright**: Fernando Rojo
- **Source**: https://github.com/nandorojo/moti
- **License**: MIT
- **Usage**: Declarative animations (built on Reanimated)

---

## Navigation

### expo-router (MIT)
- **Copyright**: 650 Industries, Inc. (Expo)
- **Source**: https://github.com/expo/expo
- **License**: MIT
- **Usage**: File-based routing

### @react-navigation/native (MIT)
- **Copyright**: React Navigation Contributors
- **Source**: https://github.com/react-navigation/react-navigation
- **License**: MIT
- **Usage**: Navigation primitives (used by Expo Router)

---

## Utilities

### expo-status-bar (MIT)
- **Copyright**: 650 Industries, Inc. (Expo)
- **Source**: https://github.com/expo/expo
- **License**: MIT
- **Usage**: Status bar styling

### expo-constants (MIT)
- **Copyright**: 650 Industries, Inc. (Expo)
- **Source**: https://github.com/expo/expo
- **License**: MIT
- **Usage**: Environment variables

---

## Python Server Dependencies

### FastAPI (MIT)
- **Copyright**: Sebastián Ramírez
- **Source**: https://github.com/tiangolo/fastapi
- **License**: MIT
- **Usage**: Python web framework for PC server

### ChromaDB (Apache 2.0)
- **Copyright**: Chroma
- **Source**: https://github.com/chroma-core/chroma
- **License**: Apache 2.0
- **Usage**: Vector database for N.S.D.L. knowledge storage

### sentence-transformers (Apache 2.0)
- **Copyright**: UKPLab
- **Source**: https://github.com/UKPLab/sentence-transformers
- **License**: Apache 2.0
- **Usage**: Embedding generation for semantic search

---

## Development Tools

### TypeScript (Apache 2.0)
- **Copyright**: Microsoft Corporation
- **Source**: https://github.com/microsoft/TypeScript
- **License**: Apache 2.0
- **Usage**: Type safety

### ESLint (MIT)
- **Copyright**: OpenJS Foundation and contributors
- **Source**: https://github.com/eslint/eslint
- **License**: MIT
- **Usage**: Code linting

---

## License Compliance

### Verified GPL-Free ✅
All dependencies checked for GPL/AGPL/LGPL contamination.

**Audit Process**:
1. Check `package.json` for each dependency
2. Verify license on GitHub repository
3. Review transitive dependencies
4. Confirm MIT or Apache 2.0 license
5. Document source and usage

### License Text Included
All required license notices are preserved in:
- `node_modules/*/LICENSE` (React Native)
- `python_server/requirements.txt` (Python deps)

### Attribution
This project includes open-source software. Full license texts are available in respective package directories.

---

## Future Dependencies

**Before adding ANY new dependency**:
1. ⚠️ **CHECK LICENSE FIRST**
2. ✅ Verify MIT or Apache 2.0
3. ❌ Reject if GPL/AGPL/LGPL
4. 📝 Add to this file

**See**: `LICENSING_POLICY.md` for full guidelines

---

**Last Updated**: 2026-03-25  
**Total Dependencies**: 20+ (all GPL-free)  
**Status**: ✅ COMPLIANT
