export const removeUndefined = (
  obj: Record<string, unknown>
): Record<string, unknown> => {
  const definedObj: Record<string, unknown> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      definedObj[key] = obj[key];
    }
  }
  return definedObj;
};
