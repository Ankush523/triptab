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
npm install
npm test                 # engine tests
npm run mobile:start     # Metro
```

### iOS (physical device recommended for mesh)

```bash
cd mobile/ios && bundle exec pod install && cd ../..
npm run ios -w triptab-mobile
```

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
