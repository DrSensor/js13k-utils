// SPDX-License-Identifier: FSFAP

import { rad2deg } from ".";
const { atan2 } = Math;

// TODO: utils to convert coordinate across SVG
// https://www.sitepoint.com/how-to-translate-from-dom-to-svg-coordinates-and-back-again

// Works perfectly okay 😉
// document.createElementNS("http://www.w3.org/2000/svg", "rect").ownerSVGElement?.createSVGTransformFromMatrix(new DOMMatrix()).angle

// https://css-tricks.com/get-value-of-css-rotation-through-javascript
// TODO: read SVGGraphicsElement.prototype.getCTM() and SVGTransform
export const matrixAngle = ({ a, b }: DOMMatrix2DInit) => rad2deg(atan2(b, a));
export const matrixScale = ({ a, b }: DOMMatrix2DInit) =>
  (a ** 2 + b ** 2) ** .5;

type Matrix = DOMMatrixInit | Element;

export const angle = (source: Matrix) => matrixAngle(matrix(source));

export const scale = (source: Matrix) => matrixScale(matrix(source));

export const matrix = (source: Matrix) =>
  source instanceof Element
    ? new DOMMatrix(getComputedStyle(source).transform)
    : DOMMatrix.fromMatrix(source);

// TODO: support DOMPointInit (3D)

type Rectangle = DOMRectInit | Element;

export const center = (source: Rectangle) => {
  const c = (p: number, l: number): number => p + (l ?? 0) / 2,
    { x, y, width, height } = rectangle(source);
  return { x: c(x, width), y: c(y, height) };
};

export const diff = (source: Rectangle, target: Rectangle) => ({
  x: center(target).x - center(source).x,
  y: center(source).y - center(target).y,
});

export const lineAngle = (source: Rectangle, target: Rectangle) => {
  const d = diff(source, target);
  return rad2deg(atan2(d.x, d.y));
};

export const lineDistance = (source: Rectangle, target: Rectangle) => {
  const d = diff(source, target);
  return (d.x ** 2 + d.y ** 2) ** .5;
};

export const rectangle = (source: Rectangle) =>
  source instanceof Element ? source.getBoundingClientRect() : source;
