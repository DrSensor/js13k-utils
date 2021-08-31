// SPDX-License-Identifier: FSFAP

/// origin https://javascript.info/call-apply-decorators
// TODO: support async..await, yield, and async..yield..await

export const fps2ms = (fps: number) => 1e3 / fps,
  ms2fps = (ms: number) => 1e3 * ms,
  sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// TODO: await debouce(fn, ms)(...fnArgs)
export const debounce = <T extends (this: any, ...args: any) => void>(
  fn: T,
  ms: number,
) => {
  let timeout: number;
  return ((...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  }) as T;
};

// TODO: await throttle(fn, ms)(...fnArgs)
export const throttle = <T extends (this: any, ...args: any) => void>(
  fn: T,
  ms: number,
) => {
  let isThrottled: boolean, savedArgs: [...Parameters<T>];
  return ((...args) => {
    if (isThrottled) { // (2)
      savedArgs = args;
      return;
    }
    isThrottled = true;
    fn(...args); // (1)
    setTimeout(() => {
      isThrottled = false;
      if (savedArgs) { // (3)
        fn(...savedArgs);
        savedArgs = null;
      }
    }, ms);
  }) as T;
};

// TODO: await delay(fn, ms)(...fnArgs)
export const delay = <T extends (this: any, ...args: any) => void>(
  fn: T,
  ms: number,
) => ((...args) => void setTimeout(() => fn(...args), ms)) as T;

// TODO: let's do ProcessEnv again to support await and yield
