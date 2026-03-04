-- ============================================================
-- EC.DATA API — Core Seed SQL
-- Generado desde los seeders JS. Idempotente (ON CONFLICT DO NOTHING).
-- ============================================================
--
-- USO:
--   psql $DATABASE_URL -f core-seed.sql
--
-- Para una ejecución automática desde Node.js usar:
--   npm run db:seed:core (requiere SEED_ADMIN_PASSWORD en .env)
--
-- NOTA USUARIO ADMIN:
--   El campo password_hash requiere un hash bcrypt (cost=10).
--   Generarlo con: node -e "require('bcrypt').hash('TuPass123!',10).then(console.log)"
--   Reemplazar <BCRYPT_HASH_AQUI> antes de ejecutar este bloque.
-- ============================================================

-- ============================================================
-- 1. Device Types (6 tipos)
-- ============================================================
INSERT INTO device_types (code, icon, display_order, is_active, created_at, updated_at)
  VALUES ('meter', 'meter', 1, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_type_translations (device_type_id, lang, name, description)
  SELECT id, 'es', 'Medidor', 'Medidor eléctrico o de variable' FROM device_types WHERE code = 'meter'
  ON CONFLICT (device_type_id, lang) DO NOTHING;
INSERT INTO device_type_translations (device_type_id, lang, name, description)
  SELECT id, 'en', 'Meter', 'Electrical or variable meter' FROM device_types WHERE code = 'meter'
  ON CONFLICT (device_type_id, lang) DO NOTHING;

INSERT INTO device_types (code, icon, display_order, is_active, created_at, updated_at)
  VALUES ('gateway', 'gateway', 2, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_type_translations (device_type_id, lang, name, description)
  SELECT id, 'es', 'Gateway', 'Dispositivo de comunicación y enrutamiento' FROM device_types WHERE code = 'gateway'
  ON CONFLICT (device_type_id, lang) DO NOTHING;
INSERT INTO device_type_translations (device_type_id, lang, name, description)
  SELECT id, 'en', 'Gateway', 'Communication and routing device' FROM device_types WHERE code = 'gateway'
  ON CONFLICT (device_type_id, lang) DO NOTHING;

INSERT INTO device_types (code, icon, display_order, is_active, created_at, updated_at)
  VALUES ('controller', 'controller', 3, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_type_translations (device_type_id, lang, name, description)
  SELECT id, 'es', 'Controlador', 'Dispositivo de control y automatización' FROM device_types WHERE code = 'controller'
  ON CONFLICT (device_type_id, lang) DO NOTHING;
INSERT INTO device_type_translations (device_type_id, lang, name, description)
  SELECT id, 'en', 'Controller', 'Control and automation device' FROM device_types WHERE code = 'controller'
  ON CONFLICT (device_type_id, lang) DO NOTHING;

INSERT INTO device_types (code, icon, display_order, is_active, created_at, updated_at)
  VALUES ('sensor', 'sensor', 4, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_type_translations (device_type_id, lang, name, description)
  SELECT id, 'es', 'Sensor', 'Sensor de variables físicas' FROM device_types WHERE code = 'sensor'
  ON CONFLICT (device_type_id, lang) DO NOTHING;
INSERT INTO device_type_translations (device_type_id, lang, name, description)
  SELECT id, 'en', 'Sensor', 'Physical variable sensor' FROM device_types WHERE code = 'sensor'
  ON CONFLICT (device_type_id, lang) DO NOTHING;

INSERT INTO device_types (code, icon, display_order, is_active, created_at, updated_at)
  VALUES ('iot_device', 'iot', 5, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_type_translations (device_type_id, lang, name, description)
  SELECT id, 'es', 'Dispositivo IoT', 'Dispositivo IoT genérico' FROM device_types WHERE code = 'iot_device'
  ON CONFLICT (device_type_id, lang) DO NOTHING;
INSERT INTO device_type_translations (device_type_id, lang, name, description)
  SELECT id, 'en', 'IoT Device', 'Generic IoT device' FROM device_types WHERE code = 'iot_device'
  ON CONFLICT (device_type_id, lang) DO NOTHING;

INSERT INTO device_types (code, icon, display_order, is_active, created_at, updated_at)
  VALUES ('edge_device', 'edge', 6, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_type_translations (device_type_id, lang, name, description)
  SELECT id, 'es', 'Edge Device', 'Dispositivo de computación en el borde' FROM device_types WHERE code = 'edge_device'
  ON CONFLICT (device_type_id, lang) DO NOTHING;
INSERT INTO device_type_translations (device_type_id, lang, name, description)
  SELECT id, 'en', 'Edge Device', 'Edge computing device' FROM device_types WHERE code = 'edge_device'
  ON CONFLICT (device_type_id, lang) DO NOTHING;

-- ============================================================
-- 2. Device Brands (8 marcas)
-- ============================================================
INSERT INTO device_brands (code, display_order, is_active, created_at, updated_at)
  VALUES ('schneider', 1, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'es', 'Schneider Electric', 'Líder global en gestión de energía y automatización' FROM device_brands WHERE code = 'schneider'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'en', 'Schneider Electric', 'Global leader in energy management and automation' FROM device_brands WHERE code = 'schneider'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;

INSERT INTO device_brands (code, display_order, is_active, created_at, updated_at)
  VALUES ('abb', 2, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'es', 'ABB', 'Grupo multinacional sueco-suizo de tecnología' FROM device_brands WHERE code = 'abb'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'en', 'ABB', 'Swedish-Swiss multinational technology group' FROM device_brands WHERE code = 'abb'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;

INSERT INTO device_brands (code, display_order, is_active, created_at, updated_at)
  VALUES ('siemens', 3, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'es', 'Siemens', 'Conglomerado multinacional alemán' FROM device_brands WHERE code = 'siemens'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'en', 'Siemens', 'German multinational conglomerate' FROM device_brands WHERE code = 'siemens'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;

INSERT INTO device_brands (code, display_order, is_active, created_at, updated_at)
  VALUES ('socomec', 4, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'es', 'Socomec', 'Especialista en energía crítica' FROM device_brands WHERE code = 'socomec'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'en', 'Socomec', 'Critical power specialist' FROM device_brands WHERE code = 'socomec'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;

INSERT INTO device_brands (code, display_order, is_active, created_at, updated_at)
  VALUES ('janitza', 5, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'es', 'Janitza', 'Experto en monitoreo de calidad de energía' FROM device_brands WHERE code = 'janitza'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'en', 'Janitza', 'Power quality monitoring expert' FROM device_brands WHERE code = 'janitza'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;

INSERT INTO device_brands (code, display_order, is_active, created_at, updated_at)
  VALUES ('carlo_gavazzi', 6, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'es', 'Carlo Gavazzi', 'Especialista en automatización y medición de energía' FROM device_brands WHERE code = 'carlo_gavazzi'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'en', 'Carlo Gavazzi', 'Automation and energy measurement specialist' FROM device_brands WHERE code = 'carlo_gavazzi'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;

INSERT INTO device_brands (code, display_order, is_active, created_at, updated_at)
  VALUES ('circutor', 7, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'es', 'Circutor', 'Empresa española de eficiencia energética' FROM device_brands WHERE code = 'circutor'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'en', 'Circutor', 'Spanish energy efficiency company' FROM device_brands WHERE code = 'circutor'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;

INSERT INTO device_brands (code, display_order, is_active, created_at, updated_at)
  VALUES ('generic', 8, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'es', 'Genérico', 'Fabricante genérico o no especificado' FROM device_brands WHERE code = 'generic'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;
INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
  SELECT id, 'en', 'Generic', 'Generic or unspecified manufacturer' FROM device_brands WHERE code = 'generic'
  ON CONFLICT (device_brand_id, lang) DO NOTHING;

-- ============================================================
-- 3. Device Models (22 modelos, FK a brands por subquery)
-- ============================================================
-- Marca: schneider
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'PM5100', 1, true, NOW(), NOW() FROM device_brands WHERE code = 'schneider'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'PowerLogic PM5100', 'Medidor de energía básico con comunicación Modbus'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'schneider' AND dm.code = 'PM5100'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'PowerLogic PM5100', 'Basic energy meter with Modbus communication'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'schneider' AND dm.code = 'PM5100'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'PM5300', 2, true, NOW(), NOW() FROM device_brands WHERE code = 'schneider'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'PowerLogic PM5300', 'Medidor de energía avanzado con registro de datos'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'schneider' AND dm.code = 'PM5300'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'PowerLogic PM5300', 'Advanced energy meter with data logging'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'schneider' AND dm.code = 'PM5300'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'EGX150', 3, true, NOW(), NOW() FROM device_brands WHERE code = 'schneider'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'EGX150 Gateway', 'Gateway de comunicaciones para medidores Schneider'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'schneider' AND dm.code = 'EGX150'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'EGX150 Gateway', 'Communications gateway for Schneider meters'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'schneider' AND dm.code = 'EGX150'
  ON CONFLICT (device_model_id, lang) DO NOTHING;

-- Marca: abb
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'B23_312', 1, true, NOW(), NOW() FROM device_brands WHERE code = 'abb'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'B23 312-100', 'Medidor de energía trifásico'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'abb' AND dm.code = 'B23_312'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'B23 312-100', 'Three-phase energy meter'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'abb' AND dm.code = 'B23_312'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'B24_312', 2, true, NOW(), NOW() FROM device_brands WHERE code = 'abb'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'B24 312-100', 'Medidor de energía trifásico con display'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'abb' AND dm.code = 'B24_312'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'B24 312-100', 'Three-phase energy meter with display'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'abb' AND dm.code = 'B24_312'
  ON CONFLICT (device_model_id, lang) DO NOTHING;

-- Marca: siemens
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'PAC3100', 1, true, NOW(), NOW() FROM device_brands WHERE code = 'siemens'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'SENTRON PAC3100', 'Analizador de redes básico'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'siemens' AND dm.code = 'PAC3100'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'SENTRON PAC3100', 'Basic network analyzer'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'siemens' AND dm.code = 'PAC3100'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'PAC4200', 2, true, NOW(), NOW() FROM device_brands WHERE code = 'siemens'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'SENTRON PAC4200', 'Analizador de redes avanzado con comunicación integrada'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'siemens' AND dm.code = 'PAC4200'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'SENTRON PAC4200', 'Advanced network analyzer with integrated communication'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'siemens' AND dm.code = 'PAC4200'
  ON CONFLICT (device_model_id, lang) DO NOTHING;

-- Marca: socomec
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'DIRIS_A40', 1, true, NOW(), NOW() FROM device_brands WHERE code = 'socomec'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'DIRIS A-40', 'Analizador de redes monofásico/trifásico'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'socomec' AND dm.code = 'DIRIS_A40'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'DIRIS A-40', 'Single/three-phase network analyzer'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'socomec' AND dm.code = 'DIRIS_A40'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'DIRIS_A60', 2, true, NOW(), NOW() FROM device_brands WHERE code = 'socomec'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'DIRIS A-60', 'Analizador de redes avanzado con Ethernet'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'socomec' AND dm.code = 'DIRIS_A60'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'DIRIS A-60', 'Advanced network analyzer with Ethernet'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'socomec' AND dm.code = 'DIRIS_A60'
  ON CONFLICT (device_model_id, lang) DO NOTHING;

-- Marca: janitza
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'UMG_511', 1, true, NOW(), NOW() FROM device_brands WHERE code = 'janitza'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'UMG 511', 'Medidor de calidad de energía con analizador de armónicos'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'janitza' AND dm.code = 'UMG_511'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'UMG 511', 'Power quality meter with harmonics analyzer'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'janitza' AND dm.code = 'UMG_511'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'UMG_605', 2, true, NOW(), NOW() FROM device_brands WHERE code = 'janitza'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'UMG 605', 'Medidor de energía industrial con Ethernet integrado'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'janitza' AND dm.code = 'UMG_605'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'UMG 605', 'Industrial energy meter with integrated Ethernet'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'janitza' AND dm.code = 'UMG_605'
  ON CONFLICT (device_model_id, lang) DO NOTHING;

-- Marca: carlo_gavazzi
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'EM24', 1, true, NOW(), NOW() FROM device_brands WHERE code = 'carlo_gavazzi'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'EM24', 'Medidor de energía trifásico Modbus'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'carlo_gavazzi' AND dm.code = 'EM24'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'EM24', 'Three-phase Modbus energy meter'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'carlo_gavazzi' AND dm.code = 'EM24'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'VMU_C', 2, true, NOW(), NOW() FROM device_brands WHERE code = 'carlo_gavazzi'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'VMU-C', 'Concentrador de datos para medidores Carlo Gavazzi'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'carlo_gavazzi' AND dm.code = 'VMU_C'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'VMU-C', 'Data concentrator for Carlo Gavazzi meters'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'carlo_gavazzi' AND dm.code = 'VMU_C'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'WM30', 3, true, NOW(), NOW() FROM device_brands WHERE code = 'carlo_gavazzi'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'WM30', 'Medidor de energía trifásico Modbus'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'carlo_gavazzi' AND dm.code = 'WM30'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'WM30', 'Three-phase Modbus energy meter'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'carlo_gavazzi' AND dm.code = 'WM30'
  ON CONFLICT (device_model_id, lang) DO NOTHING;

-- Marca: circutor
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'CEM_C10', 1, true, NOW(), NOW() FROM device_brands WHERE code = 'circutor'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'CEM-C10', 'Analizador de redes con comunicación Modbus'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'circutor' AND dm.code = 'CEM_C10'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'CEM-C10', 'Network analyzer with Modbus communication'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'circutor' AND dm.code = 'CEM_C10'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'MK_30', 2, true, NOW(), NOW() FROM device_brands WHERE code = 'circutor'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'MK-30', 'Medidor multifunción con comunicación'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'circutor' AND dm.code = 'MK_30'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'MK-30', 'Multifunction meter with communication'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'circutor' AND dm.code = 'MK_30'
  ON CONFLICT (device_model_id, lang) DO NOTHING;

-- Marca: generic
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'GENERIC_MODBUS', 1, true, NOW(), NOW() FROM device_brands WHERE code = 'generic'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'Genérico Modbus', 'Dispositivo genérico con protocolo Modbus RTU/TCP'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'generic' AND dm.code = 'GENERIC_MODBUS'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'Generic Modbus', 'Generic device with Modbus RTU/TCP protocol'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'generic' AND dm.code = 'GENERIC_MODBUS'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_models (brand_id, code, display_order, is_active, created_at, updated_at)
  SELECT id, 'GENERIC_MQTT', 2, true, NOW(), NOW() FROM device_brands WHERE code = 'generic'
  ON CONFLICT (brand_id, code) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'es', 'Genérico MQTT', 'Dispositivo genérico con protocolo MQTT'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'generic' AND dm.code = 'GENERIC_MQTT'
  ON CONFLICT (device_model_id, lang) DO NOTHING;
INSERT INTO device_model_translations (device_model_id, lang, name, description)
  SELECT dm.id, 'en', 'Generic MQTT', 'Generic device with MQTT protocol'
  FROM device_models dm JOIN device_brands b ON dm.brand_id = b.id
  WHERE b.code = 'generic' AND dm.code = 'GENERIC_MQTT'
  ON CONFLICT (device_model_id, lang) DO NOTHING;

-- ============================================================
-- 4. Device Networks (6 redes)
-- ============================================================
INSERT INTO device_networks (code, icon, display_order, is_active, created_at, updated_at)
  VALUES ('4g_lte', '4g', 1, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_network_translations (device_network_id, lang, name, description)
  SELECT id, 'es', '4G/LTE', 'Red celular 4G LTE para IoT' FROM device_networks WHERE code = '4g_lte'
  ON CONFLICT (device_network_id, lang) DO NOTHING;
INSERT INTO device_network_translations (device_network_id, lang, name, description)
  SELECT id, 'en', '4G/LTE', '4G LTE cellular network for IoT' FROM device_networks WHERE code = '4g_lte'
  ON CONFLICT (device_network_id, lang) DO NOTHING;

INSERT INTO device_networks (code, icon, display_order, is_active, created_at, updated_at)
  VALUES ('wifi', 'wifi', 2, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_network_translations (device_network_id, lang, name, description)
  SELECT id, 'es', 'WiFi', 'Red inalámbrica WiFi 802.11' FROM device_networks WHERE code = 'wifi'
  ON CONFLICT (device_network_id, lang) DO NOTHING;
INSERT INTO device_network_translations (device_network_id, lang, name, description)
  SELECT id, 'en', 'WiFi', 'Wireless network WiFi 802.11' FROM device_networks WHERE code = 'wifi'
  ON CONFLICT (device_network_id, lang) DO NOTHING;

INSERT INTO device_networks (code, icon, display_order, is_active, created_at, updated_at)
  VALUES ('ethernet', 'ethernet', 3, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_network_translations (device_network_id, lang, name, description)
  SELECT id, 'es', 'Ethernet LAN', 'Red local cableada Ethernet' FROM device_networks WHERE code = 'ethernet'
  ON CONFLICT (device_network_id, lang) DO NOTHING;
INSERT INTO device_network_translations (device_network_id, lang, name, description)
  SELECT id, 'en', 'Ethernet LAN', 'Wired local area network Ethernet' FROM device_networks WHERE code = 'ethernet'
  ON CONFLICT (device_network_id, lang) DO NOTHING;

INSERT INTO device_networks (code, icon, display_order, is_active, created_at, updated_at)
  VALUES ('lorawan', 'lora', 4, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_network_translations (device_network_id, lang, name, description)
  SELECT id, 'es', 'LoRaWAN', 'Red de largo alcance y bajo consumo' FROM device_networks WHERE code = 'lorawan'
  ON CONFLICT (device_network_id, lang) DO NOTHING;
INSERT INTO device_network_translations (device_network_id, lang, name, description)
  SELECT id, 'en', 'LoRaWAN', 'Long range low power network' FROM device_networks WHERE code = 'lorawan'
  ON CONFLICT (device_network_id, lang) DO NOTHING;

INSERT INTO device_networks (code, icon, display_order, is_active, created_at, updated_at)
  VALUES ('rs485', 'serial', 5, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_network_translations (device_network_id, lang, name, description)
  SELECT id, 'es', 'RS-485', 'Bus serial RS-485 industrial' FROM device_networks WHERE code = 'rs485'
  ON CONFLICT (device_network_id, lang) DO NOTHING;
INSERT INTO device_network_translations (device_network_id, lang, name, description)
  SELECT id, 'en', 'RS-485', 'Industrial RS-485 serial bus' FROM device_networks WHERE code = 'rs485'
  ON CONFLICT (device_network_id, lang) DO NOTHING;

INSERT INTO device_networks (code, icon, display_order, is_active, created_at, updated_at)
  VALUES ('modbus_tcp', 'modbus', 6, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_network_translations (device_network_id, lang, name, description)
  SELECT id, 'es', 'Modbus TCP', 'Protocolo Modbus sobre TCP/IP' FROM device_networks WHERE code = 'modbus_tcp'
  ON CONFLICT (device_network_id, lang) DO NOTHING;
INSERT INTO device_network_translations (device_network_id, lang, name, description)
  SELECT id, 'en', 'Modbus TCP', 'Modbus protocol over TCP/IP' FROM device_networks WHERE code = 'modbus_tcp'
  ON CONFLICT (device_network_id, lang) DO NOTHING;

-- ============================================================
-- 5. Device Servers (3 servidores)
-- ============================================================
INSERT INTO device_servers (code, server_type, host, port, use_ssl, display_order, is_active, created_at, updated_at)
  VALUES ('mqtt_primary', 'mqtt', 'mqtt.ecdata.io', 1883, false, 1, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_server_translations (device_server_id, lang, name, description)
  SELECT id, 'es', 'MQTT Principal', 'Broker MQTT principal de producción' FROM device_servers WHERE code = 'mqtt_primary'
  ON CONFLICT (device_server_id, lang) DO NOTHING;
INSERT INTO device_server_translations (device_server_id, lang, name, description)
  SELECT id, 'en', 'MQTT Primary', 'Primary production MQTT broker' FROM device_servers WHERE code = 'mqtt_primary'
  ON CONFLICT (device_server_id, lang) DO NOTHING;

INSERT INTO device_servers (code, server_type, host, port, use_ssl, display_order, is_active, created_at, updated_at)
  VALUES ('mqtt_backup', 'mqtt', 'mqtt-backup.ecdata.io', 1883, false, 2, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_server_translations (device_server_id, lang, name, description)
  SELECT id, 'es', 'MQTT Backup', 'Broker MQTT de respaldo' FROM device_servers WHERE code = 'mqtt_backup'
  ON CONFLICT (device_server_id, lang) DO NOTHING;
INSERT INTO device_server_translations (device_server_id, lang, name, description)
  SELECT id, 'en', 'MQTT Backup', 'Backup MQTT broker' FROM device_servers WHERE code = 'mqtt_backup'
  ON CONFLICT (device_server_id, lang) DO NOTHING;

INSERT INTO device_servers (code, server_type, host, port, use_ssl, display_order, is_active, created_at, updated_at)
  VALUES ('ftp_primary', 'ftp', 'ftp.ecdata.io', 21, false, 3, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_server_translations (device_server_id, lang, name, description)
  SELECT id, 'es', 'FTP Principal', 'Servidor FTP para transferencia de archivos' FROM device_servers WHERE code = 'ftp_primary'
  ON CONFLICT (device_server_id, lang) DO NOTHING;
INSERT INTO device_server_translations (device_server_id, lang, name, description)
  SELECT id, 'en', 'FTP Primary', 'FTP server for file transfer' FROM device_servers WHERE code = 'ftp_primary'
  ON CONFLICT (device_server_id, lang) DO NOTHING;

-- ============================================================
-- 6. Device Licenses (4 licencias)
-- ============================================================
INSERT INTO device_licenses (code, display_order, is_active, created_at, updated_at)
  VALUES ('basic', 1, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_license_translations (device_license_id, lang, name, description)
  SELECT id, 'es', 'Básica', 'Licencia básica con funcionalidades estándar' FROM device_licenses WHERE code = 'basic'
  ON CONFLICT (device_license_id, lang) DO NOTHING;
INSERT INTO device_license_translations (device_license_id, lang, name, description)
  SELECT id, 'en', 'Basic', 'Basic license with standard features' FROM device_licenses WHERE code = 'basic'
  ON CONFLICT (device_license_id, lang) DO NOTHING;

INSERT INTO device_licenses (code, display_order, is_active, created_at, updated_at)
  VALUES ('standard', 2, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_license_translations (device_license_id, lang, name, description)
  SELECT id, 'es', 'Estándar', 'Licencia estándar con módulos adicionales' FROM device_licenses WHERE code = 'standard'
  ON CONFLICT (device_license_id, lang) DO NOTHING;
INSERT INTO device_license_translations (device_license_id, lang, name, description)
  SELECT id, 'en', 'Standard', 'Standard license with additional modules' FROM device_licenses WHERE code = 'standard'
  ON CONFLICT (device_license_id, lang) DO NOTHING;

INSERT INTO device_licenses (code, display_order, is_active, created_at, updated_at)
  VALUES ('professional', 3, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_license_translations (device_license_id, lang, name, description)
  SELECT id, 'es', 'Profesional', 'Licencia profesional con todas las funcionalidades' FROM device_licenses WHERE code = 'professional'
  ON CONFLICT (device_license_id, lang) DO NOTHING;
INSERT INTO device_license_translations (device_license_id, lang, name, description)
  SELECT id, 'en', 'Professional', 'Professional license with all features' FROM device_licenses WHERE code = 'professional'
  ON CONFLICT (device_license_id, lang) DO NOTHING;

INSERT INTO device_licenses (code, display_order, is_active, created_at, updated_at)
  VALUES ('enterprise', 4, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_license_translations (device_license_id, lang, name, description)
  SELECT id, 'es', 'Enterprise', 'Licencia enterprise para grandes instalaciones' FROM device_licenses WHERE code = 'enterprise'
  ON CONFLICT (device_license_id, lang) DO NOTHING;
INSERT INTO device_license_translations (device_license_id, lang, name, description)
  SELECT id, 'en', 'Enterprise', 'Enterprise license for large installations' FROM device_licenses WHERE code = 'enterprise'
  ON CONFLICT (device_license_id, lang) DO NOTHING;

-- ============================================================
-- 7. Device Validity Periods (4 períodos)
-- ============================================================
INSERT INTO device_validity_periods (code, months, display_order, is_active, created_at, updated_at)
  VALUES ('monthly', 1, 1, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_validity_period_translations (device_validity_period_id, lang, name, description)
  SELECT id, 'es', 'Mensual', 'Período de validez de 1 mes' FROM device_validity_periods WHERE code = 'monthly'
  ON CONFLICT (device_validity_period_id, lang) DO NOTHING;
INSERT INTO device_validity_period_translations (device_validity_period_id, lang, name, description)
  SELECT id, 'en', 'Monthly', '1 month validity period' FROM device_validity_periods WHERE code = 'monthly'
  ON CONFLICT (device_validity_period_id, lang) DO NOTHING;

INSERT INTO device_validity_periods (code, months, display_order, is_active, created_at, updated_at)
  VALUES ('quarterly', 3, 2, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_validity_period_translations (device_validity_period_id, lang, name, description)
  SELECT id, 'es', 'Trimestral', 'Período de validez de 3 meses' FROM device_validity_periods WHERE code = 'quarterly'
  ON CONFLICT (device_validity_period_id, lang) DO NOTHING;
INSERT INTO device_validity_period_translations (device_validity_period_id, lang, name, description)
  SELECT id, 'en', 'Quarterly', '3 month validity period' FROM device_validity_periods WHERE code = 'quarterly'
  ON CONFLICT (device_validity_period_id, lang) DO NOTHING;

INSERT INTO device_validity_periods (code, months, display_order, is_active, created_at, updated_at)
  VALUES ('annual', 12, 3, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_validity_period_translations (device_validity_period_id, lang, name, description)
  SELECT id, 'es', 'Anual', 'Período de validez de 1 año' FROM device_validity_periods WHERE code = 'annual'
  ON CONFLICT (device_validity_period_id, lang) DO NOTHING;
INSERT INTO device_validity_period_translations (device_validity_period_id, lang, name, description)
  SELECT id, 'en', 'Annual', '1 year validity period' FROM device_validity_periods WHERE code = 'annual'
  ON CONFLICT (device_validity_period_id, lang) DO NOTHING;

INSERT INTO device_validity_periods (code, months, display_order, is_active, created_at, updated_at)
  VALUES ('permanent', NULL, 4, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
INSERT INTO device_validity_period_translations (device_validity_period_id, lang, name, description)
  SELECT id, 'es', 'Permanente', 'Licencia permanente sin fecha de expiración' FROM device_validity_periods WHERE code = 'permanent'
  ON CONFLICT (device_validity_period_id, lang) DO NOTHING;
INSERT INTO device_validity_period_translations (device_validity_period_id, lang, name, description)
  SELECT id, 'en', 'Permanent', 'Permanent license with no expiration date' FROM device_validity_periods WHERE code = 'permanent'
  ON CONFLICT (device_validity_period_id, lang) DO NOTHING;

-- ============================================================
-- 8. Usuario Admin (requiere password_hash manual — ver instrucciones)
-- ============================================================
DO $$
DECLARE
  v_role_id INTEGER;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'system-admin' LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO users (
      id, public_code, human_id, first_name, last_name,
      email, password_hash, role_id, is_active, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      'USR-SEED-ADM',
      'ADM-001',
      'System',
      'Administrator',
      'admin@ecdata.com',
      '<BCRYPT_HASH_AQUI>',
      v_role_id,
      true,
      NOW(), NOW()
    ) ON CONFLICT (email) DO NOTHING;
  ELSE
    RAISE NOTICE 'Rol system-admin no encontrado. Ejecutar primero las migraciones.';
  END IF;
END $$;

-- FIN DEL SEED