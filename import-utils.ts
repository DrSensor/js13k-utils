import type { AnyCtor, AnyFunc } from ".";

type Functor = AnyFunc | AnyCtor;
type PickFunctor<T> =
  & (T extends Functor ? T : {})
  & { [K in keyof T]: T[K] extends Functor ? T[K] : never };

/** fetch module only when a function/class is called/constructed */
export const importDefer = <T>(url: string): PickFunctor<T> => {
  type Handler = ProxyHandler<Function>;

  const load = (register: (value: any) => any) =>
    import(url).finally(revoke).then(register);

  const loadReflect = (handle: keyof Handler, ident = "default") =>
    (...$: [any, any?]) =>
      load((module) => Reflect[handle](module[ident], ...$));

  const { proxy, revoke } = Proxy.revocable(function () {
    return new.target
      ? loadReflect("construct")(arguments)
      : loadReflect("apply")(this, arguments);
  }, {
    get: (_, name: string) => ({
      [name]: function () {
        return new.target
          ? loadReflect("construct", name)(arguments)
          : loadReflect("apply", name)(this, arguments);
      },
    }[name]),
  });
  return proxy as any;
};
