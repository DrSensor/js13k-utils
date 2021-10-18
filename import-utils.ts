import type { AnyCtor, AnyFunc } from ".";

type Functor = AnyFunc | AnyCtor;
type ImportDefer<T> =
  & (T extends Functor ? T : {})
  & { [K in keyof T]: T[K] extends Functor ? T[K] : never }
  & [
    deFault: (T extends Functor ? T : never),
    named: { [K in keyof T]: T[K] extends Functor ? T[K] : never },
  ];

/** Don’t fetch the module until you call it
 * @example
 * ```
 * // export default () => {}
 * const deFault = importDefer("./script.mjs") // browser doesn't yet send HTTP GET
 * await deFault() // browser now send HTTP GET
 *
 * // export { method, Class }
 * const { method, Class } = importDefer("./script.mjs") // no HTTP GET
 * await method()    // HTTP GET
 * await new Class() // no HTTP GET, just reusing the module
 *
 * // export default class {}
 * // export const method = () => {}
 * const [Default, { method }] = importDefer("./script.mjs")
 * ```
 * So yeah, first call first fetch!
 * PS: Promise are auto-unwrap! e.g Promise<Promise<T>> will resolve to Promise<T>
*/
export const importDefer = <T>(url: string) => {
  type Handler = ProxyHandler<Object>;

  const load = (register: (value: any) => any) =>
    import(url).finally(trap.revoke).then(register);

  const loadReflect = (handle: keyof Handler, ident: string) =>
    (...$: [any, any?]) =>
      load((module) => Reflect[handle](module[ident], ...$));

  const result = <T>(newTarget: T, name = "default") =>
    (thisArg: any, argArray: ArrayLike<any>) =>
      newTarget
        ? loadReflect("construct", name)(argArray)
        : loadReflect("apply", name)(thisArg, argArray);

  const handler: Handler = {
    get: (target, name: string & symbol) =>
      target[name] ?? ({
        [name]: function () {
          return result(new.target, name)(this, arguments);
        },
      }[name]),
  };

  const anonymous = (() =>
    function () {
      return result(new.target)(this, arguments);
    })();

  anonymous[Symbol.iterator] = function* () {
    yield anonymous;
    trap = Proxy.revocable({}, handler);
    return trap.proxy;
  };

  let trap = Proxy.revocable(anonymous, handler);

  return trap.proxy as ImportDefer<T>;
};
