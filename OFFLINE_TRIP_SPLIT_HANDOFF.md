# Trip Tab — New App Handoff Spec

Use this document as **full context** in a new Cursor chat / new repo. Build a **mass-market** mobile app: **Splitwise-style group expenses** + **simple trip coordination** — **no internet required** while the group is together. Networking uses **Offline Protocol** (`@offline-protocol/mesh-sdk`), same family as the sibling project **Split Keys** (`splitkeys` repo). This is a **greenfield app** (new repo, new bundle id, new engine).

---

## Product identity (locked)

| Field | Value |
|-------|--------|
| **App name** | Trip Tab |
| **Tagline** | Group expenses without internet. |
| **Mesh `appId`** | `triptab` (fixed on all installs; not a portal `app_…` id) |
| **Suggested bundle id** | `com.triptab.app` (adjust team prefix as needed) |

---

## 1. One-line pitch

**Split the trip without signal.** One phone hosts the trip; everyone nearby adds expenses and sees who owes whom. Optional **trip pings** (“stopping for food”, “running late”) — not a chat app.

---

## 2. Product principles

| Principle | Meaning |
|-----------|---------|
| **Obvious in 10 seconds** | Create/join trip → add expense → see balance. |
| **Host is source of truth** | One device holds the ledger (like Split Keys GM). |
| **No account in MVP** | Display names only; no login, no cloud. |
| **Offline-first** | Bluetooth mesh (+ local network when available). |
| **2-phone testable** | Host + one joiner completes full flow (§12). |

---

## 3. MVP scope

### In scope (v1.0)

- Create **Trip** (title, currency e.g. `USD`).
- **Join nearby trip** (mesh discover + pick host).
- **Members** (2–8): display name; host assigns `memberId` on join.
- **Add expense**: amount (integer **cents**), payer, participants (MVP: equal split among selected; default all members).
- **Balances** on host; broadcast `ledger` snapshot after each change.
- **Suggested settlements** (greedy min-cash-flow — §6).
- **Trip tab**: host sends **preset ping** (food / meet / late / custom short text).
- **End trip** / leave; **debrief** with shareable text summary (Share API).

### Out of scope (v1.0)

- Receipt OCR, photos, categories, bank/Venmo integration (text “Pay Alex $12.50” only).
- Multi-currency FX, accounts, cloud backup, chat, GPS map.
- **`@react-native-community/blur`** — **do not use** (RN 0.82 New Architecture → Android CMake/codegen failure). Use layered tint “glass” UI only.

### v1.1 (later)

- QR export/import of trip JSON.
- Optional AsyncStorage for display name only.

---

## 4. User flows

### Host

1. Home → **Start a trip** → title, currency, your name.
2. Mesh host advertises (`appId`: **`triptab`**).
3. Lobby: joiners appear → **Start splitting** when ready (≥1 other member, or allow solo for dev).
4. Tabs: **Expenses** · **Settle** · **Trip**.
5. **End trip** → debrief → share.

### Member

1. **Join nearby trip** → pick host → name.
2. Receive `assign` + `ledger` snapshots.
3. Add expenses; view balances and settlement suggestions.

### Two-phone test (required)

| Phone A (host) | Phone B (member) |
|----------------|------------------|
| Start trip | Join nearby |
| Add “Dinner $60”, you paid, split 2 ways | Balance shows owes $30 |
| B adds “Gas $40”, B paid | Settlement list updates |

---

## 5. Domain model (engine)

Money in **integer cents**; assert `Number.isSafeInteger`.

```ts
type Phase = 'lobby' | 'active' | 'closed';

type TripMeta = {
  id: string;
  title: string;
  currency: string; // ISO 4217
  createdAt: number;
};

type Member = {
  id: string;       // m0, m1, …
  peerId: string;   // mesh id
  name: string;
  connected: boolean;
};

type Expense = {
  id: string;
  label: string;
  amountCents: number;
  payerId: string;
  participantIds: string[];
  createdAt: number;
  createdBy: string;
};

type LedgerSnapshot = {
  version: number;
  balances: Record<string, number>; // cents: + credited, − owes
  settlements: { from: string; to: string; amountCents: number }[];
  expenses: Expense[];
};

type TripPing = {
  id: string;
  kind: 'food' | 'meet' | 'late' | 'custom';
  text: string;
  at: number;
};
```

---

## 6. Balance & settlement

### Equal split

For expense with `n` participants: base share `floor(amountCents / n)`; **remainder** assign to **payer** (document in code; totals must sum to zero).

### Settlements (MVP)

Greedy: match largest debtor to largest creditor; transfer `min(|debt|, credit)`; repeat. Unit test 3-person golden case.

---

## 7. Wire protocol (`Msg`)

Mesh wraps as `{ t: 'app', d: <Msg> }`.

```ts
type Msg =
  | { t: 'trip'; title: string; currency: string; members: number; phase: Phase }
  | { t: 'hello' }
  | { t: 'join'; name: string }
  | { t: 'full' }
  | { t: 'reject'; reason: string }
  | { t: 'assign'; memberId: string; name: string }
  | { t: 'ledger'; snapshot: LedgerSnapshot }
  | { t: 'expense_add'; expense: Expense }
  | { t: 'expense_remove'; expenseId: string }  // host only
  | { t: 'ping'; ping: TripPing }
  | { t: 'closed' };
```

**Host:** validate `expense_add`; monotonic `ledger.version`; on join → `assign` + full ledger.  
**Member:** apply `ledger` only if `version` increases.

---

## 8. Offline Protocol / mesh

- SDK: `@offline-protocol/mesh-sdk` **^0.31.0**
- **AGPL-3.0-only** (or commercial license) for mesh SDK — note in README.
- Star topology: host advertises trip title; members discover/join.
- Bluetooth-first; Android permissions before start; iOS Bluetooth + Local Network plist strings (copy patterns from Split Keys `mobile/ios`, `mobile/src/mesh/permissions.ts`).
- **Physical devices only** for mesh QA; `adb reverse tcp:8081 tcp:8081` for Android + Metro.

### Copy/adapt from Split Keys (reference repo)

| Path | Use |
|------|-----|
| `mobile/src/mesh/` | room, useNearbyRoom, runtime, permissions, envelope |
| `mobile/src/session/bridge.ts` | Host/Member bridge pattern → Trip Host/Member |
| `mobile/metro.config.js` | workspace `watchFolders` + hoisted `node_modules` |
| `mobile/android/settings.gradle` + `app/build.gradle` `react {}` | hoisted deps at repo root |

Do **not** reuse Split Keys UI, story packs, or `appId` **`splitkeys`**.

---

## 9. Monorepo layout

```
triptab/                         # repo root (name flexible)
├── package.json                 # workspaces: ["engine", "mobile"]
├── README.md
├── LICENSE
├── engine/
│   ├── package.json             # "triptab-engine", type: module
│   ├── ledger.ts
│   ├── host.ts
│   ├── member.ts
│   ├── protocol.ts
│   └── *.test.ts
└── mobile/
    ├── package.json             # "triptab-mobile"
    ├── metro.config.js
    ├── android/                 # Gradle paths §10
    ├── ios/
    └── src/
        ├── screens/
        ├── mesh/
        ├── session/bridge.ts    # APP_ID = 'triptab'
        └── theme/
```

Root scripts:

```json
{
  "private": true,
  "workspaces": ["engine", "mobile"],
  "scripts": {
    "test": "npm test -w triptab-engine",
    "typecheck": "npm run typecheck -w triptab-engine && npm run typecheck -w triptab-mobile",
    "mobile:start": "npm start -w triptab-mobile"
  }
}
```

---

## 10. Tech stack & monorepo fixes

| Layer | Version |
|-------|---------|
| React Native | 0.82.1 |
| React | 19.1.1 |
| TypeScript | ^5.8 |
| Mesh SDK | ^0.31.0 |

**Metro** (`mobile/metro.config.js`):

```js
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const engine = path.resolve(workspaceRoot, 'engine');

module.exports = mergeConfig(getDefaultConfig(projectRoot), {
  watchFolders: [engine, workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  },
});
```

**Android** — from `mobile/android/`:

- `settings.gradle`: `../../node_modules/@react-native/gradle-plugin`
- `app/build.gradle` → `react { root = file("../../"); reactNativeDir = file("../../../node_modules/react-native"); codegenDir = file("../../../node_modules/@react-native/codegen"); cliFile = file("../../../node_modules/react-native/cli.js") }`
- Remove obsolete `newArchEnabled=false` if copied from templates.

---

## 11. Screens (MVP)

- **Home** — name; Start trip / Join nearby  
- **Host lobby** — members; Start splitting  
- **Member waiting** — until assign + ledger  
- **Tabs** — Expenses · Settle · Trip  
- **Add expense** modal  
- **Debrief** — share summary  

UI: simple fintech, high contrast; no escape-room gamification.

---

## 12. Engine tests (required)

1. Two members, two expenses → balances sum to 0; settlements clear debts.  
2. Join → assign → ledger version bumps.  
3. Invalid expense rejected.  
4. `closed` → member exit UI.  
5. Golden settlement test (3 people).

---

## 13. iOS / Android

- iOS: Bluetooth + Local Network usage strings; Bonjour if using NWBrowser pattern; `pod install`; physical device for mesh.
- Android: nearby/Bluetooth runtime permissions; clean `android/app/.cxx` if native link errors after dependency changes.

---

## 14. Build phases (agent)

1. Scaffold monorepo + engine tests green.  
2. Host/member protocol + ledger.  
3. Mesh bridge + two-device join.  
4. UI tabs wired to `ledger`.  
5. Settle + debrief share.  
6. Trip pings.  
7. Polish errors/disconnect copy.

---

## 15. Prompt for new chat

Paste this file, then:

> Create the **Trip Tab** monorepo per this handoff. Mesh `appId` = **`triptab`**. Implement engine + tests first, then React Native 0.82 with Offline Protocol mesh. Copy mesh/monorepo patterns from Split Keys (see §8). MVP: host/member, expenses, balances, settlements, trip ping, debrief share. No cloud, no native blur. Two-phone test must pass.

---

*Handoff v1.1 — Trip Tab naming locked. Split Keys reference: `/Users/ankush/Developer/splitkeys`.*
