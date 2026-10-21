export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'quota-meter': { limits: Limit[]; updatedAt: number }
  }
}
