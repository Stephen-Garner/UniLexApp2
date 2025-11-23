# Data Schemas

## Spaced Repetition (SM-2 Inspired)
Source: `src/contracts/models.ts` (`SrsDataSchema`)

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string (uuid)` | Unique identifier for the SRS record. |
| `algorithm` | `string` | Scheduling algorithm used (e.g., `sm2`). |
| `streak` | `number` | Consecutive successful reviews. |
| `intervalHours` | `number` | Current interval before next review. |
| `easeFactor` | `number` | Ease factor guiding interval growth (2.5–3.0 default). |
| `dueAt` | `ISO string` | Next scheduled review timestamp. |
| `lastReviewedAt` | `ISO string | null` | Timestamp of last completion. |

**Intervals**  
Default cadence: 1 / 6 / 15 / 35 / 75 days. Mastery ≥ 0.9 triggers 60-day recall ping in `useBankStore.updateSrsData`.

## Memory Graph Entries
Source: `src/state/memory.store.ts`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Generated `memory-${random}` key. |
| `prompt` | `string` | Learner prompt or stimulus that was “understood”. |
| `response` | `string` | AI/Tutor response acknowledged. |
| `summary` | `string` | Short log stored for recall surfacing. |
| `createdAt` | `ISO string` | Timestamp of confirmation. |

**Logging Flow**
1. Tutor message → `Understood` button tapped.  
2. `useMemoryStore.logUnderstanding` persists entry to in-memory array (ready for persistence layer upgrade).  
3. Downstream modules (Adaptive Review) may query entries to mix with recall prompts.

## Saved Entities (“View in Context” linkage)
- **Vocabulary** (`VocabItem`) retains `createdAt`, `updatedAt`, `tags`, optional `srsData`.
- **Native Notes** reference `vocabItemId`, optional `videoId` + `timestampSeconds`.  
- All UI actions expose a `View in Context` affordance routing back to the originating Chat thread (currently handled by tab navigation retargeting).

## Translation Tutor Session (`TtxSession`)
Purpose: persist AI-generated translation batches (5–25 prompts) so they can be replayed, resumed, and fed into spaced repetition queues. When populating `vocabPool`, the system should prefer saved Word Bank entries that have never been reviewed yet (no `srsData.lastReviewedAt`). Only when there aren’t enough unseen cards should synthetic vocabulary be generated to fill the batch.

| Field | Type | Description |
| --- | --- | --- |
| `sessionId` | `string (uuid)` | Unique ID for the generated batch. |
| `profileId` | `string` | Learner-language profile key (e.g., `learner-{userId}-{targetLanguage}`). |
| `nativeLanguage` | `LanguageCode` | ISO 639-1 of learner’s base language. |
| `targetLanguage` | `LanguageCode` | ISO 639-1 of active study language. |
| `targetRegion` | `RegionCode | null` | Optional locale shaping slang/idioms (e.g., `mex`, `br`). |
| `difficulty` | `enum` | `intro`, `intermediate`, `advanced`, `expert`. |
| `styleMix` | `{formal:number, slang:number, idioms:number}` | Percentages (sum ≤ 1.0) guiding prompt composition. |
| `reviewMode` | `'review_only' \| 'mixed' \| 'new_only'` | Determines if prompts reinforce known vocab, blend new items, or stay entirely new. |
| `questionCount` | `number (5–25)` | Total questions generated for the session. |
| `topicTags` | `string[]` | Subjects or contexts requested pre-session. |
| `vocabPool` | `VocabItem[]` | Snapshot of the vocab pieces selected for reinforcement (prioritises never-reviewed Word Bank items before falling back to synthetic vocab). |
| `createdAt` | `ISO string` | Batch creation timestamp. |
| `model` | `string` | AI model/version used to generate prompts. |
| `items` | `TtxItem[]` | Ordered list of translation prompts (matches `questionCount`). |
| `recap` | `TtxRecap | null` | Filled after user completes the batch. |
| `progress` | `{currentIndex:number, isComplete:boolean, lastOpenedAt?:ISO}` | Tracks resume position + completion.

### `TtxItem`
| Field | Type | Notes |
| --- | --- | --- |
| `itemId` | `string` | Deterministic hash of `sessionId` + index. |
| `nativeText` | `string` | Sentence/dialogue snippet shown to learner (mix of declarative + slang; may include multi-turn dialogue separated by `\n`). |
| `context` | `string` | Brief scene description or register hint (max 140 chars). |
| `styleTags` | `('formal' \| 'casual' \| 'slang' \| 'idiom' \| 'business' … )[]` | Quick filters for UI badges. |
| `expectedTranslations` | `{text:string, register:string, notes:string}[]` | Acceptable answers + nuance. |
| `focusVocabIds` | `string[]` | IDs from `vocabPool` emphasized in this prompt. |
| `commonPitfalls` | `{type:'false_cognate' \| 'gender' \| 'aspect' \| 'register', explanation:string}[]` | Used to contextualize mistakes. |
| `gradingRubric` | `{mustInclude:string[], tolerate:string[], reject:string[]}` | Mini constraints for the live grader. |
| `insightHook` | `string` | Tutor talking point if learner errs (e.g., “Explain why *embarazada*≠embarrassed”). |
| `history` | `TtxItemHistory[]` | Filled as learner answers/AI grades. |
| `isFlagged` | `boolean` | Marks whether the learner starred this prompt for extra review. |

### `TtxItemHistory`
Captures every attempt for personalization.

| Field | Type | Description |
| --- | --- | --- |
| `attemptId` | `string` | uuid. |
| `answer` | `string` | Learner submission. |
| `score` | `0–1` | Normalized grading result. |
| `feedback` | `string` | Tutor response delivered in-app. |
| `errorTags` | `string[]` | Derived from `commonPitfalls` (`false_cognate`, `agreement`, etc.). |
| `gradedAt` | `ISO string` | Timestamp. |

### `TtxRecap`
Populated after each 10-question block.

| Field | Type | Description |
| --- | --- | --- |
| `accuracy` | `number` | Average score across first attempts. |
| `durationsSeconds` | `number[]` | Time-to-answer per item for pacing heuristics. |
| `recommendedActions` | `string[]` | e.g., “Repeat slang-heavy set”, “Switch to listening activity”. |
| `srsQueue` | `{vocabId:string, dueAt:ISO string}[]` | Items scheduled for spaced repetition. |

## Learner Language Profile (`LanguageProfile`)
One profile per `(userId, targetLanguage)` (optionally per region) so history, SRS queues, and tutor preferences stay scoped.

| Field | Type | Description |
| --- | --- | --- |
| `profileId` | `string` | `profile-{userId}-{targetLanguage}-{region?}`. |
| `userId` | `string` | Owner. |
| `nativeLanguage` | `LanguageCode` | Primary UI + prompt language. |
| `targetLanguage` | `LanguageCode` | Study target. |
| `targetRegion` | `RegionCode | null` | Dialect/school (e.g., `es-mx`, `pt-br`). |
| `preferredDifficulty` | `enum` | Seeds new sessions. |
| `stylePreferences` | `{slang:number, idioms:number, formal:number}` | Default mix slider. |
| `savedSessions` | `sessionId[]` | References to `TtxSession` documents stored locally. |
| `srsState` | `SrsDataSchema[]` | Tailored per language. |
| `errorLedger` | `{vocabId:string, errorTags:string[], count:number}`[] | Used to choose future prompts. |
| `lastFlagAsset` | `string` | Asset key for the home-page flag icon. |
| `updatedAt` | `ISO string` | For sync/backup. |

## Translation Session Generation Prompt
All translation batches are produced with a single structured AI call to keep costs predictable. Pseudocode template (YAML for readability):

```yaml
system: |
  You are UniLex’s Translation Tutor generator. Produce exactly 10 prompt objects
  following the provided JSON schema. Optimize for the learner’s native language,
  target language, region, difficulty, and requested style mix.
user:
  session_meta:
    native_language: {{nativeLanguage}}
    target_language: {{targetLanguage}}
    target_region: {{targetRegion | 'none'}}
    difficulty: {{difficulty}}
    style_mix:
      formal: {{styleMix.formal}}
      slang: {{styleMix.slang}}
      idioms: {{styleMix.idioms}}
    vocab_pool: {{json vocabSnapshot}}
    topic_tags: {{json topicTags}}
    review_mode: {{reviewMode}}
    question_count: {{questionCount}}
  output_schema: {{json_schema_reference}}
assistant:
  { "sessionId": "...", "items": [ ... 10 entries ... ] }
```

Key rules:
- AI must include at least 3 slang/idiom-heavy prompts when `styleMix.slang ≥ 0.3` or `styleMix.idioms ≥ 0.2`.
- Dialogues should be multi-turn strings separated by `\n` when `styleTags` includes `dialogue`.
- `commonPitfalls` must map to actual reasons a false cognate or grammar slip might happen in the learner’s native language.
- `expectedTranslations` should provide 1 primary + tolerated variants to let the live grader accept near-matches.
- Response must include exactly `question_count` items; never pad or truncate.
- Prioritise Word Bank entries without `srsData.lastReviewedAt` before using previously reviewed items or synthetic vocabulary.

## Flashcard Training Session (`FtxSession`)
Purpose: store swipe-based flashcard batches that blend review and new vocabulary, track per-card results, and support session resume just like translation practice.

| Field | Type | Description |
| --- | --- | --- |
| `sessionId` | `string` | Unique identifier for the flashcard batch. |
| `profileId` | `string` | Active language profile key. |
| `nativeLanguage` | `LanguageCode` | Learner UI language. |
| `targetLanguage` | `LanguageCode` | Study language. |
| `targetRegion` | `RegionCode  null` | Dialect/region badge. |
| `difficulty` | `enum` | Difficulty snapshot used for the batch. |
| `reviewMode` | `'review_only'  'mixed'  'new_only'` | Determines vocabulary blend. |
| `questionCount` | `number (5–50)` | Total number of flashcards. |
| `topicTags` | `string[]` | Optional topical hints provided pre-session. |
| `cards` | `FtxCard[]` | Ordered flashcards in the batch. |
| `createdAt` | `ISO string` | Timestamp the batch was generated. |
| `progress` | `{currentIndex:number, isComplete:boolean, lastOpenedAt?:ISO}` | Tracks resume position. |
| `recap` | `FtxRecap  null` | Populated after the learner finishes the batch. |

### `FtxCard`
| Field | Type | Description |
| --- | --- | --- |
| `cardId` | `string` | Unique per-card identifier. |
| `vocabId` | `string  null` | Word Bank ID if the card maps to saved vocab. |
| `term` | `string` | Target-language term shown on one side. |
| `definition` | `string` | Native-language gloss / backside. |
| `example` | `string  null` | Optional contextual sentence. |
| `isFlagged` | `boolean` | Whether the learner starred the card. |
| `history` | `FlashcardHistory[]` | Swipe outcomes recorded during the session. |

### `FlashcardHistory`
| Field | Type | Description |
| --- | --- | --- |
| `attemptId` | `string` | Unique entry id. |
| `outcome` | `'correct'  'incorrect'` | Swipe result. |
| `timestamp` | `ISO string` | When the swipe happened. |

### `FtxRecap`
| Field | Type | Description |
| --- | --- | --- |
| `accuracy` | `number` | Ratio of correct swipes. |
| `correctCount` | `number` | Total correct cards. |
| `incorrectCount` | `number` | Total incorrect cards. |
| `flaggedCardIds` | `string[]` | Cards the learner flagged for extra review. |
| `srsQueue` | `{vocabId:string, dueAt:ISO}`[] | Follow-up SRS entries generated from the swipe results. |
