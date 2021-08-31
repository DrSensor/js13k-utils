// Copyright (c) Fahmi Akbar Wildana
// SPDX-License-Identifier: 0BSD

import type { AnyFunc } from ".";
const { assign } = Object;

// TODO: Support `await sleep(ms)` or `yield sleep_ms` 🤔

// export const requestTimeout = (callback: (ms?: number) => void, ms: number) =>
//   setTimeout(() => requestAnimationFrame(callback), ms);
export const requestTimeout = (
  callback: (ms: number) => void,
  ms: number,
) => {
  let handler: number;
  const start = performance.now();
  void function loop(now: number) {
    const dt = now - start;
    dt >= ms ? callback(dt) : handler = requestAnimationFrame(loop);
  }(start);
  return attachRID(callback, () => handler);
};

// export const requestInterval = (callback: (ms?: number) => void, ms: number) =>
//   setInterval(() => requestAnimationFrame(callback), ms);
export const requestInterval = (
  callback: (ms?: number) => void,
  ms: number,
) => {
  let handler: number, start = performance.now();
  void function loop(now: number) {
    const dt = now - start;
    if (dt >= ms) {
      callback(dt);
      start = now;
    }
    handler = requestAnimationFrame(loop);
  }(start);
  return attachRID(callback, () => handler);
};

export const requestLoop = (callback: (ms?: number) => void, ms: number) => {
  let handler: number, start = performance.now();
  void function loop(now: number) {
    const dt = now - start;
    dt <= ms ? callback(dt) : start = now;
    handler = requestAnimationFrame(loop);
  }(start);
  return attachRID(callback, () => handler);
};

export const requestTimestep = (
  callback: (ms?: number) => void,
  ms: number,
  maxIter = Infinity,
) => {
  let handler: number, lag = 0, count = 0, start = performance.now();
  void function loop(now: number) {
    const dt = now - start;
    for (
      lag += dt, count = 0;
      lag >= ms && count <= maxIter;
      lag -= ms, count++
    ) {
      callback(dt);
    }
    start = now;
    handler = requestAnimationFrame(loop);
  }(start);
  return attachRID(callback, () => handler);
};

export const cancelAnimationRequest = (callback: AnyFunc) =>
  cancelAnimationFrame(callback[rid]());

const rid = Symbol();
const attachRID = <T extends AnyFunc>(value: T, get: () => number) =>
  assign(value, { [rid]: get });

// TODO: let's do ProcessEnv again to support await and yield
