# UniLex v2 Screen Map

```
RootStack
└─ MainTabs
   ├─ Home
   │  ├─ ProgressDashboard (modal push from metrics)
   │  └─ Chat (search overlay launches mode with persisted toggle)
   ├─ Chat
   │  ├─ WordDetail (from dictionary cards)
   │  └─ CreateNote (NN chip > new note)
   ├─ WordBank
   │  ├─ WordDetail
   │  │  ├─ NoteDetail
   │  │  └─ CreateNote
   │  └─ Chat (View in Context)
   ├─ Activities
   │  └─ SessionSheet (duration picker bottom sheet)
   └─ NativeNotes
      ├─ NoteDetail
      │  └─ WordDetail
      └─ CreateNote
└─ Settings (global profile entry)
```

- **Global profile button** appears on every header via `ScreenHeader` and pushes the `Settings` screen on the root stack.
- **Hamburger shortcuts** live on the Chat tab and simply retarget the bottom tabs without unmounting existing state.
- **Progress dashboard** is accessible from any stat card (Home metrics) and returns to the originating tab on back press.
