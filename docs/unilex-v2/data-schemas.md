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
