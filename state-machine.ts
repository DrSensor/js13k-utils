import { isConstructable, isFunction, partition, toArray } from ".";
const { assign, defineProperty } = Object;

type Ident = AnyFunc | string | number;
const getName = (ident: Ident) => isFunction(ident) ? ident.name : ident;

type Trigger = Key;
type Action = Ident;
type State = Ident;
type Transition = Record<Trigger, Action & Ref>;
type Ref = { next?: State; event?: Ident };

export default (tokens: string[], ...idents: Ident[]) => {
  const symbols = partition(
      tokens,
      (token) => ["\n", ""].includes(token),
      (token) => token.trim(),
    ),
    table = new Map<State, Transition>(),
    context = {};

  let currentState: Transition, currentKey: State, index = 0;
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
        let nextFn = {} as AnyFunc & Ref;
        if (handler) {
          handler[""] = undefined; // rename property [""] to [event]
          delete assign(handler, {
            [getName(event)]: [event, next].some(isFunction)
              ? (nextFn = {
                [nextName]: (...args: unknown[]) => {
                  currentState = table.get(currentKey = next); // transition
                  let result: unknown; // transition:act => (next:act |> event:act)
                  if (isFunction(next)) result = next.apply(context, args);
                  return isFunction(event)
                    ? (event.apply(
                      context,
                      toArray(result) ?? args,
                    ) ?? result)
                    : result;
                },
              }[nextName])
              : next,
          })[""];
        }
        assign(nextFn, { event, next }); // used for serialization
      }
    } else throw SyntaxError(`found "${trigger}" instead of "@"`);
  }

  return class Machine {
    constructor(startState: State) {
      currentState = table.get(startState);
      return new Proxy(
        defineProperty(() => currentState, Symbol.species, {
          get: () => isConstructable(currentKey) ? currentKey : Machine,
        }),
        { get: (target, property) => currentState[property] },
      );
    }
    static table = table; // used for serialization
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
