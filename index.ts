// SPDX-License-Identifier: FSFAP

const { PI, min, max, round, sign, abs } = Math;
const { assign, getPrototypeOf } = Object;
const { iterator } = Symbol;
const { isArray } = Array;

export const isFunction = (value: unknown): value is Function =>
  typeof value === "function";

export const isNumber = (value: unknown): value is number =>
  typeof value === "number";

export const isNullish = (value: unknown): value is Nullish =>
  [undefined, null].includes(value);

export const isConstructable = (value: unknown): value is AnyCtor =>
  typeof value === "function" ? !!value.constructor : false;

export const randomSet = (...args: ([number, number] | number)[]) => {
  const set = args[round(random(args.length - 1))];
  return random(...(set[0] ? set : [set]) as [number]);
};

export const random = ($1: number, $2 = 0) =>
  Math.random() * (max($1, $2) - min($1, $2)) + min($1, $2);

export const randomHex = (length: number) =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(length)),
    (it) => it.toString(16).padStart(2, "0"),
  ).join("");

export const clamp = ($min: number, $max: number) =>
  (value: number) => min(max(value, $min), $max);

export const iclamp = (identity: number) =>
  clamp(-abs(identity), abs(identity)); // using abs() seems redundant 😅

export const diff = ($1: number, $2: number) => {
  const $max = max($1, $2), $min = min($1, $2);
  return $min < 0 && sign($min) == sign($max)
    ? $min - $max
    : sign(abs($min) > $max ? $min : $max) * ($max - abs($min));
};

export const radian = (degree: number) => degree * (PI / 180);

export const degree = (radian: number) => radian * (180 / PI);

export const trim = <T>(
  arrayLike: T[],
  condition: (value: T) => boolean = (v) => !v,
) => {
  const result = Array.from(arrayLike);
  while (condition(result[0])) result.shift();
  while (condition(result[result.length - 1])) result.pop();
  return result;
};

export const partition = <T, R = T>(
  array: T[],
  separator: (value: T | R) => boolean, //@ts-ignore
  map: (value: T) => R = (v) => v,
): R[][] => {
  let result: R[][] = [], index = 0;
  for (const item of trim<T>(array, (it) => separator(map(it)))) {
    const value = map(item);
    if (separator(value)) {
      ++index;
      continue;
    }
    result[index]?.push(value);
    result[index] ??= [value];
  }
  return result;
};

export const Map2Record = <
  K,
  V,
  TK extends Arity1<K> = Arity1<K, K>,
  TV extends Arity1<V> = Arity1<V, V>,
>(
  map: Map<K, V>,
  transformValue = noop as TV,
  transformKey = noop as TK,
): Record<ReturnType<TK>, ReturnType<TV>> => {
  const result = {} as ReturnType<typeof Map2Record>;
  for (const [index, value] of map) {
    result[transformKey(index)] = transformValue(value);
  }
  return result;
};

export const noop = <T>(arg: T) => arg;

/** @see https://github.com/NixOS/nixpkgs/blob/master/lib/lists.nix#L277 */
export const toArray = <T>(value: T[] | T): T[] | Nullish =>
  isArray(value) ? value : isNullish(value) ? value : [value];

export const enumToArray = (obj: Record<number, unknown>): unknown[] =>
  //@ts-ignore filter
  Array.from({ ...obj, length: max(...keys(obj).filter(isNumber)) + 1 });

/** Something like OOP getter/setter but for function arguments
 *
 * @example
 * function createCar(name, speed) { console.log(`${name} ${speed}km/s`); ... }
 *
 * const create = make(createCar), [name, speed] = create
 *
 * // set argument
 * name("suzukind"); speed(12)
 * create() // "suzukind 12km/s"
 *
 * // read previous argument
 * console.log(name())  // "suzukind"
 * create("koyotA")     // "koyotA 12km/s"
 * console.log(name())  // "koyotA"
 * console.log(speed()) // 12
 *
 * @param fn function to wrap (not class)
 * @param args default arguments. Important! The original default arguments will be lose whatever you set it or not.
 * @param setter a custom function to transform the arguments when `fn` is called
 * @returns same function but iterable (it's not array)
 */
export const make = <T extends AnyArrow>(
  fn: T,
  args = [] as Parameters<T>,
  setter = (
    setArg: VArgs<T>,
    callArg: VArgs<T>,
    index: number,
  ) => callArg ?? setArg,
): T & Pick<ObserveArgs<T>, typeof Symbol.iterator> => {
  return assign(
    {
      // using arrow function and not using `fn.apply` because setter/getter for args in `new Class(...args)` not make senses
      [fn.name]: (...args$: Parameters<T>) =>
        fn(...args.map((arg, i) => args[i] = setter(arg, args$[i], i))),
    }[fn.name],
    {
      *[iterator]() {
        for (let i = 0;; i++) {
          yield (value?: VArgs<T>) => args[i] = value ?? args[i];
          args[i] ??= undefined;
        }
      },
    },
  ) as any;
};

type ObserveArgs<T extends AnyFunc> = [...Accessor<Parameters<T>>];
type VArgs<T extends AnyFunc> = Values<Parameters<T>>;

type Accessor<T extends [...any[]]> =
  & { [I in keyof T]: I extends number ? (value?: T[I]) => T[I] : never }
  & { length: T["length"] };

export type Values<T> = T[keyof T];

export type AnyCtor = new (...args: any[]) => any;

export type Arity1<T, V = any> = (arg: T) => V;

export type AnyArrow = (...args: any[]) => any;

export type AnyFunc = (this: Record<Key, any> | void, ...args: any[]) => any;

export type NotSame<T1, T2> = T1 extends T2 ? never : T1;

export type Never<T> = { [K in keyof T]?: never };

export type UnNullable<T> = { [K in keyof T]: NonNullable<T[K]> };

export type UnLiteral<T> = { [K in keyof T]: NonLiteral<T[K]> };

export type NonLiteral<T> = T extends string ? string
  : T extends boolean ? boolean
  : T extends number ? number
  : T extends bigint ? bigint
  : T;

export type Primitive = Exclude<Defined, symbol>;

/** @see https://github.com/Microsoft/TypeScript/issues/7648#issuecomment-541625573 */
export type Defined = Key | boolean | bigint;

export type Nullish = undefined | null;

// TODO: deprecate TypedArray interface when https://developer.mozilla.org/en-US/docs/Web/API/ArrayBufferView shipped
export const TypedArray = getPrototypeOf(Int8Array) as never;
export type TypedArray = ArrayLike<any> & {
  BYTES_PER_ELEMENT: number;
  set(array: ArrayLike<number>, offset?: number): void;
  slice(start?: number, end?: number): TypedArray;
};
export type TypedArrayConstructor<T> = {
  new (): T;
  new (buffer: ArrayBuffer): T;
  BYTES_PER_ELEMENT: number;
};
