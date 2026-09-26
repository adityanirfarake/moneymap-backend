const asyncHandler = require('../../src/utils/asyncHandler');

describe('asyncHandler utility', () => {
  it('should call the wrapped handler with request, response, and next', async () => {
    const handler = jest.fn().mockResolvedValue('success');
    const wrapped = asyncHandler(handler);
    const req = { body: {} };
    const res = { status: jest.fn() };
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch rejected promises and pass the error to next', async () => {
    const testError = new Error('Async failure');
    const handler = jest.fn().mockRejectedValue(testError);
    const wrapped = asyncHandler(handler);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(testError);
  });

  it('should catch synchronously thrown errors and pass to next', async () => {
    const testError = new Error('Synchronous failure');
    const handler = jest.fn().mockImplementation(() => {
      throw testError;
    });
    const wrapped = asyncHandler(handler);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(testError);
  });
});
