// Seed entry point. Three clearly separated sets:
//   reference — real reference data (regions, service types)
//   starter   — editable starter structure (events, categories, guidance)
//   demo      — FICTIONAL providers and prices (is_demo = true)
import { merge } from "./builder";
import { reference } from "./reference";
import { starter } from "./starter";
import { demo } from "./demo";

export const SEED_SETS = { reference, starter, demo };

export function buildSeedStore(): Record<string, Record<string, any>[]> {
  return JSON.parse(JSON.stringify(merge(reference, starter, demo)));
}
