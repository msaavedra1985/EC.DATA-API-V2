#!/bin/bash
set -e

echo "[post-merge] Installing dependencies..."
npm install --prefer-offline

echo "[post-merge] Marking baseline migration as executed (if schema already exists)..."
node -e "
const { Sequelize } = require('sequelize');
const config = require('./src/config/database.cjs');
const env = process.env.NODE_ENV || 'development';
const cfg = config[env];
const seq = new Sequelize(cfg.database, cfg.username, cfg.password, {
  host: cfg.host, port: cfg.port, dialect: cfg.dialect, logging: false
});
seq.query(\`
  INSERT INTO \"SequelizeMeta\" (name)
  VALUES ('20260320100000-baseline-schema.cjs')
  ON CONFLICT (name) DO NOTHING
\`).then(() => { console.log('Baseline migration marked.'); seq.close(); })
  .catch(e => { console.warn('Could not mark baseline (SequelizeMeta may not exist yet):', e.message); seq.close(); });
"

echo "[post-merge] Running database migrations..."
npm run db:migrate

echo "[post-merge] Done."
