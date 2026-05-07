import { debounce } from '../shared/debounce';

describe('debounce', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does not invoke the function immediately', () => {
    const fn = jest.fn();
    debounce(fn, 100)();
    expect(fn).not.toHaveBeenCalled();
  });

  it('invokes the function after the delay', () => {
    const fn = jest.fn();
    debounce(fn, 100)();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets the timer on each call — only fires once', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    jest.advanceTimersByTime(50);
    debounced();           // resets
    jest.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50); // now the second timer fires
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes the most recent arguments to the function', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    debounced('second');
    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('second');
    expect(fn).not.toHaveBeenCalledWith('first');
  });

  it('fires again after a full delay following the first invocation', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);

    debounced();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
