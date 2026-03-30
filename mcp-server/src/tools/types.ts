import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RegToolFn = (name: string, description: string, schema: Record<string, z.ZodTypeAny>, handler: (args: any) => Promise<any>) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RunToolFn = (name: string, args: Record<string, unknown>) => Promise<any>;

export interface ToolContext {
  regTool: RegToolFn;
  runTool: RunToolFn;
}
