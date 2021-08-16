// Copyright (c) Fahmi Akbar Wildana
// SPDX-License-Identifier: BSD-2-Clause-Patent

export {
  as,
  // asAttribute,
  // asComment,
  // asText,
  // binds,
  createElement as jsx,
  Fragment,
  state,
};

const JSX_FACTORY = process.env.JSX_FACTORY;
const JSX_MODE = process.env.JSX_MODE;
const JSX_FRAGMENT = process.env.JSX_FRAGMENT;
const JSX_COMPONENT = process.env.JSX_COMPONENT;
const JSX_REF_ATTRIBUTE = process.env.JSX_REF_ATTRIBUTE;
const JSX_REF_PROPERTY = process.env.JSX_REF_PROPERTY;
const JSX_STATE_PROPERTY = process.env.JSX_STATE_PROPERTY;
// const JSX_STATE_BIND = process.env.JSX_STATE_BIND;
const JSX_STATE = process.env.JSX_STATE;
const JSX_PROPS = process.env.JSX_PROPS;
const JSX_GC = process.env.JSX_GC;

import type { Key, Never, NonLiteral, Primitive } from ".";
import { defineProperties, entries } from ".";

const Fragment: Record<Key, never> = {};
// const symNode = Symbol(); // fun fact: it's possible to use `undefined`, `null`, or `NaN` as a key 😃

const as = <T>(): JSX.Ref<T> => ({});

const isState = <T>(value: any): value is JSX.State<T> => value && value._;
// typeof value === "object" && symNode in value;
// JSX_STATE_PROPERTY in value && !keys(value).length; // note that JSX_STATE_PROPERTY enumerable is not set

const state = <T extends Primitive>(data?: T): JSX.State<NonLiteral<T>> => {
  const nodes = new Set<Node>();
  switch (JSX_STATE) {
    case "vue":
      return defineProperties({}, {
        _: { get: () => nodes },
        [JSX_STATE_PROPERTY ?? "value"]: {
          get: () => data,
          set: (val: T & string) =>
            nodes.size
              ? nodes.forEach((it) => it.nodeValue = data = val)
              : data = val,
        },
      }) as any;
    case "react":
      return defineProperties([
        () => data,
        (val: T & string) =>
          nodes.size
            ? nodes.forEach((it) => it.nodeValue = data = val)
            : data = val,
      ], { _: { get: () => nodes } }) as any;
    case "S":
      return defineProperties(
        (val?: T & string) =>
          val === undefined // S() read
            ? data
            : (nodes.size // S(val) write
              ? nodes.forEach((it) => it.nodeValue = data = val)
              : data = val),
        { _: { get: () => nodes } },
      ) as any;
    case "setget":
      return {
        get _() {
          return nodes;
        },
        get get() {
          return data;
        },
        set set(val: T & string) {
          nodes.size
            ? nodes.forEach((it) => it.nodeValue = data = val)
            : data = val;
        },
      } as any;
    default:
      const { assign } = Object;
      const get = () => data;
      const set = (val: T & string) =>
        nodes.size
          ? nodes.forEach((it) => it.nodeValue = data = val)
          : data = val;
      return defineProperties( // "S"
        assign((val?: T & string) => val === undefined ? data : set(val), {
          *[Symbol.iterator]() { // "react"
            yield get;
            yield set;
          },
        }),
        {
          [JSX_STATE_PROPERTY ?? "value"]: { get, set }, // "vue"
          ...{ set: { set }, get: { get } }, // "setget"
          _: { get: () => nodes },
        },
      ) as any;
  }
};

// const asText = <T extends Primitive>(
//   data?: T,
// ): JSX.StateText<NonLiteral<T>> => {
//   if (JSX_STATE_PROPERTY) {
//     const txt = new Text(data as string);
//     return asStateNode(txt, data) as any;
//   } else return new Text(data as string) as any;
// };

// const asAttribute = <T extends Primitive>(
//   localname: string,
//   data?: T,
// ): JSX.StateAttr<NonLiteral<T>> => {
//   const attr = document.createAttribute(localname);
//   attr.nodeValue = data as string; // because .value doesn't auto convert to string
//   return JSX_STATE_PROPERTY ? asStateNode(attr, data) : attr as any;
// };

// const asStateNode = <T extends Primitive>(
//   node: Node,
//   data?: T,
// ): JSX.StateNode<NonLiteral<T>> =>
//   defineProperty(node, JSX_STATE_PROPERTY, accessor(node, data)) as any;

// const asComment = <T extends Primitive>(
//   data?: T,
// ): JSX.StateComment<NonLiteral<T>> => {
//   if (JSX_STATE_PROPERTY) {
//     const comment = new Comment(data as string);
//     return asStateNode(comment, data) as any;
//   } else return new Comment(data as string) as any;
// };

// /** @internal when JSX_STATE_PROPERTY is set */
// const accessor = (target: Node, data: Primitive) => ({
//   ...(JSX_STATE_BIND ? { configurable: true } : {}),
//   set: (val) => target.nodeValue = data = val,
//   get: () => data,
// } as PropertyDescriptor);

// const binds = (...states: JSX.StateNode[]) => {
//   if (JSX_STATE_PROPERTY && JSX_STATE_BIND) {
//     let global = JSX_STATE_BIND === "eager"
//       ? states[0][JSX_STATE_PROPERTY]
//       : undefined;

//     states.forEach((state, i) => {
//       let local = JSX_STATE_BIND === "lazy"
//         ? state[JSX_STATE_PROPERTY]
//         : undefined;
//       if (JSX_STATE_BIND === "eager") state[JSX_STATE_PROPERTY] = global;

//       defineProperty(state, JSX_STATE_PROPERTY, {
//         get: () => JSX_STATE_BIND === "lazy" ? local : global,
//         set: (val) =>
//           state.nodeValue = states[i == states.length - 1 ? 0 : i + 1]
//             .nodeValue = JSX_STATE_BIND === "lazy" ? local = val : global = val,
//       });
//     });
//   } else {
//     throw Unimplemented(binds, "JSX_STATE_PROPERTY and JSX_STATE_BIND");
//   }
// };

const createElement: JSX.Factory = (
  component: any,
  props$: Record<Key, any>,
  ...children: any[]
) => {
  props$ ??= {};

  /* Correct order optimized for speed/size?
  1. create element
      switch (typeof tag) {
        case "string": // JSX.InstrinsicAttributes
          element = document.createElementNS(...)
          break
        case "function":
          if (tag instanceof Component) {     // class Component (JSX.Comp)
            return new tag(...)
          } else {                            // function Component (JSX.FC)
            const element = tag.apply(this, [props, ...children]) // [props].concat(children) when optimized for speed
            if (element instanceof Promise) { // AsynFunction (JSX.AC)
              try { return await element } catch { return props.fallback }
              // usage:
              /\* <AsyncComponent fallback={<.../>} standby={<.../>} />
                  const AsyncComponent: JSX.AC = async (props, ...children) => await <.../>
                  //or (note that `async()=>{}` doesn't have `this` context)
                  async function AsyncComponent(this: JSX.ThisAC, props, ...children) {
                    // with default .standby component
                    this.standby = <.../>
                    // but I think default .standby are best achieved using `async function*(){}` 🤔
                    try {
                      await fn(...)
                      return <.../>
                    } catch { // with default .fallback component via try..catch
                      return <.../>
                    }
                  }
              *\/
            }
            else if (Symbol.asyncIterator in element) { // AsyncGeneratorFunction (JSX.ADC)
              return assign((await element.next()).value, { *[Symbol.asyncIterator](){ yield await element.next() } })
              // usage:
              /\* <AsyncComponent iterate={2} /> // calling .next() twice instead of once inside jsx(...) factory
                  async function *AsyncComponent(this: JSX.ThisADC, props, ...children) { // 🤔
                    yield <Standby/>
                    try {
                      await fn(...)
                      yield <Result/>
                    } catch {
                      yield <Fallback/>
                    }
                  }

                  //override <Standby/> and <Fallback/> (maybe prop iterate={2} should be a default 🤔)
                  <AsyncComponent iterate={2} standby={<.../>} fallback={<.../>} /=
                  //maybe <AsyncComponent standby /> would be better (which translate to prop iterate={2})
              *\/
            }
            else if (Symbol.iterator in element) { // GeneratorFunction (JSX.DC)
              return assign(element.next().value, { *[Symbol.iterator]() { yield element.next() } })
              // each yield will **replace** the current element 🤔
              // HINT: children[i].onyield(offspring => children[i].replaceWith(offspring))
              // usage:
              /\* // note that there is no such thing as `const DynamicComponent = *() => {}`
                  function *DynamicComponent(this: JSX.DC, props, ...children) {
                    // you can listen .onyield inside a component (having a default behaviour when yielded)
                    this.onyield = value => {...}
                    for (...) { yield <.../> }
                  }
                  // or listen .onyield outside the component
                  <DynamicComponent ref={dynComp} onyield={value => {...}} />
                  // switching component
                  dynComp.value.next()
              *\/

              // WARN: not necessary since <>{...<Generator/>}</> should be enough
              // or each yield will **insert** element into it's parent 🙅
              // HINT: children[i].onyield(offspring => element.append(offspring))
              // or just normally insert all yield<.../> until .next().done 🙅
              // HINT: element.append(...children[i]())
            }
            else return element
          }
        case "object": // HTMLElement or SVGElement
          element = tag
          break
        default: // Fragment
          return new DocumentFragment()
      }

  2. assign props to attributes
      // props shouldn't include `ref`
      if ( notContainState(props) ) Object.assign(element, props)
      else for (const [name, value] of props) {
        if (name in element) {         // assign via property
          element[name] = value
          ... // process JSX.State
        } else {                       // assign via attribute
          element.setAttribute(name, value)
          ... // process JSX.State
        }
      }

  3. append children to element
      if ( notContainState(children) ) element.append(...children)
      else {...} // process JSX.State

  4. assign `ref` with element
      props.ref = element
  */

  if (JSX_COMPONENT !== "none" && typeof component === "function") {
    if (
      !JSX_REF_ATTRIBUTE ||
      JSX_REF_ATTRIBUTE === "undefined" || JSX_REF_ATTRIBUTE === "null"
    ) {
      return createComponent(component, props$, ...children);
    } else {
      return props$[JSX_REF_ATTRIBUTE][JSX_REF_PROPERTY ?? JSX_REF_ATTRIBUTE] =
        createComponent(
          component,
          omitRef(props$),
          ...children,
        );
    }
  }

  if (JSX_FRAGMENT === "none") {
    component = JSX_FACTORY === "html"
      ? document.createElement(component)
      : JSX_FACTORY === "svg"
      ? document.createElementNS(
        "http://www.w3.org/2000/svg",
        component,
      )
      : document.createElementNS(
        `http://www.w3.org/${mode ? "2000/svg" : "1999/xhtml"}`,
        component,
      );
  } else {
    component = typeof component === "string"
      ? (JSX_FACTORY === "html"
        ? document.createElement(component)
        : JSX_FACTORY === "svg"
        ? document.createElementNS(
          "http://www.w3.org/2000/svg",
          component,
        )
        : document.createElementNS(
          `http://www.w3.org/${mode ? "2000/svg" : "1999/xhtml"}`,
          component,
        ))
      : new DocumentFragment();
  }

  if (JSX_STATE) {
    const states = JSX_GC ? new Set<JSX.State>() : undefined;
    for (const node of children) {
      if (isState(node)) {
        node._.add(
          component.appendChild(new Text(node[JSX_STATE_PROPERTY])),
        );
        if (JSX_GC) states.add(node);
      } else component.append(node);
    }
    for (
      const [name, prop] of entries(
        !JSX_REF_ATTRIBUTE ||
          JSX_REF_ATTRIBUTE === "undefined" || JSX_REF_ATTRIBUTE === "null"
          ? props$
          : omitRef(props$),
      )
    ) {
      if (JSX_PROPS === "property") {
        component[name] = isState(prop) ? prop[JSX_STATE_PROPERTY] : prop;
      } else {
        if (name.startsWith("on")) component[name] = prop;
        else {
          component.setAttribute(
            name,
            isState(prop) ? prop[JSX_STATE_PROPERTY] : prop,
          );
        }
      }
      if (isState(prop)) {
        prop._.add(component.attributes[name === "className" ? "class" : name]);
        if (JSX_GC) states.add(prop);
      }
    }
    if (
      !JSX_REF_ATTRIBUTE ||
      JSX_REF_ATTRIBUTE === "undefined" || JSX_REF_ATTRIBUTE === "null"
    ) {
      if (JSX_GC) {
        return defineProperties(component, {
          gc: {
            get: () =>
              () => {
                states.forEach(({ _: it }) => it.clear());
                states.clear();
                component.remove();
              },
          },
        });
      } else return component;
    } else {
      if (JSX_GC) {
        return defineProperties(
          props$[JSX_REF_ATTRIBUTE]
            ? props$[JSX_REF_ATTRIBUTE][JSX_REF_PROPERTY ?? JSX_REF_ATTRIBUTE] =
              component
            : component,
          {
            gc: {
              get: () =>
                () => {
                  states.forEach(({ _: it }) => it.clear());
                  states.clear();
                  component.remove();
                  if (props$[JSX_REF_ATTRIBUTE]) {
                    props$[JSX_REF_ATTRIBUTE][
                      JSX_REF_PROPERTY ?? JSX_REF_ATTRIBUTE
                    ] = null;
                  }
                },
            },
          },
        );
      } else {
        return props$[JSX_REF_ATTRIBUTE]
          ? props$[JSX_REF_ATTRIBUTE][JSX_REF_PROPERTY ?? JSX_REF_ATTRIBUTE] =
            component
          : component;
      }
    }
  } else {
    const { assign } = Object;
    component.append(...children);
    if (JSX_PROPS === "attribute") {
      for (const name in props$) {
        if (name.startsWith("on")) component[name] = props$[name];
        else component.setAttribute(name, props$[name]);
      }
    }
    if (
      !JSX_REF_ATTRIBUTE ||
      JSX_REF_ATTRIBUTE === "undefined" || JSX_REF_ATTRIBUTE === "null"
    ) {
      return JSX_PROPS === "property" ? assign(component, props$) : component;
    } else {
      if (JSX_GC) {
        return assign(
          props$[JSX_REF_ATTRIBUTE]
            ? props$[JSX_REF_ATTRIBUTE][JSX_REF_PROPERTY ?? JSX_REF_ATTRIBUTE] =
              component
            : component,
          {
            get gc() {
              return () => {
                component.remove();
                if (props$[JSX_REF_ATTRIBUTE]) {
                  props$[JSX_REF_ATTRIBUTE][
                    JSX_REF_PROPERTY ?? JSX_REF_ATTRIBUTE
                  ] = null;
                }
              };
            },
          },
          JSX_PROPS === "property" ? omitRef(props$) : undefined,
        );
      } else {
        return JSX_PROPS === "property"
          ? assign(
            props$[JSX_REF_ATTRIBUTE]
              ? props$[JSX_REF_ATTRIBUTE][
                JSX_REF_PROPERTY ?? JSX_REF_ATTRIBUTE
              ] = component
              : component,
            omitRef(props$),
          )
          : props$[JSX_REF_ATTRIBUTE]
          ? props$[JSX_REF_ATTRIBUTE][JSX_REF_PROPERTY ?? JSX_REF_ATTRIBUTE] =
            component
          : component;
      }
    }
  }
};

let mode: 0 | 1;
export const HTML_MODE = 0;
export const SVG_MODE = 1;
export const setMode = (mode$: typeof mode) => mode = mode$;
if (!JSX_FACTORY && JSX_MODE === "svg") mode = 1;

/** @internal create class or function component */
const createComponent: JSX.ComponentFactory = (
  component: any,
  props: any,
  ...children: any[]
) =>
  JSX_COMPONENT === "function"
    ? component(props, ...children)
    : JSX_COMPONENT === "class"
    ? new component(props, ...children)
    : (component.prototype?.constructor
      ? new component(props, ...children)
      : component(props, ...children));

/** @internal remove `.ref` property */
const omitRef = ({ [JSX_REF_ATTRIBUTE]: ref, ...props }) => props;

// const sepAttr = (props): [Record<Key, Attr>, Record<Key, any>] => [{}, {}];

const Unimplemented = (fn: Function, feat: string, cond: string = "is set") =>
  SyntaxError(`${fn.name}(...) only available if ${feat} ${cond}`);

// /** @internal since `result = new Proxy(instanceof Node)` can't be rendered */
// const proxifyNode = <T extends Node>(node: T, handler: ProxyHandler<T>): T =>
//   Object.setPrototypeOf(node, new Proxy(node, handler));

// /** @internal useful for console.log all operation */
// const handleReflect = (handle: (...$: any) => void) => {
//   const newReflect = Reflect;
//   for (const fn in Reflect) {
//     newReflect[fn] = (...args: any) => {
//       handle(...args);
//       return Reflect[fn](...args);
//     };
//   }
//   return newReflect;
// };

/** Change the target of all `Reflect` function
 * @internal to avoid infinite recursion in `proxifyNode`
 * @todo I think this helper can be shorten more 🤔 */
// const targetReflect = <T>(target: T) => {
//   const newReflect = Reflect;
//   for (const fn in Reflect) {
//     newReflect[fn] = (_: any, ...args: any) => Reflect[fn](target, ...args);
//   }
//   return newReflect;
// };

// type StateValue = Exclude<Primitive, boolean>;
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      JSX_FACTORY?: "html" | "svg";
      JSX_MODE: "html" | "svg";
      JSX_FRAGMENT?: "{}" | "none";
      JSX_COMPONENT?: "class" | "function" | "none";
      JSX_STATE_PROPERTY?: string;
      // JSX_STATE_BIND: "eager" | "lazy";
      JSX_STATE: "react" | "vue" | "S" | "setget";
      // JSX_STATE: "tuple" | "ref" | "node";
      JSX_REF_ATTRIBUTE?: string | "undefined";
      JSX_REF_PROPERTY?: string;
      JSX_PROPS: "property" | "attribute";
      JSX_GC?: true;
      // JSX_MULTI_BIND?: true;
      // JSX_REACTIVITY: "proxy" | "mutationobserver" | "accessor";
      // JSX_REACTIVITY_AUTOREMOVE_ATTR?: true; // only JSX_STATE "vanilla" has different implementation
    }
  }
  namespace JSX {
    // //@ts-expect-error
    // interface StateNode<T = unknown> extends Node, State<T> {
    //   // TODO: support both literal Object {...} and Array [...]
    //   // 1. empty Array or tuple like     `[]` -> `""`                literal empty string
    //   // 2. single tuple like            `[1]` -> `"1"`               literal string literal
    //   // 3. multi tuple like          `[1string | Function|DocumentFragment, 2]` -> `"1,2"`             literal string literal delimited with comma
    //   // 4. any Object like            `{...}` -> `"[object Object]"` literal const string
    //   // TIPS: see my experiment on javelin-ecs
    //   nodeValue: T extends StateValue ? T : string;
    // }
    // //@ts-expect-error
    // interface StateText<T = unknown> extends StateNode<T>, Text {}
    // //@ts-expect-error
    // interface StateAttr<T = unknown> extends StateNode<T>, Attr {}
    // //@ts-expect-error
    // interface StateComment<T = unknown> extends StateNode<T>, Comment {}

    interface Ref<T> {}
    interface State<T = unknown> {
      readonly _: Set<Node>;
    }

    interface Factory extends HTMLFactory, SVGFactory {}

    interface HTMLFactory extends ComponentFactory<HTMLElement> {
      <T extends keyof HTMLElementTagNameMap>(
        tag: T,
        props?: null | Props<HTMLElementTagNameMap, T>,
        ...children: (string | Node)[] // (string | Text | HTMLElement)[]
      ): HTMLElementTagNameMap[T];
    }

    interface SVGFactory extends ComponentFactory<SVGElement> {
      <T extends keyof SVGElementTagNameMap>(
        tag: T,
        props?: null | Props<SVGElementTagNameMap, T>,
        ...children: (string | Node)[] // (string | Text | SVGElement)[]
      ): SVGElementTagNameMap[T];
    }

    interface ComponentFactory<
      E extends ParentNode = ParentNode,
      A extends Never<IntrinsicAttributes> = Never<IntrinsicAttributes>,
    > {
      (
        node: typeof Fragment,
        props?: null | typeof Fragment,
        ...children: ChildNode[]
      ): DocumentFragment;

      // (arrow,function) => {Callable}
      <T extends E, P extends A, C extends E[]>(
        component: (this: undefined, props?: P, ...children: C) => T,
        props?: null | P,
        ...children: C
      ): T;
      <T extends E, P extends A, C extends E[]>(
        component: (this: undefined, props: P, ...children: C) => T,
        props: P,
        ...children: C
      ): T;

      // function Constructable() {Callable}
      <T extends E, P extends A, C extends E[]>(
        component: (this: T, props?: P, ...children: C) => void | undefined,
        props?: null | P,
        ...children: C
      ): T;
      <T extends E, P extends A, C extends E[]>(
        component: (this: T, props: P, ...children: C) => void | undefined,
        props: P,
        ...children: C
      ): T;

      // class Constructable {}
      // TODO: class component type definition doesn't seems right 🤔
      <T, P extends A, C extends E[]>(
        component: new (props?: P, ...children: C) => T,
        props?: null | P,
        ...children: C
      ): T;
      <T, P extends A, C extends E[]>(
        component: new (props: P, ...children: C) => T,
        props: P,
        ...children: C
      ): T;
    }

    type Props<
      NameMap extends HTMLElementTagNameMap | SVGElementTagNameMap,
      T extends keyof NameMap,
    > =
      | null
      | { [K in keyof NameMap[T]]?: NameMap[T][K] | JSX.State<Primitive> }
        & IntrinsicAttributes<NameMap[T]>;

    type IntrinsicProps<T> = {
      [K in keyof T]:
        & {
          [P in keyof T[K]]?: T[K][P] | JSX.State<Primitive>;
        }
        & IntrinsicAttributes<T[K]>;
    };

    // https://www.typescriptlang.org/docs/handbook/jsx.html#type-checking //
    type Element = HTMLElement & SVGElement & DocumentFragment;
    type IntrinsicElements = IntrinsicProps<
      HTMLElementTagNameMap & SVGElementTagNameMap
    >;
    interface IntrinsicAttributes<T = Element> {}
  }
}
