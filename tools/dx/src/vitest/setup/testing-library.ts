import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
// Adds the jest-dom matchers (toBeInTheDocument...) to vitest expect
import "@testing-library/jest-dom/vitest";

// @testing-library/react registers its own afterEach(cleanup) on import only
// with `globals: true`, and without isolation it is imported once per worker:
// only the first test file would be cleaned up. Setup files run before each file.
afterEach(() => {
  cleanup();
});
