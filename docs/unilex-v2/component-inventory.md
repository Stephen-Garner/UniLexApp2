# Component Inventory

## Cards & Surfaces
- **MetricCard** (`HomeScreen`) – 8px padding grid, 12px radius, elevation level 2. Responds with 150 ms opacity animation.
- **QuickAccessCard** (`HomeScreen`) – 160×120dp mini card with accent icon marker.
- **ActivityTile** (`HomeScreen`) – 120×120dp grid tile, centered icon glyph, toggle effect on press.
- **DictionaryCard** (`ChatScreen`) – Headword block, definition stack, example list, action row, tag chip row. Elevation 2, 24sp typography.
- **TutorBubble** (`ChatScreen`) – Alternating chat bubble with inline CTA chip.
- **WordCard** (`WordBankScreen`) – Summaries with SRS row, tag chips, CTA.
- **NoteCard** (`NativeNotesScreen`) – Status badge, content excerpt, timestamp metadata.
- **SessionCard / ActivityCard** (`ActivitiesScreen`) – 24px top padding, accent badge, bullet columns.
- **HeaderCard** (`NoteDetailScreen`) – Status badge, created/updated metadata.

## Modals & Sheets
- **SearchOverlay** (`HomeScreen`) – 75% height overlay with segmented toggle and suggestion list.
- **ShortcutsModal** (`ChatScreen`) – Centered card listing navigation shortcuts.
- **FolderSheet** (`ChatScreen`) – Bottom sheet with selectable tag chips, Save/Cancel actions.
- **SessionSheet** (`ActivitiesScreen`) – Duration picker matching modal elevation spec.
- **ActionSheet** (`NativeNotesScreen`) – Quick actions for converting or linking notes.

## Controls & Toggles
- **ModeToggle** (`ChatScreen`, `HomeScreen` overlay) – Segmented pill control for Dictionary/Tutor.
- **FilterChips** (`WordBankScreen`, `NativeNotesScreen`) – Border pill with accent active state.
- **StatusBadge** (`NativeNotesScreen`, `NoteDetailScreen`) – Rounded label with palette mapping.
- **UnderstoodChip** (`ChatScreen`) – Logs tutor understanding to memory graph with success color fill.
- **FolderChips** (`ChatScreen` sheet) – Tag toggles surfaced via Watermelon tags.

## Persistent Chrome
- **ScreenHeader** – Shared header with optional left accessory and profile glyph button.
- **HamburgerButton** – Chat-specific left accessory with stacked bars.
- **OfflineBanner** – Retained component, updated to sit under root navigation.
