# EduOrbit Mobile — Expo Go Migration Plan

> **Goal:** Port the EduOrbit web app (Next.js 16 + Python backend) into a cross-platform
> Expo Go mobile app sharing the same backend, same design language, and the same monorepo.
>
> **Approach:** Turborepo monorepo · Expo Router (file-based, mirrors Next.js app dir) ·
> NativeWind v4 (Tailwind classes on React Native) · same REST + WebSocket Python backend,
> untouched · shared TypeScript packages for API clients and types.

---

## Monorepo Target Structure

```
EduOrbit/                          ← repo root
├── apps/
│   ├── web/                        ← current Next.js app (moved here, unchanged)
│   └── mobile/                     ← new Expo app
│       ├── app/                    ← Expo Router screens (mirrors web/app/)
│       │   ├── (auth)/
│       │   │   ├── login.tsx
│       │   │   └── register.tsx
│       │   ├── (tabs)/
│       │   │   ├── index.tsx       ← home / chat
│       │   │   ├── space.tsx
│       │   │   ├── knowledge.tsx
│       │   │   ├── notebook.tsx
│       │   │   └── settings.tsx
│       │   └── _layout.tsx
│       ├── components/             ← mobile-native component rewrites
│       ├── lib/                    ← mobile-only utils (keyboard, file picker)
│       └── app.json
├── packages/
│   ├── api-client/                 ← shared fetch + WebSocket wrappers
│   ├── types/                      ← shared TypeScript types (no React dep)
│   └── ui-tokens/                  ← shared colors, spacing, typography scale
├── backend/                        ← Python edux (unchanged, stays at root or here)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json                    ← root workspace
```

---

## Phase 1 — Monorepo Restructure & Expo Scaffold

**Estimated tokens:** ~200k · **Estimated wall-clock:** 2–3 hours

### 1.1 Install Turborepo & pnpm Workspaces

- Add `pnpm-workspace.yaml` at root pointing to `apps/*` and `packages/*`
- Add `turbo.json` with pipelines: `build`, `dev`, `lint`, `test`
- Add root `package.json` with `"packageManager": "pnpm@9"`
- Move current `web/` → `apps/web/` (update all internal relative imports if any)
- Verify `apps/web` still builds: `pnpm --filter web build`

### 1.2 Create Shared Packages (empty scaffolds)

```
packages/api-client/
  package.json   (name: "@eduorbit/api-client")
  src/index.ts

packages/types/
  package.json   (name: "@eduorbit/types")
  src/index.ts

packages/ui-tokens/
  package.json   (name: "@eduorbit/ui-tokens")
  src/colors.ts
  src/spacing.ts
  src/typography.ts
```

- Each package gets a shared `tsconfig.json` extending a root `tsconfig.base.json`
- Add `@eduorbit/*` to `apps/web/package.json` dependencies so web can import from packages later

### 1.3 Scaffold Expo App

```bash
cd apps && npx create-expo-app mobile --template tabs
```

- Install core deps:
  ```
  nativewind@^4  tailwindcss  expo-router  expo-secure-store
  expo-file-system  expo-document-picker  expo-image-picker
  react-native-webview  react-native-safe-area-context
  react-native-screens  @react-navigation/native
  ```
- Configure NativeWind: add `babel.config.js` with `nativewind/babel`, update `tailwind.config.js`
  to include `./app/**/*.tsx` and `./components/**/*.tsx`
- Set up `app.json` with bundle identifiers, app name "EduOrbit"
- Add `metro.config.js` to resolve `packages/*` from the monorepo root
- Verify `expo start` runs without errors

### 1.4 Design Token Sync

- Copy color palette from `web/lib/theme.ts` → `packages/ui-tokens/src/colors.ts`
- Map Tailwind CSS variables (background, foreground, primary, muted, accent, destructive) to
  React Native StyleSheet-compatible constants and NativeWind CSS vars
- Import tokens into `apps/mobile/tailwind.config.js` so mobile shares the same palette
- Dark mode: configure NativeWind `colorScheme` to follow system (`useColorScheme`)

### 1.5 CI Update

- Update `.github/workflows/tests.yml` to add a `mobile-lint` job:
  `pnpm --filter mobile lint`
- No build CI for mobile yet (full Expo build is Phase 4)

**Phase 1 Deliverable:** `pnpm dev` starts both `apps/web` and `apps/mobile` concurrently.
Expo Go shows a blank tab shell with correct brand colors.

---

## Phase 2 — Shared Packages & Auth

**Estimated tokens:** ~400k · **Estimated wall-clock:** 4–6 hours

### 2.1 Extract `@eduorbit/types`

Files to extract from `apps/web/lib/` → `packages/types/src/`:

| Web source | Package export |
|---|---|
| `quiz-types.ts` | `QuizQuestion`, `QuizResult` |
| `research-types.ts` | `ResearchOutline`, `ResearchSection` |
| `book-types.ts` | `BookMeta`, `BookPage`, `BookChapter` |
| `notebook-selection-types.ts` | `NotebookRecord` |
| `math-animator-types.ts` | `MathAnimatorFrame` |
| `visualize-types.ts` | `VisualizationResult` |
| `space-items.ts` | `SpaceItem` |
| `quiz-question-type.ts` | `QuizQuestionType` |

- Extract only type definitions (interfaces, enums, type aliases) — no React, no DOM
- Update `apps/web` imports to use `@eduorbit/types` for these
- `packages/types` has no dependencies — pure TypeScript

### 2.2 Extract `@eduorbit/api-client`

Files to extract from `apps/web/lib/`:

| Web source | Package export |
|---|---|
| `api.ts` | `apiUrl`, `wsUrl`, `apiFetch`, `parseAuthEnabled` |
| `session-api.ts` | `listSessions`, `createSession`, `deleteSession`, `getSession` |
| `knowledge-api.ts` | `listKnowledgeBases`, `createKb`, `deleteKb`, `uploadFile` |
| `book-api.ts` | `listBooks`, `getBook`, `createBook` |
| `notebook-api.ts` | `listNotebooks`, `createNotebook`, `appendRecord` |
| `partners-api.ts` | `listPartners`, `getPartner`, `createPartner` |
| `personas-api.ts` | `listPersonas`, `createPersona` |
| `profile-api.ts` | `getProfile`, `updateProfile` |
| `timetable-api.ts` | `getTimetable`, `generateTimetable` |
| `skills-api.ts` | `listSkills` |
| `subagents-api.ts` | `listSubagents` |
| `admin-api.ts` | `listUsers`, `deleteUser` |
| `unified-ws.ts` | `UnifiedWebSocketClient` |
| `stream.ts` | `readSSEStream` |

- The client must be environment-aware: in web it calls relative `/api/...`; in mobile it calls
  `EXPO_PUBLIC_API_BASE_URL` (set in `apps/mobile/.env`)
- Add `EXPO_PUBLIC_API_BASE_URL=http://localhost:1716` default for local dev
- Update `apps/web` imports to use `@eduorbit/api-client`
- Add `@eduorbit/types` as a dependency of `@eduorbit/api-client`

### 2.3 Auth Screens

**Route:** `apps/mobile/app/(auth)/login.tsx` and `register.tsx`

Web source: `web/app/(auth)/login/page.tsx`, `web/app/(auth)/register/page.tsx`

- Rewrite using React Native primitives (`View`, `Text`, `TextInput`, `Pressable`) + NativeWind
- Use `expo-secure-store` to persist the session cookie/token (replaces browser cookies)
- Attach the stored token as `Authorization` header in `@eduorbit/api-client`'s `apiFetch`
  via an injectable `getToken` callback — web passes `undefined` (uses cookies), mobile passes
  `SecureStore.getItemAsync('session_token')`
- Auth redirect: `apps/mobile/app/_layout.tsx` checks auth status on mount using
  `useAuthStatus` hook (ported from `web/hooks/useAuthStatus.ts`), redirects to `/(auth)/login`
  if unauthenticated
- Logout: clear SecureStore token, redirect to login

**Screens to build:**
- Login: email + password fields, submit, error display, link to register
- Register: name, email, password, confirm password, submit

### 2.4 Navigation Shell

- `app/_layout.tsx`: root layout with `<Stack>` + auth guard
- `app/(tabs)/_layout.tsx`: bottom tab bar with 5 tabs:
  - Chat (home icon)
  - Space (grid icon)
  - Knowledge (database icon)
  - Notebook (book icon)
  - Settings (gear icon)
- Use `lucide-react-native` (port of `lucide-react`) for icons — same icon names
- Dark mode toggle: stored in `expo-secure-store`, applied via NativeWind `colorScheme`

### 2.5 i18n on Mobile

- `i18next` + `react-i18next` both work on React Native — same packages
- Copy all locale JSON files from `web/locales/` → `apps/mobile/locales/`
- Init i18next in `apps/mobile/lib/i18n.ts` using `expo-localization` to detect device language
- Wrap root layout with `I18nextProvider`

**Phase 2 Deliverable:** Login/register flow works on device. Authenticated user sees the tab
shell. All API calls route correctly to the backend. Language follows device locale.

---

## Phase 3 — Core Feature Screens

**Estimated tokens:** ~800k · **Estimated wall-clock:** 8–10 hours

This is the largest phase. Each section maps a web feature module to a mobile screen.

### 3.1 Home / Chat Screen

**Route:** `app/(tabs)/index.tsx`
**Web source:** `web/app/(workspace)/home/[[...sessionId]]/page.tsx` +
`web/components/chat/home/`

This is the most complex screen. Build in this order:

**3.1.1 Chat Message List**
- Port `ChatMessages.tsx` → `ChatMessageList.tsx`
- Replace `div` scroll container with `FlatList` (inverted, auto-scroll on new message)
- Port `AssistantResponse.tsx`: Markdown rendering via `react-native-markdown-display`
  (replaces `react-markdown` + rehype plugins)
- Math rendering: use `react-native-math-view` for inline LaTeX (replaces `rehype-katex`)
- Code blocks: `react-native-syntax-highlighter` (replaces `react-syntax-highlighter`)
- Thinking cards (`ModelThinkingCard.tsx`): port to RN `Animated.View` collapse
- Port `useSmoothStreamText.ts` hook as-is (no DOM dependency)

**3.1.2 Composer / Input**
- Port `ChatComposer.tsx` + `ComposerInput.tsx` → `ChatComposer.tsx`
- Replace `<textarea>` with `TextInput multiline` + `useAutoSizedTextarea` → `onContentSizeChange`
- Keyboard avoiding: wrap in `KeyboardAvoidingView` with `behavior="padding"`
- Attach button: `expo-document-picker` for file selection (replaces web drag-and-drop)
- Voice input button: `useVoiceRecorder` hook → `expo-av` for recording
- Port `AgentSelector.tsx`, `ModelSelector.tsx`, `PersonaSelector.tsx`,
  `KnowledgeSelector.tsx` as bottom-sheet pickers (`@gorhom/bottom-sheet`)

**3.1.3 WebSocket Streaming**
- Port `unified-ws.ts` from `@eduorbit/api-client` — works unchanged on React Native
- Port `useSmoothStreamText.ts` — no DOM dep, works unchanged
- Connect stream to `FlatList` via `useState` + `useRef`

**3.1.4 Session Management**
- Session sidebar → swipe-left drawer (React Navigation `DrawerNavigator`)
- Port `SessionList.tsx` + `web/lib/session-api.ts` (already in `@eduorbit/api-client`)
- New session button in header `rightButton`

**3.1.5 File Previews**
- Port `FilePreviewDrawer.tsx` as a modal bottom sheet
- PDF: `react-native-pdf` (replaces `docx-preview` / custom PDF renderer)
- Docx/Excel: render in `WebView` using existing web previewer HTML (same iframe approach)
- Images: `expo-image`
- Markdown: `react-native-markdown-display`
- SVG: `react-native-svg` + `SvgUri`

### 3.2 Space / Dashboard Screen

**Route:** `app/(tabs)/space.tsx`
**Web source:** `web/app/(utility)/space/page.tsx` + `web/components/space/`

- Port `SpaceDashboard.tsx` → sectioned `ScrollView` with `SectionList`
- Port each section as a horizontal `FlatList` card row:
  - `ChatHistorySection` → recent sessions
  - `NotebooksSection` → notebook cards
  - `PersonasSection` → persona chips
  - `MyAgentsSection` → agent cards
  - `QuestionBankSection` → question bank cards
  - `SkillsSection` → skill chips
- `ImportWizard.tsx` → modal sheet with `expo-document-picker`
- `EduHubImportModal.tsx` → modal sheet

### 3.3 Knowledge Base Screen

**Route:** `app/(tabs)/knowledge.tsx`
**Web source:** `web/app/(utility)/knowledge/page.tsx` + `web/components/knowledge/`

- `KnowledgePage.tsx` → `KnowledgeScreen.tsx` with master-detail navigation
- `KnowledgeHome.tsx` → list of KB cards using `FlatList`
- `KnowledgeBaseDetail.tsx` → pushed `Stack` screen
- `FileDropZone.tsx` → `expo-document-picker` + `expo-file-system` upload
- `KbDocumentList.tsx` → `FlatList` of uploaded docs with swipe-to-delete
- `KbStatusBadge.tsx` → port as-is (just styling)
- `KbFilesTab.tsx`, `KbIndexVersionsSection.tsx`, `KbSettingsSection.tsx` → tab views
  using `react-native-tab-view`
- `KbFilePreview.tsx` → same file preview bottom sheet from 3.1.5
- Progress polling: port `useKnowledgeProgress.ts` and `useKnowledgeBases.ts` hooks as-is

### 3.4 Notebook Screen

**Route:** `app/(tabs)/notebook.tsx`
**Web source:** `web/app/(utility)/notebook/page.tsx` + `web/components/notebook/`

- `NotebookSelector.tsx` → segmented control / tab picker
- `NotebookRecordPicker.tsx` → `FlatList` picker modal
- `SaveToNotebookModal.tsx` → bottom sheet
- Records: render as cards in `FlatList`, tap to expand

### 3.5 Settings Screen

**Route:** `app/(tabs)/settings.tsx`
**Web source:** `web/app/(utility)/settings/page.tsx` + `web/components/settings/`

- `SettingsHub.tsx` → native `SectionList` grouped settings
- `SettingsMain.tsx` → form fields using `TextInput`, `Switch` (replaces `Toggle.tsx`)
- `ServiceConfigEditor.tsx` → form with grouped text inputs
- `ThemePreviewCard.tsx` → theme picker with `Pressable` swatches
- `SubagentSettingsEditor.tsx` → list editor
- `MinerUEngineSettings.tsx` → nested settings screen (pushed Stack)
- `DimensionField.tsx` → numeric `TextInput`
- Port `SettingsContext.tsx` as-is (React context, no DOM dep)

### 3.6 Profile Screen

**Route:** `app/profile.tsx` (pushed from settings)
**Web source:** `web/app/(utility)/profile/page.tsx`

- Avatar: `expo-image-picker` for upload (replaces web file input)
- Form fields: `TextInput` for name, email
- Delete account: `Alert.alert` confirmation

### 3.7 Memory Screen

**Route:** `app/memory.tsx` (pushed from Space or drawer)
**Web source:** `web/app/(utility)/memory/page.tsx` + `web/components/memory/`

- `MemoryHub.tsx` → tabbed screen (`react-native-tab-view`)
- `MemoryWorkbench.tsx` / `MemoryL1Workbench.tsx` → scrollable form sections
- `MemorySection.tsx` → collapsible section with `Animated`
- `MemoryRunPanel.tsx` → streaming log view (same WebSocket approach)
- `MemoryArchivedBanner.tsx` → info banner
- `MemoryGraph.tsx` → **WebView embed** (Cytoscape does not run on RN natively;
  serve the graph HTML from the backend and load it in `react-native-webview`)

**Phase 3 Deliverable:** All 5 tabs are functional. Chat streams AI responses. Knowledge base
upload and indexing works. Settings persist. Auth flows complete end-to-end on device.

---

## Phase 4 — Advanced Features, Rich Media & Polish

**Estimated tokens:** ~600k · **Estimated wall-clock:** 6–8 hours

### 4.1 Agents Screen

**Route:** `app/agents.tsx`
**Web source:** `web/app/(utility)/agents/page.tsx` + `web/components/agents/`

- `AgentsHub.tsx` → `FlatList` of agent cards
- `ConnectedAgents.tsx` → status badges + connect/disconnect actions
- `agent-icons.tsx` → port as-is (SVG icons via `react-native-svg`)
- Capability gates: port `CapabilityAccessContext.tsx` + `CapabilityGate.tsx` as-is

### 4.2 Partners (AI Personas) Screen

**Route:** `app/partners/index.tsx` + `app/partners/[partnerId].tsx`
**Web source:** `web/app/(workspace)/partners/` + `web/components/partners/`

- `PartnerAvatar.tsx` → `expo-image` with fallback initials
- `PartnerChat.tsx` → reuse ChatMessageList + ChatComposer from Phase 3
- `PartnerComposer.tsx` → same composer, filtered to partner context
- `PartnerConfigure.tsx` → form screen (pushed Stack)
- `PartnerChannels.tsx` → horizontal scroll channel selector
- `FaceEditor.tsx` → `expo-image-picker` + simple crop UI
- `SoulEditor.tsx` → multi-line `TextInput` for system prompt
- `SoulPicker.tsx` → bottom sheet list picker
- `ToolPicker.tsx` → multi-select bottom sheet
- `PartnerModelPicker.tsx` → bottom sheet with model list
- `PartnerArchives.tsx` → `FlatList` of archived chats
- `schema-form.tsx` → generic JSON schema form (port to RN `TextInput` / `Switch` / `Picker`)

### 4.3 Quiz Screen

**Route:** `app/quiz.tsx` (pushed from chat or space)
**Web source:** `web/components/quiz/`

- `QuizViewer.tsx` → `ScrollView` with question cards, `Pressable` answer options
- `QuizConfigPanel.tsx` → bottom sheet form
- `QuizFollowupTabBody.tsx` → tab view
- `FollowupChatComposer.tsx` → reuse composer from Phase 3
- Port `QuizFollowupContext.tsx` as-is
- Score display: `Animated` progress arc

### 4.4 Research Screen

**Route:** `app/research.tsx` (pushed from chat)
**Web source:** `web/components/research/`

- `ResearchConfigPanel.tsx` → bottom sheet form
- `ResearchOutlineEditor.tsx` → collapsible section list with drag-to-reorder
  (`react-native-draggable-flatlist`)
- Streaming outline generation: same WebSocket client

### 4.5 Book Screen

**Route:** `app/book/index.tsx` + `app/book/[bookId].tsx`
**Web source:** `web/app/(workspace)/book/` + `web/components/` (BookCreator, PageReader, etc.)

- `BookLibrary.tsx` → `FlatList` grid of book covers
- `BookCreator.tsx` → step wizard using `Stack` navigation
- `PageReader.tsx` → **WebView embed** for rich HTML page content;
  fallback to `react-native-markdown-display` for plain text pages
- `PageOutlineNav.tsx` → slide-in drawer from left
- `BookChatPanel.tsx` → bottom sheet chat (reuse ChatMessageList + ChatComposer)
- `BookSidebar.tsx` → collapsible `View` panel
- `SpineEditor.tsx` → drag-reorder chapter list
- `BookProgressTimeline.tsx` → horizontal `ScrollView` timeline
- `BookHealthBanner.tsx` → info banner

### 4.6 Co-Writer Screen

**Route:** `app/co-writer/index.tsx` + `app/co-writer/[docId].tsx`
**Web source:** `web/app/(workspace)/co-writer/`

- Document editor: `WebView` embedding a minimal rich-text editor (TipTap via WebView bridge
  or `react-native-rich-editor`)
- AI suggestions: streaming side panel (bottom sheet)
- Save: POST to `co-writer-api` from `@eduorbit/api-client`

### 4.7 Playground Screen

**Route:** `app/playground.tsx`
**Web source:** `web/app/(workspace)/playground/`

- Minimal composer + response view
- Model/config picker via bottom sheet
- Port `playground-config.ts` from `apps/web/lib/` → `@eduorbit/api-client`

### 4.8 Rich Media WebView Embeds

These web-only libraries are served via WebView on mobile:

| Feature | Web library | Mobile strategy |
|---|---|---|
| Mermaid diagrams | `mermaid` npm | WebView with injected mermaid JS |
| GeoGebra | `Geogebra.tsx` iframe | WebView pointing to geogebra.org |
| Cytoscape (memory graph) | `cytoscape` npm | WebView with injected cytoscape JS |
| Math Animator | Canvas-based | WebView with canvas rendering |
| Visualization Viewer | Custom HTML | WebView with postMessage bridge |
| Excel preview | `exceljs` | WebView with injected xlsx renderer |
| DOCX preview | `docx-preview` | WebView with injected mammoth.js |

**WebView bridge pattern:** inject `window.ReactNativeWebView.postMessage(data)` in the HTML,
receive with `onMessage` prop on `<WebView>` in RN — no native modules needed.

### 4.9 Timetable Screen

**Route:** `app/timetable.tsx` (from Space or drawer)
**Web source:** `web/components/timetable/`

- `TimetableList.tsx` → `FlatList` of timetable cards
- `SyllabusUploadStep.tsx` → `expo-document-picker`
- `SyllabusReviewStep.tsx` → review form
- `AvailabilityStep.tsx` → time slot grid (`FlatList` grid)
- `TimetableGeneratingAnimation.tsx` → `Animated` spinner with status text
- `MonthCalendarView.tsx` → `react-native-calendars` month view
- `TimeGridCalendarView.tsx` → `react-native-calendars` timeline view
- `UpcomingTimetableWidget.tsx` → card widget (reuse on Space screen)

### 4.10 Admin Screen

**Route:** `app/admin/users.tsx` (only visible to admin users — same `RequireCapability` gate)
**Web source:** `web/app/(admin)/admin/users/page.tsx`

- `FlatList` of user rows with delete swipe action
- Filter/search `TextInput` at top
- Capability check: hide tab entirely for non-admin users

### 4.11 Framer Motion → Reanimated

All `framer-motion` animations in the web need to be replaced with `react-native-reanimated`:

| Web pattern | Mobile equivalent |
|---|---|
| `motion.div` fade/slide | `Animated.View` with `useSharedValue` + `withTiming` |
| `AnimatePresence` exit | `useAnimatedStyle` opacity/translate |
| Layout animations | `Layout` from `reanimated` |
| Gesture drag | `react-native-gesture-handler` `PanGestureHandler` |

### 4.12 Push Notifications

- Install `expo-notifications`
- Register device token on login and send to backend `POST /api/v1/notifications/register`
- Handle foreground + background notification routing via Expo Router `linking` config

### 4.13 Offline & Performance

- Cache last 20 sessions in `expo-sqlite` for offline read
- Skeleton loading screens using `react-native-skeleton-placeholder`
- Image caching: `expo-image` has built-in disk cache — no extra config
- List virtualization: all lists must use `FlatList` or `SectionList` (never `ScrollView` + map)

### 4.14 Final Polish

- Splash screen: `expo-splash-screen` with EduOrbit logo animation
- App icon: generate from `assets/figs/logo/logo.png` via `expo` asset pipeline
- Haptics: `expo-haptics` on primary actions (send message, delete, toggle)
- Accessibility: all `Pressable` components get `accessibilityLabel` and `accessibilityRole`
- Keyboard handling: audit every form screen for `KeyboardAvoidingView`
- Safe area: every screen uses `SafeAreaView` or `edges` prop from
  `react-native-safe-area-context`
- Android back button: handle via `useBackHandler` in chat and detail screens
- Orientation: lock to portrait via `expo-screen-orientation`

### 4.15 Build & Distribution

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure builds
eas build:configure

# Development build (replaces Expo Go for native modules)
eas build --profile development --platform ios
eas build --profile development --platform android

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

- Add `eas.json` with `development`, `preview`, and `production` profiles
- Add GitHub Actions workflow `.github/workflows/eas-build.yml` triggered on `release/*` tags
- OTA updates: `expo-updates` for JS-only fixes without store re-submission

**Phase 4 Deliverable:** Feature-complete mobile app matching the web app. Passes Expo Go
testing. EAS development build runs all features. Ready for store submission.

---

## Summary

| Phase | Focus | Tokens | Wall-clock |
|---|---|---|---|
| 1 | Monorepo + Expo scaffold + design tokens | ~200k | 2–3 h |
| 2 | Shared packages + Auth + Navigation shell + i18n | ~400k | 4–6 h |
| 3 | Chat, Space, Knowledge, Notebook, Settings, Profile, Memory | ~800k | 8–10 h |
| 4 | Agents, Partners, Quiz, Research, Book, Co-writer, WebViews, Timetable, Admin, Polish, Build | ~600k | 6–8 h |
| **Total** | | **~2M tokens** | **~20–27 h** |

---

## Key Dependency Map

```
packages/types          ← no deps
packages/api-client     ← @eduorbit/types
packages/ui-tokens      ← no deps

apps/web                ← @eduorbit/types, @eduorbit/api-client, @eduorbit/ui-tokens
apps/mobile             ← @eduorbit/types, @eduorbit/api-client, @eduorbit/ui-tokens
```

The Python backend (`edux`, `edux_web`, `edux_cli`) is **never modified** —
the mobile app is a pure API consumer of the same endpoints as the web app.

---

## Quick-start Commands (after plan is approved)

```bash
# 1. Install pnpm globally if not present
npm install -g pnpm

# 2. Init workspace
pnpm init

# 3. Move web into apps/
mkdir -p apps && mv web apps/web

# 4. Create Expo app
cd apps && npx create-expo-app mobile --template tabs && cd ..

# 5. Install workspace deps
pnpm install

# 6. Run both apps concurrently
pnpm --filter web dev &
pnpm --filter mobile start
```
