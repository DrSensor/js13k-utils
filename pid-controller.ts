// Copyright (c) Fahmi Akbar Wildana
// SPDX-License-Identifier: 0BSD

const PID_MODE = process.env.PID_MODE;
const PID_SETGOAL = process.env.PID_SETGOAL;

/** This is just the basic PID.
 * There is still room for improvement.
 * @see http://brettbeauregard.com/blog/2011/04/improving-the-beginners-pid-introduction
 * @see https://github.com/m-lundberg/simple-pid#other-features for API design */
export default (kp: number, kd = 0, ki = 0) => {
  const setgoal = (value: number | ((value: number) => number)) =>
    setpoint = value;

  let setpoint: number | ((error: number) => number) =
      !PID_SETGOAL || PID_SETGOAL === "setpoint" ? 0 : undefined,
    currentTime: number,
    lastTime: number,
    lastError = !PID_MODE || PID_MODE === "PD" || PID_MODE === "PID"
      ? 0
      : undefined,
    errorSum = !PID_MODE || PID_MODE === "PI" || PID_MODE === "PID" ? 0
    : undefined;
  return [
    function compute(value: number, dt?: number) {
      const error = PID_SETGOAL === "seterror" //@ts-ignore
        ? setpoint?.(value) ?? -value
        : PID_SETGOAL === "setpoint" //@ts-ignore
        ? setpoint - value
        : // default
          typeof setpoint === "function"
          ? setpoint(value)
          : setpoint - value;

      let output = kp * error;
      if (
        !PID_MODE || PID_MODE === "PD" || "PI" === PID_MODE ||
        "PID" === PID_MODE
      ) {
        currentTime = performance.now();
        dt ??= lastTime ? currentTime - lastTime : 0;
        dt = isFinite(dt) ? dt : Number.MAX_SAFE_INTEGER;
      }
      if (!PID_MODE || PID_MODE === "PD" || "PID" === PID_MODE) {
        output += dt ? kd * (lastError - error) / dt : 0;
        lastError = error;
      }
      // console.table({ output, error, lastError, dt });
      if (!PID_MODE || PID_MODE === "PI" || "PID" === PID_MODE) {
        errorSum += error * dt;
        output += ki * errorSum;
      }
      if (!PID_MODE || PID_MODE === "PD" || "PID" === PID_MODE) {
        lastTime = currentTime;
      }
      return output;
    },
    setgoal,
  ] as const;
};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PID_MODE?: "P" | "PD" | "PI" | "PID";
      PID_SETGOAL?: "setpoint" | "seterror";
    }
  }
}
