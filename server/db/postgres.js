import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

class PostgresService {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.connectionError = null;
    this.lastSync = null;
    this.initPool();
  }

  initPool() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.log('[PostgreSQL] No se detectó DATABASE_URL en el entorno.');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });

      this.pool.on('error', (err) => {
        console.error('[PostgreSQL Pool Error]', err.message);
        this.isConnected = false;
        this.connectionError = err.message;
      });
    } catch (err) {
      console.error('[PostgreSQL Init Error]', err);
      this.connectionError = err.message;
    }
  }

  async initSchema() {
    if (!this.pool) return false;

    try {
      const client = await this.pool.connect();
      try {
        console.log('[PostgreSQL] Conectado a Neon DB. Verificando y creando tablas...');

        await client.query(`
          -- Tabla de almacenamiento central de estado completo (resiliente a reinicios)
          CREATE TABLE IF NOT EXISTS app_storage (
            key VARCHAR(100) PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

          -- Tabla específica para Atajos de Apple y Gastos Puntuales
          CREATE TABLE IF NOT EXISTS gastos_puntuales (
            id VARCHAR(100) PRIMARY KEY,
            titulo VARCHAR(255) NOT NULL,
            importe NUMERIC(10,2) NOT NULL,
            categoria VARCHAR(100) DEFAULT 'Gastos Puntuales',
            fecha DATE NOT NULL DEFAULT CURRENT_DATE,
            metodo_pago VARCHAR(50) DEFAULT 'Tarjeta',
            notas TEXT,
            origen VARCHAR(50) DEFAULT 'atajos_apple',
            creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

          -- Índices para búsquedas rápidas por fecha y origen
          CREATE INDEX IF NOT EXISTS idx_gastos_puntuales_fecha ON gastos_puntuales(fecha);
          CREATE INDEX IF NOT EXISTS idx_gastos_puntuales_origen ON gastos_puntuales(origen);

          -- Tabla relacional de transacciones maestras (recurrentes e ingresos)
          CREATE TABLE IF NOT EXISTS transacciones_finanzas (
            id VARCHAR(100) PRIMARY KEY,
            titulo VARCHAR(255) NOT NULL,
            importe NUMERIC(10,2) NOT NULL,
            tipo VARCHAR(20) NOT NULL,
            categoria VARCHAR(100),
            frecuencia VARCHAR(50),
            dia_mes INT,
            mes_anio INT,
            activo BOOLEAN DEFAULT true,
            fecha_inicio VARCHAR(50),
            fecha_fin VARCHAR(50),
            es_indefinido BOOLEAN DEFAULT true,
            incremento_anual_pct NUMERIC(5,2) DEFAULT 0,
            prestamo_id VARCHAR(100),
            notas TEXT,
            extra_data JSONB,
            creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

          -- Tabla relacional de registro de pagos mensuales
          CREATE TABLE IF NOT EXISTS pagos_mensuales (
            id VARCHAR(100) PRIMARY KEY,
            mes VARCHAR(7) NOT NULL,
            transaccion_id VARCHAR(100) NOT NULL,
            pagado BOOLEAN NOT NULL DEFAULT false,
            fecha_pago VARCHAR(50),
            actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(mes, transaccion_id)
          );

          CREATE INDEX IF NOT EXISTS idx_pagos_mensuales_mes ON pagos_mensuales(mes);

          -- Tabla relacional de categorías
          CREATE TABLE IF NOT EXISTS categorias_finanzas (
            id VARCHAR(100) PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            grupo VARCHAR(100),
            color VARCHAR(50),
            icono VARCHAR(50)
          );

          -- Tabla relacional de préstamos e hipotecas
          CREATE TABLE IF NOT EXISTS prestamos (
            id VARCHAR(100) PRIMARY KEY,
            nombre VARCHAR(255) NOT NULL,
            tipo VARCHAR(50),
            capital_inicial NUMERIC(12,2),
            capital_pendiente NUMERIC(12,2),
            plazo_meses INT,
            plazo_restante_meses INT,
            tipo_interes NUMERIC(5,2),
            cuota_mensual NUMERIC(10,2),
            fecha_inicio VARCHAR(50),
            entidad VARCHAR(100),
            notas TEXT,
            es_familiar BOOLEAN DEFAULT false,
            total_amortizado NUMERIC(12,2) DEFAULT 0,
            historial_pagos JSONB DEFAULT '[]'::jsonb,
            estado VARCHAR(50) DEFAULT 'activo',
            creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

          -- Migraciones de compatibilidad de columnas en Neon
          ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS es_familiar BOOLEAN DEFAULT false;
          ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS total_amortizado NUMERIC(12,2) DEFAULT 0;
          ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS historial_pagos JSONB DEFAULT '[]'::jsonb;
          ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'activo';
          ALTER TABLE transacciones_finanzas ADD COLUMN IF NOT EXISTS tramos JSONB DEFAULT '[]'::jsonb;
          ALTER TABLE transacciones_finanzas ADD COLUMN IF NOT EXISTS pagas_extras JSONB DEFAULT '[]'::jsonb;

          -- Tabla relacional de metas de ahorro
          CREATE TABLE IF NOT EXISTS metas_ahorro (
            id VARCHAR(100) PRIMARY KEY,
            nombre VARCHAR(255) NOT NULL,
            objetivo NUMERIC(10,2),
            actual NUMERIC(10,2),
            fecha_limite VARCHAR(50),
            icono VARCHAR(50),
            color VARCHAR(50),
            categoria VARCHAR(100),
            creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

          -- Tabla de excepciones por mes
          CREATE TABLE IF NOT EXISTS excepciones_mes (
            id VARCHAR(100) PRIMARY KEY,
            transaccion_id VARCHAR(100) NOT NULL,
            mes VARCHAR(7) NOT NULL,
            importe NUMERIC(10,2),
            titulo VARCHAR(255),
            categoria VARCHAR(100),
            notas TEXT,
            dia_mes INT,
            excluido BOOLEAN DEFAULT false,
            creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);

        this.isConnected = true;
        this.connectionError = null;
        console.log('[PostgreSQL] Tablas de Neon verificadas y listas para usar.');
        return true;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[PostgreSQL Schema Init Error]', err);
      this.isConnected = false;
      this.connectionError = err.message;
      return false;
    }
  }

  // --- APP STORAGE (FULL SYNC) ---
  async loadFullState() {
    if (!this.pool || !this.isConnected) return null;
    try {
      const res = await this.pool.query(
        "SELECT data, updated_at FROM app_storage WHERE key = 'domotica_full_data' LIMIT 1"
      );
      if (res.rows.length > 0) {
        this.lastSync = res.rows[0].updated_at;
        return res.rows[0].data;
      }
      return null;
    } catch (err) {
      console.error('[PostgreSQL loadFullState Error]', err);
      return null;
    }
  }

  async saveFullState(data) {
    if (!this.pool || !this.isConnected) return false;
    try {
      await this.pool.query(
        `INSERT INTO app_storage (key, data, updated_at) 
         VALUES ('domotica_full_data', $1, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE 
         SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
        [JSON.stringify(data)]
      );
      this.lastSync = new Date();
      return true;
    } catch (err) {
      console.error('[PostgreSQL saveFullState Error]', err);
      return false;
    }
  }

  // --- GASTOS PUNTUALES (ATAJOS DE APPLE & AUTOMATISMOS) ---
  async insertPunctualExpense({ id, titulo, importe, categoria, fecha, metodo_pago, notas, origen }) {
    if (!this.pool || !this.isConnected) return null;
    try {
      const res = await this.pool.query(
        `INSERT INTO gastos_puntuales (id, titulo, importe, categoria, fecha, metodo_pago, notas, origen, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           titulo = EXCLUDED.titulo,
           importe = EXCLUDED.importe,
           categoria = EXCLUDED.categoria,
           fecha = EXCLUDED.fecha,
           metodo_pago = EXCLUDED.metodo_pago,
           notas = EXCLUDED.notas,
           origen = EXCLUDED.origen
         RETURNING *`,
        [
          id,
          titulo,
          parseFloat(importe) || 0,
          categoria || 'Gastos Puntuales',
          fecha || new Date().toISOString().slice(0, 10),
          metodo_pago || 'Tarjeta',
          notas || '',
          origen || 'atajos_apple'
        ]
      );
      return res.rows[0];
    } catch (err) {
      console.error('[PostgreSQL insertPunctualExpense Error]', err);
      throw err;
    }
  }

  async getPunctualExpenses(limit = 100) {
    if (!this.pool || !this.isConnected) return [];
    try {
      const res = await this.pool.query(
        `SELECT id, titulo, importe, categoria, fecha::text, metodo_pago, notas, origen, creado_en 
         FROM gastos_puntuales 
         ORDER BY fecha DESC, creado_en DESC 
         LIMIT $1`,
        [limit]
      );
      return res.rows;
    } catch (err) {
      console.error('[PostgreSQL getPunctualExpenses Error]', err);
      return [];
    }
  }

  async deletePunctualExpense(id) {
    if (!this.pool || !this.isConnected) return false;
    try {
      await this.pool.query('DELETE FROM gastos_puntuales WHERE id = $1', [id]);
      return true;
    } catch (err) {
      console.error('[PostgreSQL deletePunctualExpense Error]', err);
      return false;
    }
  }

  // --- RELATIONAL FINANCE SYNC ---
  async syncRelationalData(finance) {
    if (!this.pool || !this.isConnected || !finance) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Categorías
      if (Array.isArray(finance.categories)) {
        for (const cat of finance.categories) {
          await client.query(
            `INSERT INTO categorias_finanzas (id, nombre, grupo, color, icono)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
               nombre = EXCLUDED.nombre,
               grupo = EXCLUDED.grupo,
               color = EXCLUDED.color,
               icono = EXCLUDED.icono`,
            [cat.id, cat.name, cat.group || null, cat.color || null, cat.icon || null]
          );
        }
      }

      // 2. Transacciones maestras (con tramos históricos y futuros)
      if (Array.isArray(finance.transactions)) {
        for (const tx of finance.transactions) {
          await client.query(
            `INSERT INTO transacciones_finanzas (
               id, titulo, importe, tipo, categoria, frecuencia, dia_mes, mes_anio, 
               activo, fecha_inicio, fecha_fin, es_indefinido, incremento_anual_pct, 
               prestamo_id, notas, extra_data, tramos
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             ON CONFLICT (id) DO UPDATE SET
               titulo = EXCLUDED.titulo,
               importe = EXCLUDED.importe,
               tipo = EXCLUDED.tipo,
               categoria = EXCLUDED.categoria,
               frecuencia = EXCLUDED.frecuencia,
               dia_mes = EXCLUDED.dia_mes,
               mes_anio = EXCLUDED.mes_anio,
               activo = EXCLUDED.activo,
               fecha_inicio = EXCLUDED.fecha_inicio,
               fecha_fin = EXCLUDED.fecha_fin,
               es_indefinido = EXCLUDED.es_indefinido,
               incremento_anual_pct = EXCLUDED.incremento_anual_pct,
               prestamo_id = EXCLUDED.prestamo_id,
               notas = EXCLUDED.notas,
               extra_data = EXCLUDED.extra_data,
               tramos = EXCLUDED.tramos`,
            [
              tx.id,
              tx.title,
              parseFloat(tx.amount) || 0,
              tx.type || 'gasto',
              tx.category || 'General',
              tx.frequency || 'mensual',
              tx.dayOfMonth || null,
              tx.monthOfYear || null,
              tx.active !== false,
              tx.startDate || null,
              tx.endDate || null,
              tx.isIndefinite !== false,
              parseFloat(tx.yearlyIncreasePct) || 0,
              tx.loanId || null,
              tx.notes || '',
              JSON.stringify({ activeMonths: tx.activeMonths, rateSteps: tx.rateSteps, extraPays: tx.extraPays }),
              JSON.stringify(Array.isArray(tx.rateSteps) ? tx.rateSteps : [])
            ]
          );
        }
      }

      // 3. Pagos mensuales
      if (finance.payments && typeof finance.payments === 'object') {
        for (const [month, paymentsForMonth] of Object.entries(finance.payments)) {
          if (paymentsForMonth && typeof paymentsForMonth === 'object') {
            for (const [txId, pInfo] of Object.entries(paymentsForMonth)) {
              const paymentId = `pay-${month}-${txId}`;
              await client.query(
                `INSERT INTO pagos_mensuales (id, mes, transaccion_id, pagado, fecha_pago, actualizado_en)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                 ON CONFLICT (mes, transaccion_id) DO UPDATE SET
                   pagado = EXCLUDED.pagado,
                   fecha_pago = EXCLUDED.fecha_pago,
                   actualizado_en = CURRENT_TIMESTAMP`,
                [paymentId, month, txId, Boolean(pInfo.paid), pInfo.date || null]
              );
            }
          }
        }
      }

      // 4. Préstamos (Bancarios, Familiares y Futuros)
      if (Array.isArray(finance.loans)) {
        for (const l of finance.loans) {
          const isFamily = Boolean(l.isFamilyLoan || l.type === 'familiar');
          const totalAmortized = parseFloat(l.totalAmortized || (l.repayments ? l.repayments.reduce((s, r) => s + (Number(r.amount) || 0), 0) : 0));
          const currentBal = l.currentBalance !== undefined 
            ? parseFloat(l.currentBalance) 
            : Math.max(0, (parseFloat(l.initialAmount) || 0) - totalAmortized);

          await client.query(
            `INSERT INTO prestamos (
               id, nombre, tipo, capital_inicial, capital_pendiente, plazo_meses,
               plazo_restante_meses, tipo_interes, cuota_mensual, fecha_inicio, entidad, notas,
               es_familiar, total_amortizado, historial_pagos, estado
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             ON CONFLICT (id) DO UPDATE SET
               nombre = EXCLUDED.nombre,
               tipo = EXCLUDED.tipo,
               capital_inicial = EXCLUDED.capital_inicial,
               capital_pendiente = EXCLUDED.capital_pendiente,
               plazo_meses = EXCLUDED.plazo_meses,
               plazo_restante_meses = EXCLUDED.plazo_restante_meses,
               tipo_interes = EXCLUDED.tipo_interes,
               cuota_mensual = EXCLUDED.cuota_mensual,
               fecha_inicio = EXCLUDED.fecha_inicio,
               entidad = EXCLUDED.entidad,
               notas = EXCLUDED.notas,
               es_familiar = EXCLUDED.es_familiar,
               total_amortizado = EXCLUDED.total_amortizado,
               historial_pagos = EXCLUDED.historial_pagos,
               estado = EXCLUDED.estado`,
            [
              l.id,
              l.name || l.title || 'Préstamo',
              l.type || (isFamily ? 'familiar' : 'prestamo'),
              parseFloat(l.initialAmount) || 0,
              currentBal,
              parseInt(l.termYears ? l.termYears * 12 : l.termMonths, 10) || 0,
              parseInt(l.remainingMonths !== undefined ? l.remainingMonths : (l.termYears ? l.termYears * 12 : 0), 10) || 0,
              parseFloat(l.interestRate) || 0,
              parseFloat(l.monthlyPayment) || 0,
              l.startDate || null,
              l.bank || l.entity || (isFamily ? 'Familia' : ''),
              l.notes || '',
              isFamily,
              totalAmortized,
              JSON.stringify(Array.isArray(l.repayments) ? l.repayments : []),
              l.status || 'activo'
            ]
          );
        }
      }

      // 5. Metas de ahorro
      if (Array.isArray(finance.goals)) {
        for (const g of finance.goals) {
          await client.query(
            `INSERT INTO metas_ahorro (id, nombre, objetivo, actual, fecha_limite, icono, color, categoria)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
               nombre = EXCLUDED.nombre,
               objetivo = EXCLUDED.objetivo,
               actual = EXCLUDED.actual,
               fecha_limite = EXCLUDED.fecha_limite,
               icono = EXCLUDED.icono,
               color = EXCLUDED.color,
               categoria = EXCLUDED.categoria`,
            [
              g.id,
              g.title || g.name || 'Meta de Ahorro',
              parseFloat(g.targetAmount !== undefined ? g.targetAmount : g.target) || 0,
              parseFloat(g.currentAmount !== undefined ? g.currentAmount : g.current) || 0,
              g.deadline || null,
              g.icon || null,
              g.color || null,
              g.category || null
            ]
          );
        }
      }

      // 6. Excepciones de mes
      if (Array.isArray(finance.overrides)) {
        for (const o of finance.overrides) {
          await client.query(
            `INSERT INTO excepciones_mes (id, transaccion_id, mes, importe, titulo, categoria, notas, dia_mes, excluido)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET
               importe = EXCLUDED.importe,
               titulo = EXCLUDED.titulo,
               categoria = EXCLUDED.categoria,
               notas = EXCLUDED.notas,
               dia_mes = EXCLUDED.dia_mes,
               excluido = EXCLUDED.excluido`,
            [
              o.id,
              o.transactionId,
              o.month,
              o.amount !== undefined ? parseFloat(o.amount) : null,
              o.title || null,
              o.category || null,
              o.notes || null,
              o.dayOfMonth || null,
              Boolean(o.excluded)
            ]
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL syncRelationalData Error]', err);
    } finally {
      client.release();
    }
  }

  // --- HEALTH & STATUS ---
  async getStatus() {
    if (!this.pool) {
      return {
        configured: false,
        connected: false,
        type: 'Neon PostgreSQL (No configurado)',
        error: 'DATABASE_URL no definida'
      };
    }

    try {
      const start = Date.now();
      const res = await this.pool.query(`
        SELECT 
          NOW() as server_time,
          current_database() as db_name,
          current_user as db_user,
          (SELECT COUNT(*) FROM gastos_puntuales) as count_gastos_puntuales,
          (SELECT COUNT(*) FROM transacciones_finanzas) as count_transacciones,
          (SELECT COUNT(*) FROM pagos_mensuales) as count_pagos,
          (SELECT COUNT(*) FROM prestamos) as count_prestamos,
          (SELECT COUNT(*) FROM metas_ahorro) as count_metas
      `);
      const latencyMs = Date.now() - start;
      const row = res.rows[0];

      return {
        configured: true,
        connected: true,
        provider: 'Neon Serverless PostgreSQL (AWS Frankfurt)',
        database: row.db_name,
        user: row.db_user,
        serverTime: row.server_time,
        latencyMs,
        lastSync: this.lastSync,
        counts: {
          gastosPuntuales: parseInt(row.count_gastos_puntuales, 10),
          transacciones: parseInt(row.count_transacciones, 10),
          pagos: parseInt(row.count_pagos, 10),
          prestamos: parseInt(row.count_prestamos, 10),
          metas: parseInt(row.count_metas, 10)
        }
      };
    } catch (err) {
      return {
        configured: true,
        connected: false,
        provider: 'Neon Serverless PostgreSQL',
        error: err.message
      };
    }
  }
}

export const pgService = new PostgresService();
