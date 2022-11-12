import { partition } from "./index.ts";

const machine = (...args) => args,
  [tokens, ...idents] = machine`   


${1} --> ${2} @ ${3}
${2} <--> ${1}


   `;

console.log(
  partition(tokens, (v) => ["\n", ""].includes(v), (v) => v.trim()),
  idents,
);
