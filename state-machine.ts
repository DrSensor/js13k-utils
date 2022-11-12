import { AnyFunc, isNullish, TypedArray } from ".";
import {
  isConstructable,
  isFunction,
  Map2Record,
  partition,
  randomHex,
  toArray,
} from ".";
const { assign, defineProperty, values } = Object;

type Ident = AnyFunc | string | number;
const getName = (ident: Ident) => isFunction(ident) ? ident.name : ident;

type Trigger = PropertyKey;
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

  let currentTab: Transition, currentState: State, index = 0;
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
                  currentTab = table.get(currentState = next); // transition
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
      currentTab = table.get(startState);
      return new Proxy(
        defineProperty(
          function (...args: unknown[]) {
            return new.target && isConstructable(currentState)
              ? new currentState(...args)
              : isFunction(currentState)
              ? currentState(...args)
              : currentState;
          },
          Symbol.species,
          { get: () => isConstructable(currentState) ? currentState : Machine },
        ),
        { get: (target, property) => currentTab[property] ?? currentTab[""] },
      );
    }
    static table = table; // used for serialization
  };
};

/**
 * @example
 * const State = logic`${A} -> ${B} @ ${C}`
 *     , table = new Table(State)
 *
 * assert(table.state.get(A) === 0)
 * assert(table.event[C.name] === 0)
 * assert(table.inverse.event[0] === C)
 * assert(table.inverse.state[1] === B)
 */
export class Table {
  state = new Map<Ident, number>();
  event = new Map<Ident, number>();
  constructor({ table }: MachineConstructor) {
    let stateIndex = 0, eventIndex = 0;
    const { state, event, inverse } = this;
    for (const [s, transition] of table) {
      inverse.state.set(stateIndex, s);
      state.set(s, stateIndex++);
      for (const { event: e } of values(transition)) {
        inverse.event.set(eventIndex, e);
        event.set(e, eventIndex++);
      }
    }
  }
  inverse = {
    state: new Map<number, Ident>(),
    event: new Map<number, Ident>(),
  };
}

/**
 * @example
 * const State = logic`${A} -> ${B} @ ${C}`
 *     , table = new Table(State)
 *     , transition = new LUT(State, table)
 *
 * let currentState = table.state.get(A)
 *   , event = table.state.get(C)
 *
 * let nextState: number = transition[currentState][event]
 * assert(nextState === table.state.get(B))
 * deepAssert(transition === [
 * //--value--B----------------\
 * //         |                |
 *           [1],//--A--index--|
 * //         |                |
 * //--index--C----------------/
 * ])
 */
export class LUT {
  constructor(machine: MachineConstructor, table = new Table(machine)) {
    const result: number[][] = [];
    for (const [state, transition] of machine.table) {
      const current = result[table.state.get(state)] = [];
      for (const { event, next } of values(transition)) {
        current[table.state.get(event)] = table.state.get(next);
      }
    }
    return result;
  }
}

_:
`
0 -> 1
1 -> 0 @ 1
1 -> 2 @ 1
0 -> 3 @ 2
`;
_:
[
  /*0*/ [1, , 3],
  /*1*/ [, 2, 0],
  /*2*/ [],
  /*3*/ [],
];

const qualifiedName = (ident: Ident) => getName(ident) || randomHex(6);

export const encode = <
  T extends new (array: ArrayLike<number>) => ArrayLike<number> =
    Uint8ArrayConstructor,
>(
  machine: MachineConstructor,
  lookupTable?: LUT, //@ts-ignore ts-bug: since <T extends ... = Uint8ArrayConstructor> doesn't produce error
  TypedArray = Uint8Array as T,
): [InstanceType<T>, SourceMap] => {
  const table = new Table(machine),
    lut = (lookupTable ?? new LUT(machine)) as number[][];

  const sortedTable = [...lut.entries()]
      .sort(([, _t], [, t_]) => _t.length - t_.length),
    data = sortedTable.flatMap(([, t]) => t.map((s) => isNullish(s) ? 0 : ++s)); // shift/add all state value to 1 to support null/undefined in LUT table

  const indexMap = sortedTable.map(([index]) => index);
  const { state: s, event: e } = table.inverse, rid = randomHex(6);
  const event = Map2Record(e, (ident) => getName(ident) || rid);
  const state = Map2Record(s, qualifiedName, (index) => ++index); // shift/add all state value to 1 to support null/undefined in LUT table

  return [new TypedArray(data) as InstanceType<T>, { state, event, indexMap }];
};

/** (nonzero_u8:groupLength) ([nonzero_inc_u8]:strides) ([nonzero_inc_u8]:offsets) ([u8]:contiguous-LUT)
 * (2) (1 2 3) (1 3) ( (1) ((1 2) (2 1) (3 2)) ((3 4 2) ...) )
 * strides[n] = n + 1
 * offsets[n] = strides.length + n
 * strides.length = groupLength
 * offsets.length = groupLength - 1
 * LUT.length = Buffer.length - offsets.length - strides.length - 1
 * LUT[g].length = strides[g] * (offsets[g] ?? 1)
// BUG: get actual next state index
//  * LUT[g][e] = (strides[g] * (offsets[g-1] ?? 1) * e+1) + ((strides.length + offsets.length + 1) - (LUT[g-1].length ?? 0))
//  * LUT[1][0] = (2 * 2 * 1) + ((3 + 2 + 1) - (1 * 1))
//  * LUT[1][0] = (3 * 3 * 1) + ((2 + 1 + 1) - (2 * 1))
 */
const decode = (bin: TypedArray, source: SourceMap): number[][] => {
  return;
};

interface SourceMap {
  state: Record<number, string | number>;
  event: Record<number, string | number>;
  indexMap: Record<number, number>; // store info about currentState indexes before the LUT table is sorted
}

interface Stats {
  // Event is other name for Edge label in graph theory
  totalEvent: number; // exclude eventless/transient transition
  hasTransientTransition: boolean; // event with no name
  // State is other name for Node in graph theory
  totalState: number;
  totalFinalState: number; // it's possible to have more than one final state
  // Transition is other name for Node Edges in graph theory
  maxTransition: number;
  minTransition: number; // zero mean it has final State
  totalTransition: number;
}

export const ttable = <T>(machine): T[][] => {
  throw "Unimplemented";
  return [
    // eventA, eventB
    // ["stateX", "stateY"], // currentState
  ];

  // nextState = table[currentState][event]
  // nextNextState = table[nextState][event]
};

export const quickSerialize = (machine, buffer = Uint8Array) => {
  // 1. calculate bufferSize = columnLength * rowLength
  throw "Unimplemented";
  // TODO: use strided array
};

export const autoSerialize = (machine) => {
  // 2. instantiate TypedArray based on Math.max(...states, ...events)

  // buffer[col + row * rowLength];
  // #define A(x,y) a[x*width + y]
  throw "Unimplemented";
};

type Machine = Record<
  string,
  & Record<Trigger, Ident>
  & (() => MachineConstructor["table"])
>;
interface MachineConstructor {
  new (startState: State): Machine;
  table: Map<State, Transition>;
}
