/* eslint-env jest */

jest.mock('@react-native-community/netinfo', () => {
  return {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() =>
      Promise.resolve({
        isConnected: true,
        isInternetReachable: true,
      }),
    ),
  };
});

jest.mock('react-native-mmkv', () => {
  class MockMMKV {
    constructor() {
      this.store = new Map();
    }

    getString(key) {
      return this.store.get(key) ?? null;
    }

    set(key, value) {
      this.store.set(key, value);
    }

    delete(key) {
      this.store.delete(key);
    }

    remove = this.delete.bind(this);

    getAllKeys() {
      return Array.from(this.store.keys());
    }

    clearAll() {
      this.store.clear();
    }
  }

  const createMMKV = () => new MockMMKV();

  return { MMKV: MockMMKV, createMMKV };
});

jest.mock('react-native-tts', () => {
  const voices = jest.fn(() => Promise.resolve([{ id: 'test-voice', name: 'Test Voice' }]));
  return {
    speak: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    setDefaultLanguage: jest.fn(() => Promise.resolve()),
    setDefaultVoice: jest.fn(() => Promise.resolve()),
    setDefaultRate: jest.fn(() => Promise.resolve()),
    setDefaultPitch: jest.fn(() => Promise.resolve()),
    synthesizeToFile: jest.fn(() => Promise.resolve()),
    voices,
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeAllListeners: jest.fn(),
  };
});

jest.mock('react-native-fs', () => {
  const files = new Map();
  return {
    CachesDirectoryPath: '/tmp',
    DocumentDirectoryPath: '/tmp',
    mkdir: jest.fn(() => Promise.resolve()),
    exists: jest.fn(path => Promise.resolve(files.has(path))),
    readFile: jest.fn((path, encoding) => {
      const data = files.get(path) ?? '';
      return Promise.resolve(encoding === 'base64' ? data : '');
    }),
    unlink: jest.fn(path => {
      files.delete(path);
      return Promise.resolve();
    }),
    writeFile: jest.fn((path, content) => {
      files.set(path, content);
      return Promise.resolve();
    }),
    mkdirIfNotExists: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('react-native-nitro-sound', () => {
  const mock = {
    startRecorder: jest.fn(() => Promise.resolve('/tmp/mock.m4a')),
    stopRecorder: jest.fn(() => Promise.resolve('/tmp/mock.m4a')),
    pauseRecorder: jest.fn(() => Promise.resolve('/tmp/mock.m4a')),
    resumeRecorder: jest.fn(() => Promise.resolve('/tmp/mock.m4a')),
    addRecordBackListener: jest.fn(),
    removeRecordBackListener: jest.fn(),
    addPlayBackListener: jest.fn(),
    removePlayBackListener: jest.fn(),
    addPlaybackEndListener: jest.fn(),
    removePlaybackEndListener: jest.fn(),
    startPlayer: jest.fn(() => Promise.resolve('/tmp/mock.m4a')),
    stopPlayer: jest.fn(() => Promise.resolve('/tmp/mock.m4a')),
    setSubscriptionDuration: jest.fn(),
  };

  return {
    __esModule: true,
    createSound: () => mock,
    Sound: mock,
    default: mock,
  };
});

jest.mock('@nozbe/watermelondb', () => {
  class MockModel {
    constructor() {
      this.id = '';
      this._raw = {};
    }

    _setRaw(key, value) {
      this._raw[key] = value;
      if (key === 'id') {
        this.id = value;
      }
    }

    getRawValue(key) {
      return this._raw[key];
    }

    markAsDeleted() {
      return Promise.resolve();
    }

    destroyPermanently() {
      return Promise.resolve();
    }

    update(updater) {
      updater(this);
      return Promise.resolve(this);
    }
  }

  class MockCollection {
    constructor() {
      this.records = new Map();
    }

    find(id) {
      const record = this.records.get(id);
      if (!record) {
        throw new Error(`Record ID ${id} was not found`);
      }
      return Promise.resolve(record);
    }

    create(factory) {
      const record = new MockModel();
      factory(record);
      if (!record.id) {
        record.id = record._raw.id ?? Math.random().toString(36).slice(2);
        record._raw.id = record.id;
      }
      this.records.set(record.id, record);
      return Promise.resolve(record);
    }

    query(...conditions) {
      return {
        fetch: () => {
          const records = Array.from(this.records.values());
          if (!conditions || conditions.length === 0) {
            return Promise.resolve(records);
          }

          const filtered = records.filter(record =>
            conditions.every(condition => {
              if (!condition || condition.type !== 'where') {
                return true;
              }

              const value = record.getRawValue(condition.column);
              if (condition.value && condition.value.type === 'like') {
                const pattern = String(condition.value.pattern).replace(/%/g, '').toLowerCase();
                return String(value ?? '')
                  .toLowerCase()
                  .includes(pattern);
              }
              if (condition.value === null) {
                return value == null;
              }
              return value === condition.value;
            }),
          );

          return Promise.resolve(filtered);
        },
      };
    }
  }

  class MockDatabase {
    constructor() {
      this.collectionsByName = new Map();
      this.collections = {
        get: tableName => {
          if (!this.collectionsByName.has(tableName)) {
            this.collectionsByName.set(tableName, new MockCollection());
          }
          return this.collectionsByName.get(tableName);
        },
      };
    }

    write(work) {
      return Promise.resolve(work());
    }
  }

  const Q = {
    where: (column, value) => ({ type: 'where', column, value }),
    like: pattern => ({ type: 'like', pattern }),
  };

  const appSchema = schema => schema;
  const tableSchema = schema => schema;

  return {
    Database: MockDatabase,
    Model: MockModel,
    Q,
    appSchema,
    tableSchema,
  };
});

jest.mock('@nozbe/watermelondb/adapters/sqlite', () => {
  return class MockSQLiteAdapter {};
});
