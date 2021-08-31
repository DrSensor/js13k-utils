// SPDX-License-Identifier: FSFAP

export const { entries, defineProperties } = Object;
const { atan2, PI } = Math;

export const deg2rad = (degree: number) => degree * (PI / 180);

// BUG: somehow terser give an error if rad2deg is exported
const rad2deg = (radian: number) => radian * (180 / PI);

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
