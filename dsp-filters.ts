// Copyright (c) Fahmi Akbar Wildana
// SPDX-License-Identifier: 0BSD
import { hz2ms } from "./timing";

// https://www.youtube.com/playlist?list=PLXSyc11qLa1ZCn0JCnaaXOWN6Z46rK9jd

export const IIRFilter = () => function filter() {};

// https://github.com/pms67/LittleBrain-STM32F4-Sensorboard/blob/master/Firmware/Core/Src/FIRFilter.c
export const FIRFilter = () => function filter() {};
export const movingAverage = () => function filter() {};

export const zTransfrom = () => function filter() {};

// https://github.com/pms67/LittleBrain-STM32F4-Sensorboard/blob/master/Firmware/Core/Src/RCFilter.c
export const RCFilter = (cutoffFreqHz: number, dt?: number) => {
  const tau = 1 / (2 * Math.PI * cutoffFreqHz), RC = tau;
  return function filter() {};
};

// wikipedia
// export const RCFilter = (tau: number, dt?: number) => function filter() {};
export const RLFilter = () => function filter() {};
export const LCFilter = () => function filter() {};
export const RLCFilter = () => function filter() {};

export const lowpass = () => function filter() {};
export const highpass = () => function filter() {};
export const bandpass = () => function filter() {}; // lowpass + highpass
