import { appSchema, tableSchema } from '@nozbe/watermelondb';

/** Schema describing the vocabulary bank storage. */
export const vocabularyBankSchema = appSchema({
  version: 3,
  tables: [
    tableSchema({
      name: 'bank_items',
      columns: [
        { name: 'term', type: 'string' },
        { name: 'reading', type: 'string', isOptional: true },
        { name: 'meaning', type: 'string' },
        { name: 'examples', type: 'string', isOptional: true },
        { name: 'tags', type: 'string', isOptional: true },
        { name: 'level', type: 'string' },
        { name: 'created_at', type: 'string' },
        { name: 'updated_at', type: 'string' },
        { name: 'srs_data', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'notes',
      columns: [
        { name: 'vocab_item_id', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'source_language', type: 'string' },
        { name: 'created_at', type: 'string' },
        { name: 'updated_at', type: 'string' },
        { name: 'answer', type: 'string', isOptional: true },
        { name: 'answered_at', type: 'string', isOptional: true },
        { name: 'video_id', type: 'string', isOptional: true },
        { name: 'timestamp_seconds', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'videos',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'channel_title', type: 'string' },
        { name: 'language_code', type: 'string' },
        { name: 'duration_seconds', type: 'number' },
        { name: 'published_at', type: 'string' },
        { name: 'thumbnail_url', type: 'string' },
        { name: 'transcript', type: 'string', isOptional: true },
        { name: 'saved_at', type: 'string' },
      ],
    }),
  ],
});
