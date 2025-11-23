# State Machines

## Chat Thread (Dictionary + Tutor)

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Composing : user types (mode retained)
    Composing --> Sending : press Send
    Sending --> DictionaryCard : mode = dictionary / translation success
    Sending --> TutorCard : mode = tutor / response ready
    Sending --> Error : service failure
    DictionaryCard --> SavedToBank : Add pressed / stored locally
    DictionaryCard --> FolderSheet : Folder pressed
    DictionaryCard --> SavedToNotes : NN pressed → create note
    TutorCard --> MemoryLogged : Understood tapped
    FolderSheet --> DictionaryCard : Save or Cancel
    MemoryLogged --> Idle
    SavedToBank --> Idle
    SavedToNotes --> Idle
    Error --> Idle : dismiss banner / retry
```

Key guards:
- `FolderSheet` only available when `bankItemId` exists.
- `Understood` chip disabled once logged to memory graph.
- Offline state short-circuits `Add` action (no remote sync required).

## Adaptive Activity Planner

```mermaid
stateDiagram-v2
    [*] --> AwaitDuration
    AwaitDuration --> SessionQueued : duration selected (5/10/20/60)
    SessionQueued --> SequenceBuilder : fetch due SRS + error memory
    SequenceBuilder --> ActivityDispatch : compute ordered activity stack
    ActivityDispatch --> ActivityInProgress : deliver next activity
    ActivityInProgress --> ActivityDispatch : complete activity / select next
    ActivityDispatch --> SessionComplete : stack exhausted or timer elapsed
    SessionComplete --> AwaitDuration
```

Notes:
- `SequenceBuilder` prioritises SRS due items, then frequent errors, then continuity heuristics.
- `ActivityInProgress` sub-steps (Translation, Flashcards, etc.) report completion metrics that feed the memory graph.
- UI implementation currently surfaces duration picker and activity definitions; sequencing hook ready for future integration.

## Translation Tutor Flow

```mermaid
stateDiagram-v2
    [*] --> ResumeCheck
    ResumeCheck --> SessionConfig : no unfinished batch
    ResumeCheck --> ResumePrompt : unfinished batch exists
    ResumePrompt --> SessionPlayer : continue selected
    ResumePrompt --> SessionConfig : new session selected
    SessionConfig --> Generating : learner taps Generate
    Generating --> SessionPlayer : prompts persisted + modal opens
    SessionPlayer --> PromptState : modal active & awaiting translation
    PromptState --> AnalysisState : submission graded (slide animation)
    AnalysisState --> MiniChat : "Ask Tutor" tapped
    AnalysisState --> PromptState : Next question
    PromptState --> SessionComplete : last question answered
    SessionComplete --> RecapActionSheet : Continue / Switch / End
    RecapActionSheet --> Generating : Continue
    RecapActionSheet --> SessionConfig : Switch activity
    RecapActionSheet --> [*] : End
```

Implementation notes:
- `SessionPlayer` lives inside a slide-up modal; closing it early preserves `progress.currentIndex` so the learner can resume later.
- Each `AnalysisState` exposes actions: add to native notes, flag for SRS priority, open a scoped mini-chat thread, or move on.
- Flagging an item immediately queues an SRS review with a short interval; removing the flag restores the normal cadence.
- Generation respects the learner’s `reviewMode`, `questionCount`, `styleMix`, and `topicTags` before persisting the batch locally.

## Language Profile Switcher (Flag Menu)

```mermaid
stateDiagram-v2
    [*] --> FlagIdle
    FlagIdle --> MenuOpen : flag icon tapped
    MenuOpen --> ProfilePreview : language selected
    ProfilePreview --> ApplyingProfile : Confirm switch
    ProfilePreview --> MenuOpen : back
    ApplyingProfile --> FlagIdle : success (flag + settings updated)
```

Details:
- Each menu entry shows language, region badge, and last activity timestamp pulled from `LanguageProfile`.
- `ApplyingProfile` refreshes the home screen flag asset, injects the profile into the Adaptive Activity Planner, and reloads due SRS queues scoped to that language.
- When a learner adds a new language, a fresh `LanguageProfile` is created, ensuring history and personalization remain per-language/per-region. Flag icon state reflects the active profile at all times.

## Flashcard Training Flow

```mermaid
stateDiagram-v2
    [*] --> ResumeCheck
    ResumeCheck --> SessionConfig : no unfinished batch
    ResumeCheck --> ResumePrompt : unfinished batch exists
    ResumePrompt --> FlashcardModal : continue selected
    ResumePrompt --> SessionConfig : new session selected
    SessionConfig --> Generating : learner taps Generate
    Generating --> FlashcardModal : cards persisted + modal opens
    FlashcardModal --> Reviewing : modal active (swipe + flip)
    Reviewing --> Reviewing : swipe recorded (next card)
    Reviewing --> FlashcardRecap : final card processed
    FlashcardRecap --> Generating : New session
    FlashcardRecap --> SessionConfig : Switch activity
    FlashcardRecap --> [*] : Exit
```

Notes:
- Swipe right = correct, swipe left = needs more review. Each swipe updates the Spaced Repetition store immediately for the linked vocab item so progress isn’t lost if the learner exits mid-session.
- Tapping the card flips between term and definition with a vertical flip animation.
- The tracker in the modal header shows `done/total`, plus real-time counts for “Need review” vs “Mastered”.
- Flagging a card marks it for high-priority SRS scheduling until the flag is removed.
