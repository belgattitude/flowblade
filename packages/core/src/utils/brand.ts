/**
 * Major version of @flowblade/core, replaced at build time (see tsdown.config.ts)
 */
declare const __FLOWBLADE_CORE_MAJOR__: string | undefined;

/**
 * Global registry symbol shared by every copy of the same @flowblade/core
 * major version loaded in a realm (duplicated installs, bundled copies...).
 *
 * - on classes, holds the class name (ie: 'QNoResultError')
 * - on instances, holds the names of the branded class hierarchy (ie: ['QNoResultError'])
 *
 * @internal
 */
export const brandKey: unique symbol = Symbol.for(
  `@flowblade/core-v${typeof __FLOWBLADE_CORE_MAJOR__ === "string" ? __FLOWBLADE_CORE_MAJOR__ : "dev"}`
);

type Branded = { [brandKey]?: string[] };

/**
 * Unlike `instanceof Error`, also recognizes errors created in another realm
 * (ie: node:vm contexts, iframes) with that realm's Error constructor.
 */
const isError = (value: unknown): value is Error =>
  value instanceof Error ||
  Object.prototype.toString.call(value) === "[object Error]";

/**
 * Brand an instance with the names of its branded class hierarchy.
 * @internal
 */
export const addBrand = (obj: object, cls: unknown) => {
  const brands: string[] = [];
  for (let c = cls; typeof c === "function"; c = Object.getPrototypeOf(c)) {
    if (Object.hasOwn(c, brandKey)) {
      brands.unshift((c as unknown as { [brandKey]: string })[brandKey]);
    }
  }
  // not enumerable: must not leak in serialization, equality checks...
  Object.defineProperty(obj, brandKey, { value: brands });
};

/**
 * Test whether a value was created by a class with the same brand name
 * from another copy of the same @flowblade/core major version.
 * @internal
 */
export const hasBrand = (value: unknown, cls: object): boolean => {
  if (
    // the brand is a global symbol anyone can set: at least ensure the
    // minimal shape of a flowblade error (message, stack, string code)
    !isError(value) ||
    typeof (value as { code?: unknown }).code !== "string" ||
    // classes extending an error without their own brand are never matched by brand
    !Object.hasOwn(cls, brandKey)
  ) {
    return false;
  }
  const brands = (value as Branded)[brandKey];
  return (
    Array.isArray(brands) &&
    brands.includes((cls as { [brandKey]: string })[brandKey])
  );
};
