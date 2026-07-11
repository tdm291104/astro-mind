import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// JSDOM doesn't implement scrollIntoView; mock it to avoid test errors.
Element.prototype.scrollIntoView = vi.fn();
