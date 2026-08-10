import type { Route, Request } from '@playwright/test'
import type { MockDb } from './db'

/**
 * A tiny PostgREST emulator — just enough of the wire protocol for the read
 * queries CouchMode's hooks build. It parses the table, column filters
 * (`eq`, `in`, `is`, `lt`/`lte`/`gt`/`gte`, `neq`), `or=(...)`, `order`, and
 * `limit`, and honours the single-object Accept header used by
 * `.single()` / `.maybeSingle()`.
 *
 * Writes (POST/PATCH/DELETE) are acknowledged generically — the read-only
 * logged-in tests never trigger them, but stubbing them keeps an accidental
 * mutation from escaping to the network.
 */

type Row = Record<string, unknown>

const OBJECT_ACCEPT = 'application/vnd.pgrst.object+json'

function tableFromPath(pathname: string): string {
  return pathname.replace(/^.*\/rest\/v1\//, '').split('?')[0]
}

function parseList(raw: string): string[] {
  // `(a,b,c)` or `("a","b")` → ['a','b','c']
  return raw
    .replace(/^\(/, '')
    .replace(/\)$/, '')
    .split(',')
    .map(v => v.trim().replace(/^"(.*)"$/, '$1'))
    .filter(v => v.length > 0)
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const sa = String(a)
  const sb = String(b)
  return sa < sb ? -1 : sa > sb ? 1 : 0
}

function matchesOp(value: unknown, op: string, operand: string): boolean {
  switch (op) {
    case 'eq':
      return String(value) === operand
    case 'neq':
      return String(value) !== operand
    case 'is':
      return operand === 'null' ? value === null : String(value) === operand
    case 'in':
      return parseList(operand).includes(String(value))
    case 'lt':
      return compare(value, operand) < 0
    case 'lte':
      return compare(value, operand) <= 0
    case 'gt':
      return compare(value, operand) > 0
    case 'gte':
      return compare(value, operand) >= 0
    default:
      return true // unsupported operators don't filter anything out
  }
}

/** Evaluate one `or=(...)` sub-condition, e.g. `providers_updated_at.is.null`. */
function matchesOrClause(row: Row, clause: string): boolean {
  const [col, op, ...rest] = clause.split('.')
  return matchesOp(row[col], op, rest.join('.'))
}

function applyOr(rows: Row[], orValue: string): Row[] {
  const clauses = parseList(orValue)
  return rows.filter(row => clauses.some(clause => matchesOrClause(row, clause)))
}

function applyOrder(rows: Row[], orderParams: string[]): Row[] {
  const keys = orderParams.map(p => {
    const [col, ...mods] = p.split('.')
    return { col, desc: mods.includes('desc') }
  })
  return [...rows].sort((a, b) => {
    for (const { col, desc } of keys) {
      const c = compare(a[col], b[col])
      if (c !== 0) return desc ? -c : c
    }
    return 0
  })
}

function jsonResponse(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

export function fulfillRest(route: Route, request: Request, db: MockDb) {
  const method = request.method()
  const url = new URL(request.url())
  const table = tableFromPath(url.pathname)

  // Stored procedures: `supabase.rpc('is_admin')` → POST /rest/v1/rpc/is_admin.
  if (table.startsWith('rpc/')) {
    const fn = table.slice('rpc/'.length)
    switch (fn) {
      case 'is_admin':
        return jsonResponse(route, 200, db.isAdmin ?? false)
      case 'admin_get_overview':
        return jsonResponse(route, 200, db.adminOverview ?? null)
      case 'admin_get_user_list':
        return jsonResponse(route, 200, db.adminUsers ?? [])
      case 'admin_get_popular_shows':
        return jsonResponse(route, 200, db.adminPopularShows ?? [])
      default:
        return jsonResponse(route, 200, null)
    }
  }

  // Writes: acknowledge without persisting.
  if (method !== 'GET') {
    return jsonResponse(route, 200, [])
  }

  const source = (db as unknown as Record<string, Row[]>)[table]
  if (!source) return jsonResponse(route, 404, { message: `unknown table ${table}` })

  let rows: Row[] = [...source]
  const reserved = new Set(['select', 'order', 'limit', 'offset', 'or', 'and', 'not'])

  for (const [key, value] of url.searchParams.entries()) {
    if (reserved.has(key)) continue
    // `not.<op>.<operand>` negates the operator (e.g. `completed_at=not.is.null`).
    let negate = false
    let expr = value
    if (expr.startsWith('not.')) {
      negate = true
      expr = expr.slice('not.'.length)
    }
    const [op, ...rest] = expr.split('.')
    const operand = rest.join('.')
    rows = rows.filter(row => {
      const matched = matchesOp(row[key], op, operand)
      return negate ? !matched : matched
    })
  }

  const orValue = url.searchParams.get('or')
  if (orValue) rows = applyOr(rows, orValue)

  const orderParams = url.searchParams.getAll('order')
  if (orderParams.length > 0) rows = applyOrder(rows, orderParams)

  const limit = url.searchParams.get('limit')
  if (limit) rows = rows.slice(0, Number(limit))

  // `.single()` / `.maybeSingle()` send this Accept header and expect one object.
  const wantsObject = (request.headers()['accept'] ?? '').includes(OBJECT_ACCEPT)
  if (wantsObject) {
    if (rows.length === 1) return jsonResponse(route, 200, rows[0])
    // 0 or >1 rows → PostgREST's PGRST116. `.maybeSingle()` maps this to null.
    return jsonResponse(route, 406, {
      code: 'PGRST116',
      message: `Requested a single row but found ${rows.length}`,
      details: `Results contain ${rows.length} rows`,
      hint: null,
    })
  }

  return jsonResponse(route, 200, rows)
}
