// Copyright (c) Fahmi Akbar Wildana
// SPDX-License-Identifier: BSD-2-Clause-Patent

import { clamp, deg2rad, diff } from ".";
const { tanh, abs, sign } = Math;

const constraint = clamp(-1, 1);

/** Move like a vehicle
 *
 * @param distance speed
 * @param degree steer angle/rotation in degree
 * @param handling accelerate (`+number`) or deaccelerate (`-number`) when steering.
 * `number` must between `-1` and `1`. A good value is `+0.3` or `-0.3`.
 */
export type Steer = (
  distance?: number,
  degree?: number,
  handling?: number,
) => void;

export const steer = (
  transform: DOMMatrixReadOnly,
  apply: ((transform: DOMMatrix) => void) = () => {},
) => {
  const move = (distance?: number, degree?: number, handling?: number) => {
    distance ??= 0;
    degree ??= 0;
    handling = constraint(handling ?? 0);
    if (handling < 0) handling = diff(-1, handling);
    const drift = (1 + (
      sign(handling) * tanh(abs(deg2rad(degree))) ** abs(handling)
    )) ** 1.5;
    apply(
      transform = transform.rotate(degree)
        .translate(0, -distance * drift),
    );
  };
  return move as Steer;
};

export const steerElement = (node: HTMLElement | SVGElement) =>
  steer(
    new DOMMatrix(getComputedStyle(node).transform),
    (matrix) => node.style.transform = matrix.toString(),
  );
