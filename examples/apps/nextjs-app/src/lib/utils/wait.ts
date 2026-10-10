export const wait = async (ms: number) =>
  // promisified setTimeout, kept runtime agnostic (node:timers/promises isn't available in the browser)
  // oxlint-disable-next-line promise/avoid-new
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
