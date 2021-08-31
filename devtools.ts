// SPDX-License-Identifier: WTFPL

import type { AnyFunc } from ".";

// TODO: trail.<fn>(any) should accept primitive value (non callable nor constructable) too
interface Trail<F extends AnyFunc> {
  assert<T extends F>(
    condition: boolean | ((result: ReturnType<T>) => boolean),
    fn: T,
  ): T;
  table<T extends F>(fn: T, properties?: TrailTable | string[]): T;
  count<T extends F>(fn: T): T;
  countReset<T extends F>(fn: T): T;
  time<T extends F>(fn: T): T;
  timeLog<T extends F>(fn: T): T;
  timeStamp<T extends F>(fn: T): T;
  profile<T extends F>(fn: T): T;
  group<T extends F>(fn: T): T;
  groupCollapsed<T extends F>(fn: T): T;
  dirxml<T extends F>(fn: T): T;
  debug<T extends F>(fn: T): T;
  error<T extends F>(fn: T): T;
  info<T extends F>(fn: T): T;
  log<T extends F>(fn: T): T;
  dir<T extends F>(fn: T): T;
  trace<T extends F>(fn: T): T;
  warn<T extends F>(fn: T): T;
}
interface TrailTable {
  readonly arguments?: string[];
  readonly return?: string[];
  readonly this?: string[];
}

export const trail: Trail<AnyFunc> = new Proxy({} as any, {
  get: (_, property: keyof typeof trail) =>
    (
      cond$fn: Parameters<typeof trail[keyof typeof trail]>[0],
      opts$fn?: Parameters<typeof trail[keyof typeof trail]>[1],
    ) => {
      const fn = (property === "assert" ? opts$fn : cond$fn) as AnyFunc;
      return { // TODO: find a way to forward fn.length (some memoization technique depend on fn.length)
        [fn.name](...args: any[]) {
          const args$ = args.reduce(
            (prev, val) => prev.concat(val).concat(","),
            this instanceof Window ? [] : ["this:", this, ","],
          ).slice(0, -1);

          let result = property === "profile"
            ? undefined
            : fn.apply(this, args);

          switch (property) {
            case "assert":
              const data = [fn.name, "(", ...args$, ") =>", result];
              console[property](
                typeof cond$fn === "boolean" ? cond$fn : cond$fn(result),
                ...data,
              );
              break;

            case "count":
            case "countReset":
            case "countReset":
            case "timeStamp":
              console[property](fn.name);
              break;

            case "table":
              const opts = (opts$fn ?? {}) as TrailTable;
              const props = Array.isArray(opts$fn) ? opts$fn : undefined;
              console.group(fn);
              if (!(this instanceof Window)) {
                console.groupCollapsed("this =", this);
                console[property](this, opts.this ?? props);
                console.groupEnd();
              }
              if (args.length) {
                console.groupCollapsed("arguments =", args);
                console[property](args, opts.arguments ?? props);
                console.groupEnd();
              }
              console.groupCollapsed("return", result);
              console[property](result, opts.return ?? props);
              console.groupEnd();
              console.groupEnd();
              break;

            case "time":
            case "profile":
              console[property](fn.name);
              result = fn.apply(this, args);
              console[property + "End"](fn.name);
              break;

            default:
              console[property](fn.name, "(", ...args$, ") =>", result);
              break;
          }
          return result;
        },
      }[fn.name];
    },
});

// TODO: find WebExtension for DevTools to plot variable/data over time
