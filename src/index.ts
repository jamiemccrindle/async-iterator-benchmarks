import { transpilation } from "./transpilation";
import { vs } from "./vs";

(async () => {
  await vs();
  await transpilation();
})();
