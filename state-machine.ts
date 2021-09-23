import type { AnyFunc, Key } from ".";
import { isFunction, partition } from ".";
const { isArray } = Array;

type Ident = AnyFunc | string | number;
const getName = (ident: Ident) => isFunction(ident) ? ident.name : ident;

export default (tokens: string[], ...idents: Ident[]) => {
  type Event = Key;
  type Action = Ident;
  type State = Ident;
  type Transition = Record<Event, Action>;

  const symbols = partition(
      tokens,
      (token) => token === "\n",
      (token) => token.trim(),
    ),
    table = new Map<State, Transition>(),
    context = {};

  let currentState: Transition, index = 0;
  for (const [transition, trigger] of symbols) {
    let current1: Ident, current2: Ident, next: Ident;
    const from = transition.startsWith("<-"), into = transition.endsWith("->");
    if (into || from) {
      if (into) {
        table.set(current1 = idents[index], { "": next = idents[index + 1] });
      }
      if (from) {
        table.set(current2 = idents[index + 1], { "": next = idents[index] });
      }
      index += 2;
    } else {
      throw SyntaxError(
        `found "${transition}" instead of "->", "<-", or "<->"`,
      );
    }
    if (trigger === "@") {
      const event = idents[++index];
      for (const current of [current1, current2]) {
        const handler = table.get(current), nextName = getName(next);
        if (handler) {
          handler[""] = undefined; // rename property [""] to [event]
          delete Object.assign(handler, {
            [getName(event)]: [event, next].some(isFunction)
              ? {
                [nextName]: (...args: unknown[]) => {
                  currentState = table.get(next);
                  args = isFunction(event)
                    ? event.apply(context, args)
                    : undefined;
                  if (isFunction(next)) {
                    return next.apply(
                      context,
                      isArray(args) || args === undefined ? args : [args],
                    );
                  } else return args;
                },
              }[nextName]
              : next,
          })[""];
        }
      }
    } else throw SyntaxError(`found "${trigger}" instead of "@"`);
  }

  return class {
    constructor(startState: State) {
      currentState = table.get(startState);
      return new Proxy(() => currentState, {
        get: (target, property) => currentState[property],
      });
    }
  };
};

export const ttable = <T>(machine): T[][] => {
  throw "Unimplemented";
  return [
    // eventA, eventB
    // ["stateX", "stateY"], // currentState
  ];

  // nextState = table[currentState][event]
};

export const quickSerialize = (machine, buffer = Uint8Array) => {
  // 1. calculate bufferSize = columnLength * rowLength
  throw "Unimplemented";
};

export const autoSerialize = (machine) => {
  // 2. instantiate TypedArray based on Math.max(...states, ...events)

  // buffer[col + row * rowLength];
  // #define A(x,y) a[x*width + y]
  throw "Unimplemented";
};
