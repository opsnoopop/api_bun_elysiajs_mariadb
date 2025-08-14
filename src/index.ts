import { Elysia, t } from 'elysia'
import mariadb from 'mariadb'

// ---- DB Pool ----
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  connectionLimit: 10,
  // Extra timeouts (mariadb lib uses "acquireTimeout" and "idleTimeout")
  acquireTimeout: 60_000,
  idleTimeout: 60_000,
})

// Helper to run a query with a pooled connection
async function withConn<T>(fn: (conn: mariadb.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection()
  try {
    return await fn(conn)
  } finally {
    conn.release()
  }
}

const app = new Elysia({ name: 'api' })
  // expose the pool on context if you like: .decorate('db', pool)

  // Root
  .get('/', () => ({ message: 'Hello World from Bun' }))

  // Create user
  .post(
    '/users',
    async ({ body, set }) => {
      try {
        const { username, email } = body
        const result: any = await withConn((conn) =>
          conn.query('INSERT INTO users (username, email) VALUES (?, ?)', [username, email])
        )
        const insertId = result?.insertId
        const user_id = typeof insertId === 'bigint' ? Number(insertId) : Number(insertId)
        set.status = 201
        return { message: 'User created successfully', user_id }
      } catch (err: any) {
        set.status = 500
        return { error: 'Database error', detail: err?.message ?? String(err) }
      }
    },
    {
      body: t.Object({
        username: t.String({ minLength: 1 }),
        email: t.String({ format: 'email' })
      })
    }
  )

  // Get user by id
  .get(
    '/users/:id',
    async ({ params, set }) => {
      try {
        const id = Number(params.id)
        const rows: any[] = await withConn((conn) =>
          conn.query('SELECT user_id, username, email FROM users WHERE user_id = ?', [id])
        )

        // mariadb lib returns an array; empty means not found
        if (!rows || rows.length === 0) {
          set.status = 404
          return { error: 'User not found' }
        }

        // If the client is configured to return RowDataPacket, rows[0] is fine as JSON
        const user = rows[0]
        set.status = 200
        return user
      } catch (err: any) {
        set.status = 500
        return { error: 'Database error', detail: err?.message ?? String(err) }
      }
    },
    {
      params: t.Object({ id: t.Numeric() })
    }
  )

  // Global error fallback (optional)
  .onError(({ code, error, set }) => {
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Not Found' }
    }
    // Allow validation errors to be 400
    if (code === 'VALIDATION') {
      set.status = 400
      return { error: 'Bad Request', detail: error?.message }
    }
    set.status = 500
    return { error: 'Internal Server Error', detail: error?.message }
  })

  .listen(3000)

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end()
  process.exit(0)
})

console.log(`🦊 Elysia is running at http://localhost:3000`)
