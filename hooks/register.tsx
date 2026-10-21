import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Limit } from '../types'

const PANE = 'quota-meter'
const limitsAtom = atom({ plugin: 'quota-meter', key: 'limits' } as const, [])
const updatedAtom = atom({ plugin: 'quota-meter', key: 'updatedAt' } as const, 0)

const LABELS: Record<string, string> = {
  five_hour: 'Session (5 h)',
  seven_day: 'Weekly',
  spend_limit: 'Spend limit',
}
const label = (k: string) => LABELS[k] ?? k.replace(/_/g, ' ')
const short = (k: string) => (k === 'five_hour' ? '5h' : k === 'seven_day' ? '7d' : k)
const color = (p: number) => (p >= 90 ? '#d32f2f' : p >= 70 ? '#f57c00' : '#2e7d32')

function countdown(iso: string | undefined, now: number): string {
  if (!iso) return 'unknown'
  const ms = Date.parse(iso) - now
  if (!(ms > 0)) return 'now'
  const m = Math.floor(ms / 60000)
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  return d ? `${d}d ${h}h` : h ? `${h}h ${m % 60}m` : `${m}m`
}

function at(iso: string | undefined): string {
  if (!iso) return ''
  const t = new Date(iso)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${days[t.getDay()]} ${pad(t.getHours())}:${pad(t.getMinutes())}`
}

function bar(p: number, width = 20): string {
  const filled = Math.round((Math.min(100, Math.max(0, p)) / 100) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

async function store($: EngineInterface, limits: Limit[]): Promise<void> {
  const clean = limits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt }))
  await update($, limitsAtom, () => clean)
  const now = await $.clock.now()
  await update($, updatedAtom, () => now)
  $.ui.status(
    clean.length
      ? clean.map(l => `${short(l.kind)} ${Math.round(l.percentUsed)}% (${countdown(l.resetsAt, now)})`).join(' · ')
      : undefined,
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'quota', description: 'Show Claude plan usage: used, remaining, reset time' })
    const ran = await next(e)
    const usage = await $.session.usage()
    await store($, usage.rateLimits)
    void $.ui.open({ id: PANE, title: 'Claude quota' })
    return ran
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await store($, e.rateLimits)
    return next(e)
  })

  on('command.run', { command: 'quota' }, async $ => {
    const { rateLimits } = await $.session.usage()
    const now = await $.clock.now()
    await $.ui.open({ id: PANE, title: 'Claude quota' })
    if (!rateLimits.length) return { text: 'No usage reading yet: send one message first.' }
    return {
      text: rateLimits
        .map(l => `${label(l.kind)}: ${l.percentUsed}% used, ${Math.max(0, 100 - l.percentUsed).toFixed(0)}% remaining, resets in ${countdown(l.resetsAt, now)} (${at(l.resetsAt)})`)
        .join('\n'),
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const limits = await read($, limitsAtom)
    const updated = await read($, updatedAtom)
    const now = await $.clock.now()

    if (!limits.length) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No usage reading yet. It appears after the next reply.</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {limits.map(l => (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>{label(l.kind)}</Text>
            <Text color={color(l.percentUsed)}>{bar(l.percentUsed)}</Text>
            <Text>
              Used {Math.round(l.percentUsed)}% · Remaining {Math.max(0, 100 - Math.round(l.percentUsed))}%
            </Text>
            <Text dimColor>
              Resets in {countdown(l.resetsAt, now)} ({at(l.resetsAt)})
            </Text>
          </Box>
        ))}
        {updated > 0 && <Text dimColor size="caption">Updated {at(new Date(updated).toISOString())}</Text>}
      </Box>
    )
  })
}
