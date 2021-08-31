// SPDX-License-Identifier: FSFAP

export const { entries, defineProperties } = Object;
const { atan2, PI } = Math;

export const deg2rad = (degree: number) => degree * (PI / 180);

// BUG: somehow terser give an error if rad2deg is exported
const rad2deg = (radian: number) => radian * (180 / PI);

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

export type Key = string | number | symbol;
