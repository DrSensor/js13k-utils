// Copyright (c) Fahmi Akbar Wildana
// SPDX-License-Identifier: BSD-2-Clause-Patent

export { Fragment, jsx, state };

const JSX_FACTORY = process.env.JSX_FACTORY;
const JSX_MODE = process.env.JSX_MODE;
const JSX_FRAGMENT = process.env.JSX_FRAGMENT;
const JSX_COMPONENT = process.env.JSX_COMPONENT;
const JSX_STATE_PROPERTY = process.env.JSX_STATE_PROPERTY ?? "value";
const JSX_REF_ATTRIBUTE = process.env.JSX_REF_ATTRIBUTE;
const JSX_REF_PROPERTY = process.env.JSX_REF_PROPERTY ??
  JSX_REF_ATTRIBUTE ?? "ref";
const JSX_STATE = process.env.JSX_STATE;
const JSX_PROPS = process.env.JSX_PROPS;
const JSX_GC = process.env.JSX_GC;

import type { AnyArrow, Key, Never, NonLiteral, Primitive } from ".";
const { entries, defineProperties, seal, assign, keys } = Object;
const { from } = Array;

const Fragment: Record<Key, never> = {};
const $nodes = Symbol();

const isState = <T>(value: any): value is JSX.State<T> =>
  value && value[$nodes];

const state = <T extends Primitive>(data?: T): JSX.State<NonLiteral<T>> => {
  const nodes = new Set<Node>();

  // S.data where fn.name is inspired from https://sinuous.dev
  function observable(value?: T) {
    if (value) {
      for (const node of nodes) node.nodeValue = value as string; // Node.prototype.nodeValue has auto .toString()
      data = value;
    } else if (value === null) {
      for (const node of nodes) {
        const { parentElement } = node;
        if (node instanceof Attr) {
          parentElement.removeAttributeNode(node);
        } else parentElement.removeChild(node);
      }
    }
    return data;
  }

  const properties: PropertyDescriptorMap = {
    // Vue ref but handle computed state
    [JSX_STATE_PROPERTY]: { get: observable, set: observable },
    [$nodes]: { get: () => nodes }, // cache assigned (Attr | Text) for observable()
  };
  return defineProperties(observable, properties) as any;
};


export const proxy = <T extends Element>(trait = Element): JSX.Ref<T> => {
  let element: Element | Text = new Text();
  const safeReplace = (newElement: Element) => {
    if (newElement instanceof trait) {
      // element.replaceWith(element = newElement); // BUG: see if it cause memory leak
      element.replaceWith(newElement);
      element.remove();
      element = newElement;
    }
  };
  const { proxy, revoke } = Proxy.revocable(trait, {
    apply(target, self, [ops]) {
      switch (ops) {
        case Attr:
          return from((element as Element).attributes);
        case Element:
          return from((element as Element).children);
        case Node:
          return from<Node>((element as Element).attributes).concat(
            ...element.childNodes,
          );
        case Text:
          return from(element.childNodes).filter((node) =>
            node instanceof Text
          );
        case Comment:
          return from(element.childNodes).filter((node) =>
            node instanceof Comment
          );
        case null:
          element.remove();
          return revoke();
        default:
          safeReplace(ops);
          return element;
      }
    },
    construct(target, [newElement]) {
      if (newElement !== null) {
        safeReplace(newElement);
        return proxy;
      } else {
        revoke();
        return element;
      }
    },
    has: (target, key) => (element as Element).hasAttribute(key.toString()),
    deleteProperty(target, key) {
      const hasAttr = this.has(target, key);
      if (hasAttr) (element as Element).removeAttribute(key.toString());
      return hasAttr;
    },
    // TODO: handle layout trashing similiar to fastdom (or better/simpler/smaller)
    set(target, key, value) {
      if (key in element) {
        element[key] = value;
        return true;
      } else return false;
    },
    get: (target, key) => element[key],
    // https://stackoverflow.com/a/55124080/5221998
    ownKeys: () => keys(element),
    getOwnPropertyDescriptor: (target, key) => ({
      value: element[key],
      enumerable: true,
    }),
  });
  return proxy;
};

const jsx = (tag, props = {} as Record<Key, any>, ...children) => {
  switch (typeof tag) { // apply JSX.State
    case "string":
      const namespace = `http://www.w3.org/${
        mode == SVG_MODE ? "2000/svg" : "1999/xhtml"
      }`;
      const element = document.createElementNS(namespace, tag);
      const { [JSX_REF_ATTRIBUTE]: proxy$, ...props$ } = props;
      proxy$(element);
      // const { [JSX_REF_ATTRIBUTE]: ref, ...props$ } = props;
      // ref[JSX_REF_PROPERTY] = element;
      for (let [name, value] of entries(props$)) {
        if (name.startsWith("on")) element[name] = value;
        else {
          const attr = assign(document.createAttribute(name), { value });
          if (isState(value)) {
            value[$nodes].add(assign(attr, { nodeValue: value() }));
          }
          element.setAttributeNode(attr);
        }
      }
      for (const node of children) {
        if (isState(node)) {
          node[$nodes].add(
            element.appendChild(new Text(node() as string)), // Text has auto .toString()
          );
        } else element.append(node);
      }
      return element;
    case "function":
      if (tag.prototype instanceof Element) return new tag(props, ...children);

      const result = tag.apply(props, [props].concat(children)); // handle instantiating both function and class component
      if (result instanceof Promise) {
        let element: Text | Element = props.standby ?? new Text();
        const replace = (node: Node | undefined) => {
          if (node) element.replaceWith(node);
          element.remove();
        };
        result.then(replace).catch(() => replace(props.fallback));
        return element;
      } else if (Symbol.asyncIterator in result) {
        let element: Text | Element = props.standby ?? new Text();
        const replace = (
          { value, done }: IteratorReturnResult<Node | undefined>,
        ) => {
          if (value) element.replaceWith(value);
          if (done) element.remove();
        };
        result.next().then(replace).catch(() => replace(props.fallback));
        return assign(element, {
          async *[Symbol.asyncIterator]() {
            try {
              for await (const value of result) {
                element.replaceWith(element = value);
                yield element;
              }
            } catch (error) {
              element.replaceWith(props.fallback);
              throw error;
            } finally {
              element.remove();
              return element;
            }
          },
        });
      } else if (Symbol.iterator in result) {
        let element: Element = result.next().value;
        return assign(element, {
          *[Symbol.iterator]() {
            let next: IteratorReturnResult<Element>;
            while (next = result.next()) {
              element.replaceWith(element = next.value);
            }
            element.remove();
          },
        });
      } else return result;
    default:
      return new DocumentFragment();
  }
};

let mode: Mode;
export const HTML_MODE = 0;
export const SVG_MODE = 1;
export const jsxMode = (mode$: typeof mode) => mode = mode$;
if (!JSX_FACTORY && JSX_MODE === "svg") mode = 1;

const Unimplemented = (fn: Function, feat: string, cond: string = "is set") =>
  SyntaxError(`${fn.name}(...) only available if ${feat} ${cond}`);

// type StateValue = Exclude<Primitive, boolean>;
declare global {
  const enum Mode {
    HTML = 0,
    SVG = 1,
  }
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
      JSX_GC?: "true" | "1" | "yes" | "enable";
      // JSX_MULTI_BIND?: true;
      // JSX_REACTIVITY: "proxy" | "mutationobserver" | "accessor";
      // JSX_REACTIVITY_AUTOREMOVE_ATTR?: true; // only JSX_STATE "vanilla" has different implementation
    }
  }
  namespace JSX {
    interface Proxy<T> {
      (query?: any): T;
    }
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

    interface Ref<T> {
      <R extends Element>(
        newElement?: R | null,
      ): typeof newElement extends R ? R : T;
    }
    interface State<T = unknown> {
      (value?: T | ((val: T) => Primitive)): T;
      readonly [$nodes]: Set<Node>;
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
          [P in keyof T[K]]?: T[K][P] extends Primitive | Function
            ? T[K][P] | JSX.State<Primitive>
            : unknown;
        }
        & IntrinsicAttributes<T[K]>;
    };

    // https://www.typescriptlang.org/docs/handbook/jsx.html#type-checking //
    type Element = HTMLElement & SVGElement & DocumentFragment;
    //@ts-ignore
    type IntrinsicElements = IntrinsicProps<
      HTMLElementTagNameMap & SVGElementTagNameMap
    >;
    interface IntrinsicAttributes<T = Element> {
      class?: string;
    }
  }
}
