// app.ts
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
  acquireTimeout: 60_000,  // ms
  idleTimeout: 60_000,     // ms
})

/** Helper: ใช้ connection จาก pool แล้วคืนให้เสมอ */
async function withConn<T>(fn: (conn: mariadb.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection()
  try {
    return await fn(conn)
  } finally {
    conn.release()
  }
}

const app = new Elysia({ name: 'api' })
  // (ถ้าต้องการใช้ ctx.db) .decorate('db', pool)

  // Health
  .get('/', async () => {
    // optional: ping DB เพื่อเช็คสุขภาพระบบ
    await withConn((c) => c.ping())
    return { message: 'Hello World from Bun' }
  })

  // POST /users -> create
  .post(
    '/users',
    async ({ body, set }) => {
      try {
        const { username, email } = body as { username: string; email: string }
        const res: any = await withConn((conn) =>
          conn.query('INSERT INTO users (username, email) VALUES (?, ?)', [username, email])
        )
        const insertId = res?.insertId
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
        email: t.String({ format: 'email' }),
      }),
    }
  )

  // GET /users/:id -> read
  .get(
    '/users/:id',
    async ({ params, set }) => {
      try {
        const id = Number(params.id)
        const rows = await withConn((conn) =>
          conn.query('SELECT user_id, username, email FROM users WHERE user_id = ?', [id])
        )
        // mariadb จะคืน Array ของแถว (ไม่มี [rows, fields] แบบ mysql2)
        if (!rows || rows.length === 0) {
          set.status = 404
          return { error: 'User not found' }
        }
        const user = rows[0]
        // ป้องกัน BigInt (ถ้าคอลัมน์เป็น BIGINT)
        if (typeof user.user_id === 'bigint') user.user_id = Number(user.user_id)
        return user
      } catch (err: any) {
        set.status = 500
        return { error: 'Database error', detail: err?.message ?? String(err) }
      }
    },
    { params: t.Object({ id: t.Numeric() }) }
  )

  // Global error fallback
  .onError(({ code, error, set }) => {
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Not Found' }
    }
    if (code === 'VALIDATION') {
      set.status = 400
      return { error: 'Bad Request', detail: error?.message }
    }
    set.status = 500
    return { error: 'Internal Server Error', detail: error?.message }
  })

  .listen(3000)

// Graceful shutdown
const shutdown = async () => {
  try {
    await pool.end()
  } finally {
    process.exit(0)
  }
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

console.log('🦊 Elysia is running at http://localhost:3000')
