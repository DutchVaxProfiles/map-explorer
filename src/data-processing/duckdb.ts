import * as duckdb from '@duckdb/duckdb-wasm'
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdb_wasm_next from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'

import type { RegionData } from './types'

const MANUAL_BUNDLES = {
    mvp: {
        mainModule: duckdb_wasm,
        mainWorker: mvp_worker,
    },
    eh: {
        mainModule: duckdb_wasm_next,
        mainWorker: eh_worker
    },
}

let db: duckdb.AsyncDuckDB | null = null
let conn: duckdb.AsyncDuckDBConnection | null = null
let worker: Worker | null = null


export async function initializeDuckDB(): Promise<void> {
    if (db) {
        return
    }

    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES)
    if (bundle.mainWorker === null) return

    worker = new Worker(bundle.mainWorker)
    const logger = new duckdb.ConsoleLogger()
    db = new duckdb.AsyncDuckDB(logger, worker)
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
    conn = await db.connect()
}


export async function executeQuery(query: string): Promise<Record<any, any>[]> {
    if (!conn) {
        throw new Error('Database not initialized or connection not established. Call initialize() first.')
    }
    const result = await conn.query(query)

    console.log(`[Duck DB] query: ${query}, executed`)
    const out = JSON.parse(JSON.stringify(result.toArray(), (_key, value) => {
        return typeof value === 'bigint' ? value.toString() : value;
    }))
    return out
}


export async function registerFile(registeredName: string, file: File): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized. Call initialize() first.')
  }

  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  await db.registerFileBuffer(registeredName, uint8Array)
}


export async function close(): Promise<void> {
    if (conn) {
        await conn.close()
        conn = null
    }
    if (db) {
        await db.terminate()
        db = null
    }
    if (worker) {
        worker.terminate()
        worker = null
    }
}
