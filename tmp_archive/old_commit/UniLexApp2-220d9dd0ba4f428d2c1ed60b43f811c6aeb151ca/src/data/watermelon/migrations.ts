import { addColumns, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const vocabularyMigrations = schemaMigrations({
  migrations: [
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 'bank_items',
          columns: [{ name: 'folders', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: 'notes',
          columns: [{ name: 'title', type: 'string', isOptional: true }],
        }),
      ],
    },
  ],
});
