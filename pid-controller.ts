// Copyright (c) Fahmi Akbar Wildana
// SPDX-License-Identifier: 0BSD

const PID = process.env.PID;

/** This is just the basic PID.
 * There is still room for improvement.
 * @see http://brettbeauregard.com/blog/2011/04/improving-the-beginners-pid-introduction
 * @see https://github.com/m-lundberg/simple-pid#other-features for API design */
export default (kp: number, kd?: number, ki?: number) => {
  let lastError = 0, errorSum = 0, setpoint = 0;
  return [
    (value: number, dt: number) => {
      const error = setpoint - value;
      let output = kp * error;
      if (!PID || PID === "PD" || "PID" === PID) {
        output += kd * (error - lastError) / dt;
        lastError = error;
      }
      if (!PID || "PID" === PID) {
        errorSum += error * dt;
        output += ki * errorSum;
      }
      return output;
    },
    (value: number) => setpoint = value,
  ] as const;
};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PID?: "P" | "PD" | "PID";
    }
  }
}
