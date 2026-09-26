describe('db/pool', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should initialize pool without SSL when DATABASE_SSL is false and not production', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    process.env.DATABASE_SSL = 'false';
    delete process.env.NODE_ENV;

    const mockOn = jest.fn();
    const mockPoolInstance = { on: mockOn };
    const mockPoolConstructor = jest.fn().mockImplementation(() => mockPoolInstance);

    jest.doMock('pg', () => ({ Pool: mockPoolConstructor }));

    const pool = require('../../src/db/pool');

    expect(mockPoolConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: 'postgresql://user:pass@localhost:5432/testdb',
        ssl: false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      })
    );
    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    expect(pool).toBe(mockPoolInstance);
  });

  it('should enable SSL when DATABASE_SSL is true', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    process.env.DATABASE_SSL = 'true';

    const mockOn = jest.fn();
    const mockPoolInstance = { on: mockOn };
    const mockPoolConstructor = jest.fn().mockImplementation(() => mockPoolInstance);

    jest.doMock('pg', () => ({ Pool: mockPoolConstructor }));

    require('../../src/db/pool');

    expect(mockPoolConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: { rejectUnauthorized: false },
      })
    );
  });

  it('should enable SSL when NODE_ENV is production', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    process.env.DATABASE_SSL = 'false';
    process.env.NODE_ENV = 'production';

    const mockOn = jest.fn();
    const mockPoolInstance = { on: mockOn };
    const mockPoolConstructor = jest.fn().mockImplementation(() => mockPoolInstance);

    jest.doMock('pg', () => ({ Pool: mockPoolConstructor }));

    require('../../src/db/pool');

    expect(mockPoolConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: { rejectUnauthorized: false },
      })
    );
  });

  it('should log unexpected pool errors when the error event fires', () => {
    const mockOn = jest.fn();
    const mockPoolInstance = { on: mockOn };
    const mockPoolConstructor = jest.fn().mockImplementation(() => mockPoolInstance);

    jest.doMock('pg', () => ({ Pool: mockPoolConstructor }));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    require('../../src/db/pool');

    const errorHandler = mockOn.mock.calls.find((call) => call[0] === 'error')[1];
    const testError = new Error('Database pool broken');
    errorHandler(testError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Unexpected PostgreSQL pool error', testError);
    consoleErrorSpy.mockRestore();
  });
});
