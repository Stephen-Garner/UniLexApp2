# UniLex v2 Wireframes (Mid-Fi, Annotated)

## Home Tab
- **Stats Bar (Streak · New Words · Accuracy)**  
  - Tap → push `ProgressDashboard`.  
  - Each card includes iconography stub and uses `MetricCard` component with 8px baseline grid.  
  - Micro animation: opacity dip 0.85 on press (150 ms).
- **Search Bar**  
  - Press → 75% height modal overlay with local-first autocomplete list.  
  - Toggle strip pinned above keyboard switches Dictionary/Tutor mode (state persisted while modal is open).  
  - “Open Thread” CTA routes into Chat tab with the selected mode.
- **Quick Access Cards**  
  - Two-card stack (Word Bank / Native Notes) sized 160×120dp.  
  - Cards use `QuickAccessCard` with micro shadow (Elevation 2).  
  - Single tap re-targets `TabNavigator`.
- **3×3 Activity Grid**  
  - Uniform 120×120dp tiles in Spotify-style layout.  
  - Grid labelled “Practice Board”; all tiles open Activities tab.  
  - Icons represented with accent outlined glyph placeholders.

## Chat Tab
- **Header**  
  - Hamburger button left for shortcuts modal; profile glyph right.  
  - Subtitle “Unified memory-aware thread”.
- **Conversation Stream**  
  - User bubbles (accent background).  
  - Dictionary cards: headword 24sp, meta italic 14sp, numbered definition stack, examples, and action row `[Add][Remove][Folder][NN]`.  
  - Tutor responses: neutral card with inline bullet list and `Understood · Log` chip (green when recorded).  
  - Typing indicator: three animated dots (opacity pulses in CSS-in-JS animation placeholder).
- **Composer**  
  - Persistent mode toggle pill above keyboard.  
  - Multiline input + Send button.  
  - Disabled while AI is “typing” (simulated).
- **Shortcuts Modal**  
  - Fade overlay with five quick-launch actions.  
  - Buttons dispatch to respective tabs.
- **Folder Bottom Sheet**  
  - 24px rounded top, tag toggles to update Watermelon tags via `updateTags`.

## Word Bank Tab
- **Header**: Title “Word Bank”, subtitle “Folders, flashcards, SRS reviews”.
- **Search Input**: Surface-filled input with local filtering.
- **Folder Chips**: `All Words` pinned first, followed by dynamic tag chips; active chip equals accent background.
- **Sort Row**: 4 chips (Newest, Due, Difficulty, A–Z) controlling in-memory sort.
- **Word Card**  
  - Term + level, created date, meaning, first example, tag chips, “View detail” CTA, SRS status, and View in Context link.
- **Pull-to-refresh**: reloads bank repository.

## Activities Tab
- **Session Card**  
  - Displays chosen duration, CTA opening bottom sheet.  
  - Step copy emphasises memory graph orchestration.
- **Activity Cards (9)**  
  - Each includes accent badge, title, three bullet annotations summarising behaviour.  
  - Preview button reserved for future flows.
- **Session Sheet**  
  - Modal sheet with four duration options, description text, and auto-close on select.

## Native Notes Tab
- **Toolbar**  
  - Search field, status filter chips (All/Open/Answered), `New note` button.
- **Note List**  
  - Cards show linked term, content excerpt, optional answer, status badge (blue/green).  
  - Tap opens `NoteDetail`; long press opens quick-action sheet.
- **Action Sheet**  
  - Provides placeholder actions for converting to flashcard or linking to term.
- **Empty State**  
  - Instruction on using NN chips in chat.
