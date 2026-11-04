# Trip Tab

**Split the trip without signal.** Offline group expenses and lightweight trip pings for 2–8 people, powered by [Offline Protocol](https://offline.protocol) mesh (`@offline-protocol/mesh-sdk`).

- Mesh `appId`: **`triptab`**
- Suggested bundle id: **`com.triptab.app`**
- React Native **0.82.1**, engine + mobile npm workspaces

## License notes

- App code: **MIT-0** (see `LICENSE`)
- **`@offline-protocol/mesh-sdk`**: **AGPL-3.0-only** (or a commercial license from Offline Protocol). Ensure compliance before App Store or Play Store distribution.

## Setup

```bash
cd /Users/ankush/Developer/triptab   # repo root — required for workspaces + patches
npm install                          # runs patch-package (RN codegen + react-native-screens)
npm test                             # engine tests
npm run mobile:start                 # Metro
```

After every `npm install`, `patch-package` must succeed. If iOS pod install fails with `showColumn` / `ElementRef`, run `npm install` from the **repo root**, not only inside `mobile/`.

### iOS (physical device recommended for mesh)

```bash
npm run ios:pods -w triptab-mobile   # Gemfile in mobile/ios → bundle + pod install
npm run ios -w triptab-mobile
```

**Ruby 3.4+ / Homebrew Ruby 4.x:** `mobile/Gemfile` includes `nkf` (replaces removed `kconv`). If `pod install` still fails, use Ruby **3.3.x** (see `mobile/.ruby-version`) via `rbenv`/`mise`, then `cd mobile && bundle install && cd ios && bundle exec pod install`.

### Android

Enable Bluetooth permissions when prompted. For Metro on a device:

```bash
adb reverse tcp:8081 tcp:8081
npm run android -w triptab-mobile
```

## Two-phone test

| Host | Member |
|------|--------|
| Start a trip | Join nearby |
| Add Dinner $60, you paid, split 2 ways | Balance shows owes $30 |
| Member adds Gas $40, they paid | Settlements update |

## Structure

- `engine/` — ledger, host/member protocol, unit tests
- `mobile/` — React Native app, mesh room, UI
- `design-system/trip-tab/` — UI/UX tokens (generated)
