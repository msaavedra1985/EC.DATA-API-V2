-- ============================================================
-- SQL de migración: Dispositivos y Canales de Sirenis
-- Generado: 2026-03-05T14:33:50.120Z
-- Total: 41 dispositivos, 299 canales
--
-- Instrucciones de uso:
--   1. Asegurarse que db:setup y db:seed:core ya corrieron en producción
--   2. Crear la organización 'Sirenis' via API (si no existe)
--   3. Ejecutar este archivo: psql $DATABASE_URL -f sirenis-devices.sql
--
-- El script es idempotente: se puede correr múltiples veces sin duplicar datos.
-- Columnas generadas dinámicamente desde SELECT * del schema real.
-- ============================================================

BEGIN;

-- --------------------------------------------------------
-- Verificación: la organización Sirenis debe existir
-- --------------------------------------------------------
DO $check$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'sirenis') THEN
        RAISE EXCEPTION 'Organización con slug "sirenis" no encontrada. Crearla primero via API antes de correr este script.';
    END IF;
END
$check$;

-- --------------------------------------------------------
-- Brands y Models legacy (no están en el seed estándar)
-- --------------------------------------------------------
INSERT INTO device_brands (code, display_order, is_active, created_at, updated_at)
VALUES
    ('energycloud', 90, true, NOW(), NOW()),
    ('accuenergy',  91, true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
SELECT id, 'es', 'Energy Cloud', 'Plataforma IoT Energy Cloud'
FROM device_brands WHERE code = 'energycloud'
ON CONFLICT (device_brand_id, lang) DO NOTHING;

INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
SELECT id, 'en', 'Energy Cloud', 'Energy Cloud IoT Platform'
FROM device_brands WHERE code = 'energycloud'
ON CONFLICT (device_brand_id, lang) DO NOTHING;

INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
SELECT id, 'es', 'Accuenergy', 'Medidores de energía Accuenergy'
FROM device_brands WHERE code = 'accuenergy'
ON CONFLICT (device_brand_id, lang) DO NOTHING;

INSERT INTO device_brand_translations (device_brand_id, lang, name, description)
SELECT id, 'en', 'Accuenergy', 'Accuenergy power meters'
FROM device_brands WHERE code = 'accuenergy'
ON CONFLICT (device_brand_id, lang) DO NOTHING;

INSERT INTO device_models (device_brand_id, code, display_order, is_active, created_at, updated_at)
SELECT id, 'ECS', 1, true, NOW(), NOW()
FROM device_brands WHERE code = 'energycloud'
ON CONFLICT (device_brand_id, code) DO NOTHING;

INSERT INTO device_models (device_brand_id, code, display_order, is_active, created_at, updated_at)
SELECT id, 'EC.node', 2, true, NOW(), NOW()
FROM device_brands WHERE code = 'energycloud'
ON CONFLICT (device_brand_id, code) DO NOTHING;

INSERT INTO device_models (device_brand_id, code, display_order, is_active, created_at, updated_at)
SELECT id, 'Acuvim II-W', 1, true, NOW(), NOW()
FROM device_brands WHERE code = 'accuenergy'
ON CONFLICT (device_brand_id, code) DO NOTHING;

-- --------------------------------------------------------
-- Dispositivos (41 total)
-- Columnas obtenidas dinámicamente desde el schema real de la DB.
-- organization_id resuelto por slug 'sirenis'.
-- --------------------------------------------------------

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-bf66-70f0-bc46-509a0c3a1fff',
    1,
    'DEV-W4W-TMS',
    'cf41be89-b498-4cf6-bea5-1b03d0e2be11',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'Sirenis - Maleta Doble - EN1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    '80:1F:12:5A:6B:7E',
    NULL,
    NULL,
    NULL,
    '20.42876500',
    '-87.29419000',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    true,
    '2020-10-23T22:22:02.000Z',
    '2026-02-12T17:08:54.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-bf66-70f0-bc46-509a0c3a1fff');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c07e-725f-ac03-f93e8921ef61',
    2,
    'DEV-9SV-HHP',
    '948ca6a5-3a00-4591-a409-1115ce1fc686',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - Poblado Hidro -A1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2F:B1',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-05T12:00:41.000Z',
    '2026-02-12T17:08:55.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c07e-725f-ac03-f93e8921ef61');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c0c9-7359-bfef-d70854a05e20',
    3,
    'DEV-24M-56A',
    '1a45a2a2-b727-4c2a-b037-37d9c917105c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - Poblado Hidro -A2',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2F:0B',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-10T15:26:56.000Z',
    '2026-02-12T17:08:55.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c0c9-7359-bfef-d70854a05e20');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c116-71ea-b71c-7b9a9bb10b70',
    4,
    'DEV-694-GLA',
    '79f15e01-a61a-44a8-847e-29ef7c349e23',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - Oficina RRHH',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2F:01',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:58.000Z',
    NULL,
    true,
    '2021-08-10T15:28:21.000Z',
    '2026-02-12T17:08:55.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c116-71ea-b71c-7b9a9bb10b70');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c15f-7234-8a1c-b41244d0dfaa',
    5,1
    'DEV-HVT-WUW',
    '2d85da94-9a4f-4e81-a36c-fe655526fcf4',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - Lavanderia Motores',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2F:AF',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-10T15:29:49.000Z',
    '2026-02-12T17:08:55.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c15f-7234-8a1c-b41244d0dfaa');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c1aa-701f-be0c-d991cb4785bf',
    6,
    'DEV-MLU-UGK',
    'a9561285-6c75-4444-a6e7-deac45a19acb',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - TEMATICOS I-A',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2F:15',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T14:48:21.000Z',
    '2026-02-12T17:08:55.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c1aa-701f-be0c-d991cb4785bf');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c1f3-739f-bfed-8fcbc23e16d8',
    7,
    'DEV-FLS-DDF',
    '42434aa0-7c0b-4763-9980-097728054583',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - TEMATICOS I-B',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2F:17',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T15:05:59.000Z',
    '2026-02-12T17:08:55.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c1f3-739f-bfed-8fcbc23e16d8');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c23d-761a-a04e-4443e0a4cafe',
    8,
    'DEV-F96-3HL',
    'ad82451c-5348-40d2-bbcb-2fbf502e04a5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - TEMATICOS II',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2F:4F',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T15:06:52.000Z',
    '2026-02-12T17:08:55.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c23d-761a-a04e-4443e0a4cafe');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c286-72ba-b41b-fbb5675ebbbd',
    9,
    'DEV-SAN-TSM',
    '02686a85-9b14-46b2-800a-64aab64eaa00',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - BAYUM2',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2E:39',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T15:07:56.000Z',
    '2026-02-12T17:08:55.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c286-72ba-b41b-fbb5675ebbbd');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c2d0-7181-86f4-e3cfcae00fed',
    10,
    'DEV-FDC-C54',
    '89f592e3-2b07-4218-b0b4-f771d3b6d531',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - Steak House',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2E:53',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-13T15:09:58.000Z',
    '2026-02-12T17:08:55.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c2d0-7181-86f4-e3cfcae00fed');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c31f-708f-83f3-94bcb934dcaa',
    11,
    'DEV-RAK-4S6',
    '67182edf-ee4b-4eb2-8e27-6978f6d0ca5e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - EJECUTIVOS',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2E:A3',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T15:12:10.000Z',
    '2026-02-12T17:08:55.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c31f-708f-83f3-94bcb934dcaa');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    12,
    'DEV-KY4-GMD',
    '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - BMS - CHILLER 1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '20.42875390',
    '-87.29547790',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-19T15:18:59.000Z',
    '2026-02-12T17:08:55.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c36a-743c-8e7e-c71a82ce31a3');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    13,
    'DEV-U4J-C72',
    '2b0f32eb-351a-4171-86a0-d5510a1f19a4',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - BMS - CHILLER 2',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '20.42875390',
    '-87.29547790',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-19T15:18:59.000Z',
    '2026-02-12T17:08:55.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c3b3-714d-9fb7-f1335eccee4e');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    14,
    'DEV-UJM-XFY',
    'b776b651-ce8f-4a98-970e-36ff0f6f0593',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - BMS - CHILLER 3',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '20.42875390',
    '-87.29547790',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-19T15:18:59.000Z',
    '2026-02-12T17:08:55.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c3fd-74bf-a2b3-293fbf49f58c');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c447-701c-abe6-060018944fa5',
    15,
    'DEV-CCA-SHH',
    'c5ab23f8-cc76-4f3a-8770-f05d697b4e39',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - BMS - CHILLER 4',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '20.42875390',
    '-87.29547790',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-19T15:18:59.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c447-701c-abe6-060018944fa5');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c490-735d-97c4-e5be9a99dc31',
    16,
    'DEV-U97-F29',
    '0e5f4ee9-42d3-4ef1-93c3-846243393c66',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS-PC-PARQUE ACUATICO-ACU1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Solution/EC/SIRENIS/',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '18.81752740',
    '-68.59090270',
    NULL,
    'America/Santo_Domingo',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-26T21:53:48.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c490-735d-97c4-e5be9a99dc31');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c4dc-7550-9b87-9125f59922ac',
    17,
    'DEV-UUL-5K4',
    '2a7f495d-cdb4-474e-8a44-e9dc98eb5337',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS-PC-LAVANDERIA-ACU1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Solution/EC/SIRENIS/',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '18.81752740',
    '-68.59090270',
    NULL,
    'America/Santo_Domingo',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:49:02.000Z',
    NULL,
    true,
    '2022-03-26T21:56:44.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c4dc-7550-9b87-9125f59922ac');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c526-723a-9513-58cc1da65c97',
    18,
    'DEV-C9M-US3',
    '948759d7-6b76-4037-8504-a8e6ba508e62',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS-PC-CHILLERS-ACU1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Solution/EC/SIRENIS/',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '18.81752740',
    '-68.59090270',
    NULL,
    'America/Santo_Domingo',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2022-03-26T21:59:51.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c526-723a-9513-58cc1da65c97');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c570-742e-bbbd-ea2200ef8a22',
    19,
    'DEV-S9G-XRW',
    '1bba1670-9bbb-449c-b81e-905e762a7385',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS-PC-TEX MEX-ACU1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Solution/EC/SIRENIS/',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '18.81752740',
    '-68.59090270',
    NULL,
    'America/Santo_Domingo',
    NULL,
    NULL,
    NULL,
    '2025-12-05T16:09:30.000Z',
    NULL,
    true,
    '2022-03-26T22:02:21.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c570-742e-bbbd-ea2200ef8a22');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c5ba-71bf-82fb-b9da4e031188',
    20,
    'DEV-EJQ-M5W',
    'bb9eca17-8fbc-44d8-b3f2-9587e20bd979',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS-PC-TEMATICOS-ACU1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Solution/EC/SIRENIS/',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '18.81752740',
    '-68.59090270',
    NULL,
    'America/Santo_Domingo',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:56.000Z',
    NULL,
    true,
    '2022-03-26T22:05:24.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c5ba-71bf-82fb-b9da4e031188');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c603-757b-95fc-5f623c675100',
    21,
    'DEV-2EW-N2U',
    'eca28267-d2c5-4ad0-9c60-b734655bc2f9',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS-PC-SE COCOTAL-ACU1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Solution/EC/SIRENIS/',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '18.81752740',
    '-68.59090270',
    NULL,
    'America/Santo_Domingo',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:49:03.000Z',
    NULL,
    true,
    '2022-03-26T22:10:36.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c603-757b-95fc-5f623c675100');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c64d-715e-8013-178a880c9011',
    22,
    'DEV-JKM-5GR',
    '0cb251b2-af55-4cdf-99cf-0a1d16fd2733',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS-PC-SE COCOTAL-ACU2',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Solution/EC/SIRENIS/',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '18.81752740',
    '-68.59090270',
    NULL,
    'America/Santo_Domingo',
    NULL,
    NULL,
    NULL,
    '2025-06-19T16:31:31.000Z',
    NULL,
    true,
    '2022-03-26T22:21:30.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c64d-715e-8013-178a880c9011');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c69c-7749-8e16-bee1f4ebf585',
    23,
    'DEV-6KR-R3N',
    '089b07cd-66fa-4ace-906b-17ae21e60e80',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS-PC-SE TROPICAL-ACU1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Solution/EC/SIRENIS/',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '18.81752740',
    '-68.59090270',
    NULL,
    'America/Santo_Domingo',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:49:04.000Z',
    NULL,
    true,
    '2022-03-26T22:23:52.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c69c-7749-8e16-bee1f4ebf585');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c6e6-70a2-ba1f-5776f96830ce',
    24,
    'DEV-M3M-E96',
    'f58e5ffc-75ec-41cf-b60c-6bec6b9b80b2',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS-PC-SE TROPICAL-ACU2',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Solution/EC/SIRENIS/',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '18.81752740',
    '-68.59090270',
    NULL,
    'America/Santo_Domingo',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-26T22:25:48.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c6e6-70a2-ba1f-5776f96830ce');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c731-7739-9c7b-ed5c99b0e97d',
    25,
    'DEV-CGW-4V7',
    '044e3c7d-516c-4345-a217-e6d13549c8bf',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS-PC-REFRIGERACION ECONOMATO-ACU1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Solution/EC/SIRENIS/',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '18.81752740',
    '-68.59090270',
    NULL,
    'America/Santo_Domingo',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-26T22:27:08.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c731-7739-9c7b-ed5c99b0e97d');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c77b-7462-8695-b5f6e3e520e3',
    26,
    'DEV-YC2-255',
    'ec903e09-64a2-4948-b8c6-8d45cfb2d5c1',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS-PC-CHILLERS-ACU2',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Solution/EC/SIRENIS/',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '18.81752740',
    '-68.59090270',
    NULL,
    'America/Santo_Domingo',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-26T22:35:40.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c77b-7462-8695-b5f6e3e520e3');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c7c5-741a-913c-9deb9d04872d',
    27,
    'DEV-NLN-FKE',
    'da516fb7-eefa-4553-90fd-434844303afc',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS-PC-SE PRINCIPAL-NODO1',
    NULL,
    NULL,
    1,
    2,
    NULL,
    NULL,
    NULL,
    NULL,
    'Solution/EC/SIRENIS/',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '18.81752740',
    '-68.59090270',
    NULL,
    'America/Santo_Domingo',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:49:02.000Z',
    NULL,
    true,
    '2022-03-26T21:58:30.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c7c5-741a-913c-9deb9d04872d');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c818-750f-b276-202fd6f44ff8',
    28,
    'DEV-ZMX-U9V',
    '24d8b4a7-c380-49d9-af99-cf379a722d60',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - VFD XAAC1',
    NULL,
    NULL,
    1,
    2,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2022-08-16T13:29:24.000Z',
    '2026-02-12T17:08:56.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c818-750f-b276-202fd6f44ff8');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c862-76de-8f61-1a2241bdbdbc',
    29,
    'DEV-27V-C9C',
    '2a9efbbd-2503-4f54-bb5a-a5e290ad0bd4',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - VFD XAAC2',
    NULL,
    NULL,
    1,
    1,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2022-08-16T13:35:53.000Z',
    '2026-02-12T17:08:57.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c862-76de-8f61-1a2241bdbdbc');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c8ac-742f-9041-9f119228fae3',
    30,
    'DEV-4CH-H9J',
    '766ae888-6fd8-4197-adc2-f82844aca6cd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - VFD LOBBY',
    NULL,
    NULL,
    1,
    1,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    '6',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2022-08-16T13:39:36.000Z',
    '2026-02-12T17:08:57.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c8ac-742f-9041-9f119228fae3');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c8f8-71ea-872a-3d3421769de7',
    31,
    'DEV-UQN-7VP',
    'b0ad4ea4-0b0e-4380-8c67-de7286d15b5e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - 5c3a346055 - BTU ',
    NULL,
    NULL,
    1,
    2,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '20.42827210',
    '-87.29531940',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2025-08-20T22:05:34.000Z',
    '2026-02-12T17:08:57.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c8f8-71ea-872a-3d3421769de7');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c943-746c-838b-baacdc401a85',
    32,
    'DEV-67K-FGE',
    'c155c8b9-a2ae-4018-86aa-6b25a8570160',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - Lobby - A1',
    NULL,
    NULL,
    4,
    17,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2F:23',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-11T02:04:15.000Z',
    '2026-02-12T17:08:57.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c943-746c-838b-baacdc401a85');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c98e-7564-80fe-4da6db231ebd',
    33,
    'DEV-RPG-V4Y',
    'c2016124-531b-429f-afd9-2f574a88508c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - COCINA 2',
    NULL,
    NULL,
    4,
    17,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2F:A7',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-13T14:46:25.000Z',
    '2026-02-12T17:08:57.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c98e-7564-80fe-4da6db231ebd');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-c9d8-73dd-938b-c2670566482e',
    34,
    'DEV-PH7-CQW',
    'ac82b508-cab1-452c-adcb-589a2b7cd99f',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - CASA DE PLAYA',
    NULL,
    NULL,
    4,
    17,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2E:45',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T14:50:13.000Z',
    '2026-02-12T17:08:57.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-c9d8-73dd-938b-c2670566482e');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ca23-722e-bd54-fce8a7551177',
    35,
    'DEV-4LW-FD6',
    '85fc19a4-19f1-498a-a337-6aa599a2b7cd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - SPA',
    NULL,
    NULL,
    4,
    17,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2E:67',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:31.000Z',
    NULL,
    true,
    '2021-08-13T14:56:42.000Z',
    '2026-02-12T17:08:57.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-ca23-722e-bd54-fce8a7551177');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ca6c-74d9-96cd-e19f3f088846',
    36,
    'DEV-LGY-RNR',
    '41e419f7-8ca3-42f0-b473-0971107183ec',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - Lobby - A3',
    NULL,
    NULL,
    4,
    17,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2E:8D',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T14:57:55.000Z',
    '2026-02-12T17:08:57.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-ca6c-74d9-96cd-e19f3f088846');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cab8-705f-84df-d27b0e24874d',
    37,
    'DEV-DDA-R5N',
    'e091e43a-7177-4f1b-9482-eaa3f929dfc1',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - COCINA 1',
    NULL,
    NULL,
    4,
    17,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2F:61',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T15:04:49.000Z',
    '2026-02-12T17:08:57.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-cab8-705f-84df-d27b0e24874d');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cb01-732a-99f8-4c06a55a973b',
    38,
    'DEV-6DK-54P',
    '89879a96-8f0a-4d99-857b-c2428395f4a1',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - CHILLERS',
    NULL,
    NULL,
    4,
    17,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2E:6D',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-13T15:08:54.000Z',
    '2026-02-12T17:08:57.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-cb01-732a-99f8-4c06a55a973b');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cb4b-77ec-820c-82e24f69bd4b',
    39,
    'DEV-FN9-N4Y',
    'e8c21d30-f3d5-4789-bf8f-8374cccbbd62',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - Lobby - A2 - Área de servicio',
    NULL,
    NULL,
    4,
    17,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    'EC:C3:8A:60:2C:9B',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T15:11:04.000Z',
    '2026-02-12T17:08:57.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-cb4b-77ec-820c-82e24f69bd4b');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cb95-7512-8bf8-b0fbf71a13d2',
    40,
    'DEV-5NC-9VH',
    'f6436441-2ee2-4e85-86f4-ec5fe57186bc',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS MEX - SUB PRINCIPAL MT',
    NULL,
    NULL,
    4,
    17,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'active',
    NULL,
    NULL,
    NULL,
    '00:26:45:01:2F:76',
    NULL,
    NULL,
    NULL,
    '20.42859900',
    '-87.29589290',
    NULL,
    'America/Cancun',
    NULL,
    NULL,
    NULL,
    '2025-11-05T12:09:08.000Z',
    NULL,
    true,
    '2021-09-15T13:31:37.000Z',
    '2026-02-12T17:08:57.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-cb95-7512-8bf8-b0fbf71a13d2');

INSERT INTO devices (id, human_id, public_code, uuid, organization_id, site_id, name, description, device_type_id, brand_id, model_id, server_id, network_id, license_id, validity_period_id, topic, status, firmware_version, serial_number, ip_address, mac_address, location_name, physical_location, electrical_location, latitude, longitude, city, timezone, installation_date, warranty_months, expiration_date, last_seen_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cbe0-751f-9b1f-a954ae564a17',
    41,
    'DEV-KQK-2VY',
    'aeda62af-d04d-40b2-b21e-cc06777cadf1',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    NULL,
    'SIRENIS-PC-CLUB PREMIUM-ACU1',
    NULL,
    NULL,
    4,
    17,
    NULL,
    NULL,
    NULL,
    NULL,
    'Solution/EC/SIRENIS/',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '18.81752740',
    '-68.59090270',
    NULL,
    'America/Santo_Domingo',
    NULL,
    NULL,
    NULL,
    '2026-02-12T16:48:53.000Z',
    NULL,
    true,
    '2022-03-26T22:01:09.000Z',
    '2026-02-12T17:08:57.000Z'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '019c52d3-cbe0-751f-9b1f-a954ae564a17');

-- --------------------------------------------------------
-- Canales (299 total)
-- Columnas obtenidas dinámicamente desde el schema real de la DB.
-- organization_id resuelto por slug 'sirenis'.
-- --------------------------------------------------------

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ccbd-7234-81de-05d825c8fa74',
    1,
    'CHN-FXG-79E',
    '019c52d3-c07e-725f-ac03-f93e8921ef61',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Edificio 1 - Lado Derecho',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-05T12:00:41.000Z',
    '2026-02-12T17:08:58.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ccbd-7234-81de-05d825c8fa74');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cd07-74f9-907e-acd79f475404',
    2,
    'CHN-6UE-GTQ',
    '019c52d3-c07e-725f-ac03-f93e8921ef61',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Edificio 1 - Lado Izquierdo',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:33:53.000Z',
    '2026-02-12T17:08:58.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-cd07-74f9-907e-acd79f475404');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cd52-713e-b2b9-9a15181f32a3',
    3,
    'CHN-A9L-VTU',
    '019c52d3-c07e-725f-ac03-f93e8921ef61',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Edificio 3 - Lado Derecho',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:34:48.000Z',
    '2026-02-12T17:08:58.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-cd52-713e-b2b9-9a15181f32a3');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cd9b-724b-a54a-9e66ee0fb53a',
    4,
    'CHN-2MD-MJ3',
    '019c52d3-c07e-725f-ac03-f93e8921ef61',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Bombas de agua',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:35:35.000Z',
    '2026-02-12T17:08:58.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-cd9b-724b-a54a-9e66ee0fb53a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cde4-72ac-962c-1a2414829ed0',
    5,
    'CHN-JGM-KJ3',
    '019c52d3-c07e-725f-ac03-f93e8921ef61',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Edificio 2 - Lado Derecho',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:35:58.000Z',
    '2026-02-12T17:08:58.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-cde4-72ac-962c-1a2414829ed0');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ce2d-760b-9d44-d709b801a274',
    6,
    'CHN-AWF-J7W',
    '019c52d3-c07e-725f-ac03-f93e8921ef61',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Edificio 2 - Lado Izquierdo',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:36:17.000Z',
    '2026-02-12T17:08:58.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ce2d-760b-9d44-d709b801a274');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ce76-7106-90a2-e4f7964a40ac',
    7,
    'CHN-2U4-L5X',
    '019c52d3-c0c9-7359-bfef-d70854a05e20',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Edificio 3 - Lado Izquierdo',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-10T15:26:56.000Z',
    '2026-02-12T17:08:58.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ce76-7106-90a2-e4f7964a40ac');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cebf-7769-84ea-142d6923d464',
    8,
    'CHN-T5C-2NH',
    '019c52d3-c0c9-7359-bfef-d70854a05e20',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG - Poblado',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-18T01:37:35.000Z',
    '2026-02-12T17:08:58.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-cebf-7769-84ea-142d6923d464');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cf09-7066-b383-555d4c9d2be9',
    9,
    'CHN-PTE-TA6',
    '019c52d3-c0c9-7359-bfef-d70854a05e20',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG - Hidro Bombeo',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-18T01:38:08.000Z',
    '2026-02-12T17:08:58.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-cf09-7066-b383-555d4c9d2be9');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cf54-77d7-bec3-8a471719732a',
    10,
    'CHN-P6X-KLV',
    '019c52d3-c0c9-7359-bfef-d70854a05e20',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Bombas Grandes',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-18T01:38:41.000Z',
    '2026-02-12T17:08:58.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-cf54-77d7-bec3-8a471719732a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cfa4-778b-bded-bbfbf1283a36',
    11,
    'CHN-9UA-U4W',
    '019c52d3-c0c9-7359-bfef-d70854a05e20',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Bomba Electrica Contra Incendio',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-18T01:39:11.000Z',
    '2026-02-12T17:08:58.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-cfa4-778b-bded-bbfbf1283a36');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-cff8-762e-aff4-149dfaa4eb5c',
    12,
    'CHN-3NV-CEP',
    '019c52d3-c0c9-7359-bfef-d70854a05e20',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG - Osmosis',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-18T01:39:29.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-cff8-762e-aff4-149dfaa4eb5c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d042-747f-8b69-54b9d7d84614',
    13,
    'CHN-V6H-3YS',
    '019c52d3-c0c9-7359-bfef-d70854a05e20',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas Poblado (V)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2021-08-18T01:42:07.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d042-747f-8b69-54b9d7d84614');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d0d7-70b9-88e4-7b5aa2053a6d',
    15,
    'CHN-RJU-6CS',
    '019c52d3-c116-71ea-b71c-7b9a9bb10b70',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Oficina RRHH',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:58.000Z',
    NULL,
    true,
    '2021-08-10T15:28:21.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d0d7-70b9-88e4-7b5aa2053a6d');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d122-7529-97f0-aea04501d4ee',
    16,
    'CHN-WMQ-XEK',
    '019c52d3-c116-71ea-b71c-7b9a9bb10b70',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Fuerza Cafeteria',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:58.000Z',
    NULL,
    true,
    '2021-08-17T11:01:38.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d122-7529-97f0-aea04501d4ee');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d16b-725e-8c82-9c49d88f333c',
    17,
    'CHN-Z6S-YLX',
    '019c52d3-c116-71ea-b71c-7b9a9bb10b70',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Subtablero de Aires 1',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:58.000Z',
    NULL,
    true,
    '2021-08-18T01:05:40.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d16b-725e-8c82-9c49d88f333c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d1b5-7439-b06f-c54f7053da84',
    18,
    'CHN-HDY-SJP',
    '019c52d3-c116-71ea-b71c-7b9a9bb10b70',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Subtablero de Aires 2',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:58.000Z',
    NULL,
    true,
    '2021-08-18T01:06:14.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d1b5-7439-b06f-c54f7053da84');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d1fe-74ce-b2a3-4043aeb2ebfd',
    19,
    'CHN-FNU-U4W',
    '019c52d3-c116-71ea-b71c-7b9a9bb10b70',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Oficina Sistemas',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:58.000Z',
    NULL,
    true,
    '2021-08-18T01:06:36.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d1fe-74ce-b2a3-4043aeb2ebfd');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d290-757a-bb13-ce4799a52db2',
    21,
    'CHN-9H4-Q79',
    '019c52d3-c116-71ea-b71c-7b9a9bb10b70',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Iluminacion Sala de Calderas',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:58.000Z',
    NULL,
    true,
    '2021-08-18T01:07:37.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d290-757a-bb13-ce4799a52db2');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d246-762c-9fea-efe621be8f2a',
    20,
    'CHN-UQM-Y37',
    '019c52d3-c116-71ea-b71c-7b9a9bb10b70',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Iluminacion Osmosis',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:58.000Z',
    NULL,
    true,
    '2021-08-18T01:07:14.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d246-762c-9fea-efe621be8f2a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d2d9-73c8-b5b3-143bf7152596',
    22,
    'CHN-N63-USU',
    '019c52d3-c116-71ea-b71c-7b9a9bb10b70',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas RRHH (Iluminacion) (V)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2021-08-18T01:40:42.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d2d9-73c8-b5b3-143bf7152596');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d08d-756a-9d1d-a5a96891271e',
    14,
    'CHN-AFF-QWY',
    '019c52d3-c116-71ea-b71c-7b9a9bb10b70',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'SUBTOTAL- SIRENIS (V)',
    NULL,
    901,
    1,
    NULL,
    NULL,
    true,
    'active',
    NULL,
    NULL,
    true,
    '2021-08-23T20:11:19.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d08d-756a-9d1d-a5a96891271e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d322-7171-bcca-9922e8348702',
    23,
    'CHN-PZZ-74M',
    '019c52d3-c15f-7234-8a1c-b41244d0dfaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Compresores',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-10T15:29:49.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d322-7171-bcca-9922e8348702');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d36c-736e-a8a0-4ce84ac51dc4',
    24,
    'CHN-5PU-6CY',
    '019c52d3-c15f-7234-8a1c-b41244d0dfaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Dobladora 2',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-19T19:16:33.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d36c-736e-a8a0-4ce84ac51dc4');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d3b5-770f-8511-462cad34f728',
    25,
    'CHN-NX6-AJS',
    '019c52d3-c15f-7234-8a1c-b41244d0dfaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Dobladora 1',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-19T19:16:51.000Z',
    '2026-02-12T17:08:59.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d3b5-770f-8511-462cad34f728');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d3ff-76cf-b591-96614a2b376d',
    26,
    'CHN-LXK-4S7',
    '019c52d3-c15f-7234-8a1c-b41244d0dfaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Planchadora 1',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-19T19:17:08.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d3ff-76cf-b591-96614a2b376d');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d448-7223-aee4-a08ba5b4c4c0',
    27,
    'CHN-XHC-C5Y',
    '019c52d3-c15f-7234-8a1c-b41244d0dfaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Planchadora 2',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-19T19:17:27.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d448-7223-aee4-a08ba5b4c4c0');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d492-77e0-8aa5-2a677991ca5a',
    28,
    'CHN-VVT-U24',
    '019c52d3-c15f-7234-8a1c-b41244d0dfaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Motores lavanderia',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-19T19:17:44.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d492-77e0-8aa5-2a677991ca5a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d4db-748c-ad46-699243d93015',
    29,
    'CHN-RA6-DCT',
    '019c52d3-c15f-7234-8a1c-b41244d0dfaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Maquinas Lavanderia (V)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2021-08-19T19:19:22.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d4db-748c-ad46-699243d93015');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d92f-747c-876f-0e2922dcb062',
    44,
    'CHN-W4Z-K4L',
    '019c52d3-c1aa-701f-be0c-d991cb4785bf',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Temáticos',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T14:48:21.000Z',
    '2026-02-12T17:09:01.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d92f-747c-876f-0e2922dcb062');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d979-74ba-ad52-ed7d3618f3c1',
    45,
    'CHN-ELC-E32',
    '019c52d3-c1aa-701f-be0c-d991cb4785bf',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Tablero Frances',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:09:06.000Z',
    '2026-02-12T17:09:01.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d979-74ba-ad52-ed7d3618f3c1');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d9cc-75ad-b04f-b7f4019a9a6e',
    46,
    'CHN-YJC-DYQ',
    '019c52d3-c1aa-701f-be0c-d991cb4785bf',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Coffe Shop',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:10:12.000Z',
    '2026-02-12T17:09:01.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d9cc-75ad-b04f-b7f4019a9a6e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-daad-712f-acf9-3e77486674a3',
    49,
    'CHN-6R4-QK3',
    '019c52d3-c1aa-701f-be0c-d991cb4785bf',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Tab Luces y contactos Mexicano',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:13:02.000Z',
    '2026-02-12T17:09:01.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-daad-712f-acf9-3e77486674a3');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-da14-7558-8614-6139aae91edb',
    47,
    'CHN-A7K-97Q',
    '019c52d3-c1aa-701f-be0c-d991cb4785bf',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Tab Fuerza Mexicano',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:11:54.000Z',
    '2026-02-12T17:09:01.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-da14-7558-8614-6139aae91edb');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-da5d-727d-b653-69de9811a8d1',
    48,
    'CHN-ELY-99X',
    '019c52d3-c1aa-701f-be0c-d991cb4785bf',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Horno central',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:12:23.000Z',
    '2026-02-12T17:09:01.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-da5d-727d-b653-69de9811a8d1');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-daf8-75aa-ad1b-7ebfb40ad0bd',
    50,
    'CHN-N57-F2R',
    '019c52d3-c1aa-701f-be0c-d991cb4785bf',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas (V)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2021-08-23T15:20:18.000Z',
    '2026-02-12T17:09:01.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-daf8-75aa-ad1b-7ebfb40ad0bd');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e2ae-74a9-978d-21a4635d451a',
    77,
    'CHN-C3Q-UKW',
    '019c52d3-c1f3-739f-bfed-8fcbc23e16d8',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Cocina Central',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T15:05:59.000Z',
    '2026-02-12T17:09:03.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e2ae-74a9-978d-21a4635d451a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e2f8-749a-9f8a-defa1785cb49',
    78,
    'CHN-CMT-Z5H',
    '019c52d3-c1f3-739f-bfed-8fcbc23e16d8',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Tab Japones',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:16:11.000Z',
    '2026-02-12T17:09:03.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e2f8-749a-9f8a-defa1785cb49');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e341-7438-9051-97513dd3e323',
    79,
    'CHN-9JW-HU3',
    '019c52d3-c1f3-739f-bfed-8fcbc23e16d8',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Luces pasillo Peruano',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:16:44.000Z',
    '2026-02-12T17:09:03.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e341-7438-9051-97513dd3e323');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e38b-74ea-ac81-be9dab511a4f',
    80,
    'CHN-5LV-SSW',
    '019c52d3-c1f3-739f-bfed-8fcbc23e16d8',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Chiringos Bar Playa',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:17:07.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e38b-74ea-ac81-be9dab511a4f');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e3d4-7774-bf6d-9d0409f0c666',
    81,
    'CHN-2KG-GT7',
    '019c52d3-c1f3-739f-bfed-8fcbc23e16d8',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Tab Meditarraneo',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:17:29.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e3d4-7774-bf6d-9d0409f0c666');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e41e-7729-aad4-915f20c74e37',
    82,
    'CHN-CLU-FU5',
    '019c52d3-c1f3-739f-bfed-8fcbc23e16d8',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'UMAS Mexicano',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:17:49.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e41e-7729-aad4-915f20c74e37');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e466-7466-9b39-df34f93e80ab',
    83,
    'CHN-ACG-NP2',
    '019c52d3-c23d-761a-a04e-4443e0a4cafe',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Lavavajillas',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T15:06:52.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e466-7466-9b39-df34f93e80ab');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e4af-738a-a81d-387292d8e059',
    84,
    'CHN-LG2-A73',
    '019c52d3-c23d-761a-a04e-4443e0a4cafe',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Lava Utencilios',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:22:48.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e4af-738a-a81d-387292d8e059');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e4f8-717a-8b1e-56d0a8873667',
    85,
    'CHN-2N4-45L',
    '019c52d3-c23d-761a-a04e-4443e0a4cafe',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cuarto Frio #3',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:23:07.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e4f8-717a-8b1e-56d0a8873667');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e5d2-77d6-b3d8-e65a041f293a',
    88,
    'CHN-UGL-QFQ',
    '019c52d3-c23d-761a-a04e-4443e0a4cafe',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Camara de Conservacion #2',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:30:10.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e5d2-77d6-b3d8-e65a041f293a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e540-7704-b145-c87203a461d1',
    86,
    'CHN-2K6-TST',
    '019c52d3-c23d-761a-a04e-4443e0a4cafe',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Extractor Cocina Central',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:27:27.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e540-7704-b145-c87203a461d1');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e589-75cd-89a5-ee1acb079604',
    87,
    'CHN-S6N-2WQ',
    '019c52d3-c23d-761a-a04e-4443e0a4cafe',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Alumbrado Cocina Central ',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T15:29:15.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e589-75cd-89a5-ee1acb079604');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e61a-7343-997f-d38952b2b857',
    89,
    'CHN-4XE-6VR',
    '019c52d3-c286-72ba-b41b-fbb5675ebbbd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Subtotalizador',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T15:07:56.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e61a-7343-997f-d38952b2b857');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e663-76ac-b196-06c3b1eea720',
    90,
    'CHN-L9K-WSF',
    '019c52d3-c286-72ba-b41b-fbb5675ebbbd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Sala de maquinas',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-19T15:53:22.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e663-76ac-b196-06c3b1eea720');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e6ac-70bc-b9a3-335134cb2c61',
    91,
    'CHN-C9C-ZAT',
    '019c52d3-c286-72ba-b41b-fbb5675ebbbd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cocina',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-19T15:53:40.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e6ac-70bc-b9a3-335134cb2c61');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e73e-7232-bd6f-78b9954d5210',
    93,
    'CHN-XG2-KYA',
    '019c52d3-c286-72ba-b41b-fbb5675ebbbd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Comedor',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-19T15:54:17.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e73e-7232-bd6f-78b9954d5210');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e6f5-715c-a8aa-96bce56d6015',
    92,
    'CHN-KZH-LD9',
    '019c52d3-c286-72ba-b41b-fbb5675ebbbd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Aires Acondicinoados',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-19T15:54:02.000Z',
    '2026-02-12T17:09:04.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e6f5-715c-a8aa-96bce56d6015');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e78a-700f-9d78-fe81544d84d0',
    94,
    'CHN-KAK-GYN',
    '019c52d3-c286-72ba-b41b-fbb5675ebbbd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Camaras de frio',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-19T15:54:33.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e78a-700f-9d78-fe81544d84d0');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e7d3-739c-a7bd-0bd64e902f70',
    95,
    'CHN-ENW-7J9',
    '019c52d3-c286-72ba-b41b-fbb5675ebbbd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador Bayou (V)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2021-08-19T15:57:04.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e7d3-739c-a7bd-0bd64e902f70');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e81c-751e-ad90-38eaebc3849c',
    96,
    'CHN-2CN-FHX',
    '019c52d3-c286-72ba-b41b-fbb5675ebbbd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas Bayou (V)',
    NULL,
    901,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2021-08-19T16:04:21.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e81c-751e-ad90-38eaebc3849c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-eafc-76fc-8f3c-5d4112406134',
    106,
    'CHN-NNF-6NE',
    '019c52d3-c2d0-7181-86f4-e3cfcae00fed',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Iluminación exterior',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-13T15:09:58.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-eafc-76fc-8f3c-5d4112406134');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-eb45-721f-98c5-570480b61b37',
    107,
    'CHN-X57-KCP',
    '019c52d3-c2d0-7181-86f4-e3cfcae00fed',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'AA Comedor',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-17T16:55:10.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-eb45-721f-98c5-570480b61b37');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-eb92-7371-9bd8-3f8527d86a64',
    108,
    'CHN-XL6-SGW',
    '019c52d3-c2d0-7181-86f4-e3cfcae00fed',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Bar Alberca',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-17T16:57:54.000Z',
    '2026-02-12T17:09:06.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-eb92-7371-9bd8-3f8527d86a64');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ebe2-73b9-8d34-b4b372fdce3a',
    109,
    'CHN-KE3-TKT',
    '019c52d3-c2d0-7181-86f4-e3cfcae00fed',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Sub Cuadro Cocina',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-17T17:01:38.000Z',
    '2026-02-12T17:09:06.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ebe2-73b9-8d34-b4b372fdce3a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ec2b-734b-9a1d-b55d2c77e926',
    110,
    'CHN-6ET-56Y',
    '019c52d3-c2d0-7181-86f4-e3cfcae00fed',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Sub Cuadro Teatro',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-17T17:03:25.000Z',
    '2026-02-12T17:09:06.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ec2b-734b-9a1d-b55d2c77e926');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ec74-76be-bb98-4db9c5d3e9e3',
    111,
    'CHN-WCL-A65',
    '019c52d3-c2d0-7181-86f4-e3cfcae00fed',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Steak House',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-17T17:04:37.000Z',
    '2026-02-12T17:09:06.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ec74-76be-bb98-4db9c5d3e9e3');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-eab2-702e-a03d-c2b2c097d7a5',
    105,
    'CHN-NXW-QMW',
    '019c52d3-c2d0-7181-86f4-e3cfcae00fed',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas Steak House (V)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2024-07-24T16:38:38.000Z',
    NULL,
    true,
    '2021-08-17T17:09:47.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-eab2-702e-a03d-c2b2c097d7a5');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ef21-7400-9d73-29e4e31ce6f7',
    120,
    'CHN-J64-C4Q',
    '019c52d3-c31f-708f-83f3-94bcb934dcaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Ejecutivos',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T15:12:10.000Z',
    '2026-02-12T17:09:06.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ef21-7400-9d73-29e4e31ce6f7');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ef6a-775c-9c58-fba7b900a755',
    121,
    'CHN-77G-Y52',
    '019c52d3-c31f-708f-83f3-94bcb934dcaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Edificio Ejecutivos',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-20T01:30:22.000Z',
    '2026-02-12T17:09:07.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ef6a-775c-9c58-fba7b900a755');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-efb2-7293-aa34-5d953d1cf49b',
    122,
    'CHN-A3W-E4L',
    '019c52d3-c31f-708f-83f3-94bcb934dcaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'No identificado 1',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-20T01:32:04.000Z',
    '2026-02-12T17:09:07.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-efb2-7293-aa34-5d953d1cf49b');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-effb-7671-a0cb-776c25898f57',
    123,
    'CHN-3ML-VPD',
    '019c52d3-c31f-708f-83f3-94bcb934dcaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'No identificado 2',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-20T01:32:18.000Z',
    '2026-02-12T17:09:07.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-effb-7671-a0cb-776c25898f57');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f045-72d8-a422-3f64f827784b',
    124,
    'CHN-YZ6-4MP',
    '019c52d3-c31f-708f-83f3-94bcb934dcaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'No identificado 3',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-20T01:32:32.000Z',
    '2026-02-12T17:09:07.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f045-72d8-a422-3f64f827784b');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f08f-750f-9db1-b4a345aea9c3',
    125,
    'CHN-APZ-ZE3',
    '019c52d3-c31f-708f-83f3-94bcb934dcaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Iluminacion y Tomacorrientes',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-20T01:33:30.000Z',
    '2026-02-12T17:09:07.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f08f-750f-9db1-b4a345aea9c3');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f0d8-70a8-89a6-15a741dfccb8',
    126,
    'CHN-6KY-VNW',
    '019c52d3-c31f-708f-83f3-94bcb934dcaa',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas (V)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2021-08-20T01:34:42.000Z',
    '2026-02-12T17:09:07.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f0d8-70a8-89a6-15a741dfccb8');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f1fc-76df-8928-d621081712d9',
    130,
    'CHN-S3V-USZ',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura consgina',
    NULL,
    1,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:40:24.000Z',
    '2026-02-12T17:09:07.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f1fc-76df-8928-d621081712d9');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f1b3-7569-99c0-8040c69ab726',
    129,
    'CHN-TX3-PNG',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Energia',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-19T15:18:59.000Z',
    '2026-02-12T17:09:07.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f1b3-7569-99c0-8040c69ab726');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f246-7689-bde6-5980cb7d7436',
    131,
    'CHN-FDK-7YD',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura del refrigerante en el evaporador',
    NULL,
    2,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:07.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f246-7689-bde6-5980cb7d7436');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f293-70cd-bc05-05803e5ff924',
    132,
    'CHN-GMQ-3EQ',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura del refrigerante en el condensador',
    NULL,
    3,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:07.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f293-70cd-bc05-05803e5ff924');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f2dc-751e-829a-ae8ad21bd572',
    133,
    'CHN-P5D-2WS',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura entrada agua evaporador',
    NULL,
    4,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:07.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f2dc-751e-829a-ae8ad21bd572');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f326-7456-bae3-0ae5605bf997',
    134,
    'CHN-9FS-ADW',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura entrada agua condensador',
    NULL,
    5,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f326-7456-bae3-0ae5605bf997');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f36f-710a-8374-cfaa85f65284',
    135,
    'CHN-TY5-NP2',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura salida agua evaporador',
    NULL,
    6,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f36f-710a-8374-cfaa85f65284');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f3b8-77df-a67d-1fb84354b3fc',
    136,
    'CHN-E3M-DNT',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura salida agua condensador',
    NULL,
    7,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f3b8-77df-a67d-1fb84354b3fc');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f401-7294-be08-4071d81de908',
    137,
    'CHN-M5X-H7Y',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura del aceite en el compresor',
    NULL,
    8,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f401-7294-be08-4071d81de908');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f44a-73a8-aa70-c3cd96868b24',
    138,
    'CHN-D5S-JGV',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Carga del chiller',
    NULL,
    9,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:09.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f44a-73a8-aa70-c3cd96868b24');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f494-7498-b701-3e0eb579bd37',
    139,
    'CHN-QA9-JXZ',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Encendidos desde commissioning',
    NULL,
    10,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:09.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f494-7498-b701-3e0eb579bd37');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f4dd-754c-a38a-e8315d4db554',
    140,
    'CHN-CJF-GU6',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Presión del refrigerante en el condensador',
    NULL,
    11,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:09.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f4dd-754c-a38a-e8315d4db554');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f526-7138-9443-0ab916974175',
    141,
    'CHN-SUK-XKX',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Presión del aceite del compresor',
    NULL,
    12,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:09.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f526-7138-9443-0ab916974175');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f570-76db-a84b-72d529e8ba4c',
    142,
    'CHN-65W-HMD',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Tiempo que lleva encendido',
    NULL,
    13,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:09.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f570-76db-a84b-72d529e8ba4c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f5b9-77b9-8058-822682bc1b55',
    143,
    'CHN-MUV-U4P',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Consumo de Amperios relativo de la fase R con respecto al nominal',
    NULL,
    14,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:09.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f5b9-77b9-8058-822682bc1b55');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f602-75a5-9ea7-78be1ba4e5c3',
    144,
    'CHN-29L-RLD',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Consumo de Amperios relativo de la fase S del chiller 4',
    NULL,
    15,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:09.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f602-75a5-9ea7-78be1ba4e5c3');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f64b-73a9-aaa7-0b76ff3d0375',
    145,
    'CHN-HTU-KZP',
    '019c52d3-c36a-743c-8e7e-c71a82ce31a3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Consumo de Amperios relativo de la fase T con respecto al nominal del chiller 4',
    NULL,
    16,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:09.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f64b-73a9-aaa7-0b76ff3d0375');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f6e5-729a-8779-dd5764d1862c',
    147,
    'CHN-MST-AFM',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura consgina',
    NULL,
    1,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:40:24.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f6e5-729a-8779-dd5764d1862c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f694-7543-9814-22f7a660fc37',
    146,
    'CHN-THE-N4G',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Energia',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-19T15:18:59.000Z',
    '2026-02-12T17:09:08.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f694-7543-9814-22f7a660fc37');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f73e-75aa-8fa2-c79f86c0d778',
    148,
    'CHN-XMT-PA2',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura del refrigerante en el evaporador',
    NULL,
    2,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:09.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f73e-75aa-8fa2-c79f86c0d778');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f788-74ed-a3e0-b4a8ee30ba3c',
    149,
    'CHN-RR5-HSG',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura del refrigerante en el condensador',
    NULL,
    3,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:09.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f788-74ed-a3e0-b4a8ee30ba3c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f7d2-74f8-8d60-4229ea9ad69c',
    150,
    'CHN-AKH-GLX',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura entrada agua evaporador',
    NULL,
    4,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:09.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f7d2-74f8-8d60-4229ea9ad69c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f81e-75b7-b315-8cd914e0e3b2',
    151,
    'CHN-RF3-RSD',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura entrada agua condensador',
    NULL,
    5,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:09.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f81e-75b7-b315-8cd914e0e3b2');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f866-7769-9659-9cce50bc1719',
    152,
    'CHN-D2F-J3H',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura salida agua evaporador',
    NULL,
    6,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:09.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f866-7769-9659-9cce50bc1719');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f8b5-74a7-9bef-34c0f3495807',
    153,
    'CHN-NZ6-R9L',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura salida agua condensador',
    NULL,
    7,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:09.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f8b5-74a7-9bef-34c0f3495807');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f8fe-728f-b580-d78a80079c5e',
    154,
    'CHN-VAJ-SJA',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura del aceite en el compresor',
    NULL,
    8,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:09.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f8fe-728f-b580-d78a80079c5e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f94a-7411-b14e-3d9b04d382b1',
    155,
    'CHN-479-Y7F',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Carga del chiller',
    NULL,
    9,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:27.000Z',
    '2026-02-12T17:09:09.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f94a-7411-b14e-3d9b04d382b1');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f993-70b4-8c7a-9059e449a1fb',
    156,
    'CHN-N2G-JTW',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Encendidos desde commissioning',
    NULL,
    10,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:27.000Z',
    '2026-02-12T17:09:09.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f993-70b4-8c7a-9059e449a1fb');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f9dd-7459-b4c2-b2f4b5f64d1f',
    157,
    'CHN-D4T-4FN',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Presión del refrigerante en el condensador',
    NULL,
    11,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:27.000Z',
    '2026-02-12T17:09:09.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f9dd-7459-b4c2-b2f4b5f64d1f');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fa27-7589-b6ac-8a1ee95a1725',
    158,
    'CHN-WWH-J6F',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Presión del aceite del compresor',
    NULL,
    12,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:27.000Z',
    '2026-02-12T17:09:09.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fa27-7589-b6ac-8a1ee95a1725');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fa70-746a-9282-8ec9300c6987',
    159,
    'CHN-ZG7-X47',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Tiempo que lleva encendido',
    NULL,
    13,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:27.000Z',
    '2026-02-12T17:09:09.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fa70-746a-9282-8ec9300c6987');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fab9-763e-b04a-63f6cce82e20',
    160,
    'CHN-TDE-C4J',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Consumo de Amperios relativo de la fase R con respecto al nominal',
    NULL,
    14,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:27.000Z',
    '2026-02-12T17:09:09.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fab9-763e-b04a-63f6cce82e20');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fb02-726e-8239-1acdd660f89a',
    161,
    'CHN-HH6-362',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Consumo de Amperios relativo de la fase S del chiller 4',
    NULL,
    15,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:27.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fb02-726e-8239-1acdd660f89a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fb4a-75bf-93a7-5fe98985cc3a',
    162,
    'CHN-LDA-TMD',
    '019c52d3-c3b3-714d-9fb7-f1335eccee4e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Consumo de Amperios relativo de la fase T con respecto al nominal del chiller 4',
    NULL,
    16,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:27.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fb4a-75bf-93a7-5fe98985cc3a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fb93-731c-94d8-317e18098125',
    163,
    'CHN-HK4-CNW',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Energia',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-19T15:18:59.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fb93-731c-94d8-317e18098125');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fbdc-76a8-b27f-cab204f71613',
    164,
    'CHN-C36-AXM',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura consgina',
    NULL,
    1,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:40:24.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fbdc-76a8-b27f-cab204f71613');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fc25-7422-bcd4-3a093827c1ea',
    165,
    'CHN-WWA-2FR',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura del refrigerante en el evaporador',
    NULL,
    2,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fc25-7422-bcd4-3a093827c1ea');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fc6f-77dd-ac9c-9bfc2fb89fcc',
    166,
    'CHN-PVC-QUG',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura del refrigerante en el condensador',
    NULL,
    3,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fc6f-77dd-ac9c-9bfc2fb89fcc');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fcba-704e-bdbe-6407c4bdbd3a',
    167,
    'CHN-SLX-MJR',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura entrada agua evaporador',
    NULL,
    4,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fcba-704e-bdbe-6407c4bdbd3a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fd03-7758-99af-7e98982936c6',
    168,
    'CHN-ZZU-C9A',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura entrada agua condensador',
    NULL,
    5,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fd03-7758-99af-7e98982936c6');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fd4f-731f-a089-fc3df2a6e410',
    169,
    'CHN-LD5-UY4',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura salida agua evaporador',
    NULL,
    6,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fd4f-731f-a089-fc3df2a6e410');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fd99-767b-85a4-7641e9a07ad4',
    170,
    'CHN-LRW-QTE',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura salida agua condensador',
    NULL,
    7,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fd99-767b-85a4-7641e9a07ad4');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fde2-728e-870d-74242242f8bd',
    171,
    'CHN-U35-JCC',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura del aceite en el compresor',
    NULL,
    8,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fde2-728e-870d-74242242f8bd');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fe2b-70eb-b0c7-2c78ec896268',
    172,
    'CHN-XJ3-ZJL',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Carga del chiller',
    NULL,
    9,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:48.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fe2b-70eb-b0c7-2c78ec896268');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-fe74-72e3-b4de-0b7b5141c412',
    173,
    'CHN-M25-PWE',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Encendidos desde commissioning',
    NULL,
    10,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:48.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-fe74-72e3-b4de-0b7b5141c412');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-febd-72ed-b3dd-d3ea66ae716e',
    174,
    'CHN-7JM-7H2',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Presión del refrigerante en el condensador',
    NULL,
    11,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:48.000Z',
    '2026-02-12T17:09:10.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-febd-72ed-b3dd-d3ea66ae716e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ff06-74d7-9c1f-85864ace8c68',
    175,
    'CHN-9Z3-XXM',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Presión del aceite del compresor',
    NULL,
    12,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:48.000Z',
    '2026-02-12T17:09:11.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ff06-74d7-9c1f-85864ace8c68');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ff51-73f1-bfee-17c5376f2f75',
    176,
    'CHN-K3A-9K3',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Tiempo que lleva encendido',
    NULL,
    13,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:48.000Z',
    '2026-02-12T17:09:11.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ff51-73f1-bfee-17c5376f2f75');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ff9c-71ca-844a-c7d3c543bf74',
    177,
    'CHN-922-SR9',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Consumo de Amperios relativo de la fase R con respecto al nominal',
    NULL,
    14,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:48.000Z',
    '2026-02-12T17:09:11.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ff9c-71ca-844a-c7d3c543bf74');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ffe8-7080-8349-c9f74780e29f',
    178,
    'CHN-XCH-95D',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Consumo de Amperios relativo de la fase S del chiller 4',
    NULL,
    15,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:48.000Z',
    '2026-02-12T17:09:11.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ffe8-7080-8349-c9f74780e29f');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0032-7578-8555-a6a698562e6a',
    179,
    'CHN-2HJ-LSK',
    '019c52d3-c3fd-74bf-a2b3-293fbf49f58c',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Consumo de Amperios relativo de la fase T con respecto al nominal del chiller 4',
    NULL,
    16,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:11.000Z',
    NULL,
    true,
    '2022-01-20T16:35:48.000Z',
    '2026-02-12T17:09:11.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0032-7578-8555-a6a698562e6a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-00c9-75fc-b053-07cefc05d179',
    181,
    'CHN-QQC-D5Y',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura consgina',
    NULL,
    1,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T15:40:24.000Z',
    '2026-02-12T17:09:11.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-00c9-75fc-b053-07cefc05d179');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-007b-76d7-9067-7afe5c4d6365',
    180,
    'CHN-2GS-V44',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Energia',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-19T15:18:59.000Z',
    '2026-02-12T17:09:11.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-007b-76d7-9067-7afe5c4d6365');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0113-7673-8872-5da04432e3ff',
    182,
    'CHN-2SV-JK7',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura del refrigerante en el evaporador',
    NULL,
    2,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:11.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0113-7673-8872-5da04432e3ff');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0160-72f5-9f76-26228e8b9af7',
    183,
    'CHN-JC3-5F2',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura del refrigerante en el condensador',
    NULL,
    3,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:11.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0160-72f5-9f76-26228e8b9af7');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-01a9-72bb-a769-be6f4290600d',
    184,
    'CHN-J9A-V2A',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura entrada agua evaporador',
    NULL,
    4,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:11.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-01a9-72bb-a769-be6f4290600d');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-01f3-70df-bc97-5841e69f6a64',
    185,
    'CHN-3HQ-HZJ',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura entrada agua condensador',
    NULL,
    5,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:11.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-01f3-70df-bc97-5841e69f6a64');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-023f-76c4-b877-e883f1d032ac',
    186,
    'CHN-NRU-XJK',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura salida agua evaporador',
    NULL,
    6,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:11.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-023f-76c4-b877-e883f1d032ac');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0288-77e8-acbe-93f1278b653d',
    187,
    'CHN-WYN-J75',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura salida agua condensador',
    NULL,
    7,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:11.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0288-77e8-acbe-93f1278b653d');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-02d0-766e-a184-d74cb2ee9731',
    188,
    'CHN-YXT-PJC',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Temperatura del aceite en el compresor',
    NULL,
    8,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T15:43:21.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-02d0-766e-a184-d74cb2ee9731');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-031b-775c-93a6-a377ab014d54',
    189,
    'CHN-H6Q-VAL',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Carga del chiller',
    NULL,
    9,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T16:36:03.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-031b-775c-93a6-a377ab014d54');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0364-7301-b252-b2524cc8223a',
    190,
    'CHN-KJ9-327',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Encendidos desde commissioning',
    NULL,
    10,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T16:36:03.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0364-7301-b252-b2524cc8223a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-03ae-762c-b8e5-1904f7c249ea',
    191,
    'CHN-9N7-XVC',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Presión del refrigerante en el condensador',
    NULL,
    11,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T16:36:03.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-03ae-762c-b8e5-1904f7c249ea');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-03f8-7118-ba33-47a823016f08',
    192,
    'CHN-NT7-LHX',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Presión del aceite del compresor',
    NULL,
    12,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T16:36:03.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-03f8-7118-ba33-47a823016f08');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0441-7697-b712-b8d5a5a60803',
    193,
    'CHN-MT7-H4K',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Tiempo que lleva encendido',
    NULL,
    13,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T16:36:03.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0441-7697-b712-b8d5a5a60803');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-048a-711b-9c12-6d285b611584',
    194,
    'CHN-FK9-5RR',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Consumo de Amperios relativo de la fase R con respecto al nominal',
    NULL,
    14,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T16:36:03.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-048a-711b-9c12-6d285b611584');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-04d3-776c-8372-62a98b5ea179',
    195,
    'CHN-74G-UZM',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Consumo de Amperios relativo de la fase S del chiller 4',
    NULL,
    15,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T16:36:03.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-04d3-776c-8372-62a98b5ea179');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-051c-7189-8a07-e83ef1bb608c',
    196,
    'CHN-3KL-XN9',
    '019c52d3-c447-701c-abe6-060018944fa5',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Consumo de Amperios relativo de la fase T con respecto al nominal del chiller 4',
    NULL,
    16,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-11T14:40:12.000Z',
    NULL,
    true,
    '2022-01-20T16:36:03.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-051c-7189-8a07-e83ef1bb608c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-056a-7060-a05a-2ef5a7c7143f',
    197,
    'CHN-RWS-C3H',
    '019c52d3-c490-735d-97c4-e5be9a99dc31',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Piscina Familiar Parque Acuático',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-056a-7060-a05a-2ef5a7c7143f');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-05b4-725d-a896-679518d495e4',
    198,
    'CHN-9CG-H5K',
    '019c52d3-c490-735d-97c4-e5be9a99dc31',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cocina Parque Acuático',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-05b4-725d-a896-679518d495e4');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-05fd-75ed-8484-40aab487cb4d',
    199,
    'CHN-F74-CEL',
    '019c52d3-c490-735d-97c4-e5be9a99dc31',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Coffe Shop y Sport Bar',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-05fd-75ed-8484-40aab487cb4d');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0647-700a-84ef-04d381b3d389',
    200,
    'CHN-GJL-X43',
    '019c52d3-c490-735d-97c4-e5be9a99dc31',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador PARQUE ACUÁTICO',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0647-700a-84ef-04d381b3d389');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0690-7590-9977-f5fb0b82fbe2',
    201,
    'CHN-TEX-XQV',
    '019c52d3-c490-735d-97c4-e5be9a99dc31',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Kids Club, Tiendas, Consultorio Medico y GYM',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:12.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0690-7590-9977-f5fb0b82fbe2');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-06d9-7258-9847-6285cc102b05',
    202,
    'CHN-P6N-NKL',
    '019c52d3-c490-735d-97c4-e5be9a99dc31',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Plaza Eventos',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:13.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-06d9-7258-9847-6285cc102b05');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0722-730b-8687-3b1edace1362',
    203,
    'CHN-92G-E7S',
    '019c52d3-c490-735d-97c4-e5be9a99dc31',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas-Bombas Piscinas, Farolas Avenida de ingreso (Virtual)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2022-04-05T14:47:34.000Z',
    '2026-02-12T17:09:13.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0722-730b-8687-3b1edace1362');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-07b6-772c-a7a3-aa88b3528175',
    205,
    'CHN-2YR-PRL',
    '019c52d3-c4dc-7550-9b87-9125f59922ac',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Ejecutivos',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:02.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:13.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-07b6-772c-a7a3-aa88b3528175');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-07ff-7189-b9ee-db2d03dec95e',
    206,
    'CHN-ZYY-ZMY',
    '019c52d3-c4dc-7550-9b87-9125f59922ac',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Equipos Lavandería',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:02.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:13.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-07ff-7189-b9ee-db2d03dec95e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-084a-746c-9b69-03d88ac3a8f7',
    207,
    'CHN-MZR-C56',
    '019c52d3-c4dc-7550-9b87-9125f59922ac',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Servicios Generales para Operaciones',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:02.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:13.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-084a-746c-9b69-03d88ac3a8f7');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-08e3-7518-80de-e3638b807c55',
    208,
    'CHN-YLZ-PQ9',
    '019c52d3-c4dc-7550-9b87-9125f59922ac',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Grupo Presión',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:02.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:13.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-08e3-7518-80de-e3638b807c55');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-092d-7619-8b6c-744195ceae84',
    209,
    'CHN-GJS-GHC',
    '019c52d3-c4dc-7550-9b87-9125f59922ac',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Alojamientos y Zona Puerta Principal (Per.Trop)',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:02.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:13.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-092d-7619-8b6c-744195ceae84');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0976-7657-a31f-9b66b986e82c',
    210,
    'CHN-RMK-JLC',
    '019c52d3-c4dc-7550-9b87-9125f59922ac',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador Lavandería',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:02.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:13.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0976-7657-a31f-9b66b986e82c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-076b-773c-baad-64f7570e8a9b',
    204,
    'CHN-RP9-C92',
    '019c52d3-c4dc-7550-9b87-9125f59922ac',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas-SSGG poco consumo (Virtual)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    NULL,
    NULL,
    true,
    '2022-04-05T14:56:10.000Z',
    '2026-02-12T17:09:13.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-076b-773c-baad-64f7570e8a9b');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0af9-76b9-9727-b7f9742d3c3e',
    215,
    'CHN-W6Y-574',
    '019c52d3-c526-723a-9513-58cc1da65c97',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Iluminación Planta industrial',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0af9-76b9-9727-b7f9742d3c3e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0b44-7239-a985-4579c5930f89',
    216,
    'CHN-JKC-6V6',
    '019c52d3-c526-723a-9513-58cc1da65c97',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Bombas de recirculación primaria caldera',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0b44-7239-a985-4579c5930f89');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0b8d-74bf-adf1-18d66704c8a4',
    217,
    'CHN-YL2-RAR',
    '019c52d3-c526-723a-9513-58cc1da65c97',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'TOTALIZADOR TABLERO 2 (208V)',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0b8d-74bf-adf1-18d66704c8a4');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0bd8-76e8-a106-2ca736064916',
    218,
    'CHN-XMZ-GUG',
    '019c52d3-c526-723a-9513-58cc1da65c97',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Alojamiento edificio 3 y SSGG Empleados',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0bd8-76e8-a106-2ca736064916');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0c21-74a7-948c-a272468be572',
    219,
    'CHN-U2C-GQ9',
    '019c52d3-c526-723a-9513-58cc1da65c97',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Bombas de recirculación secundaria agua caliente',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0c21-74a7-948c-a272468be572');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0c6a-747c-ad6a-837a7fa971f7',
    220,
    'CHN-K52-N5N',
    '019c52d3-c526-723a-9513-58cc1da65c97',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Osmosis Planta',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0c6a-747c-ad6a-837a7fa971f7');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0cb3-72a8-9972-db3a19209b04',
    221,
    'CHN-G67-MXX',
    '019c52d3-c526-723a-9513-58cc1da65c97',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas-SSGG, control Grupo Electrógeno (Virtual)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2022-04-05T15:10:10.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0cb3-72a8-9972-db3a19209b04');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0f04-764a-860b-be11a736913f',
    229,
    'CHN-FEM-RPA',
    '019c52d3-c570-742e-bbbd-ea2200ef8a22',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Roof Top 1 Steak House',
    'Antes Tex Mex',
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-12-05T16:09:30.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:15.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0f04-764a-860b-be11a736913f');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0f4d-7503-bd60-6446d2c21cb2',
    230,
    'CHN-VPV-Q6A',
    '019c52d3-c570-742e-bbbd-ea2200ef8a22',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Roof Top 2 Steak House',
    'Antes Tex Mex',
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-12-05T16:09:30.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:15.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0f4d-7503-bd60-6446d2c21cb2');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0f96-76e4-958d-31bf4faeb36f',
    231,
    'CHN-26D-J47',
    '019c52d3-c570-742e-bbbd-ea2200ef8a22',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Roof Top 3 Steak House',
    'Antes Tex Mex',
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-12-05T16:09:30.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:15.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0f96-76e4-958d-31bf4faeb36f');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0fdf-72b8-9aef-56e0b8fe22fc',
    232,
    'CHN-V4D-5DQ',
    '019c52d3-c570-742e-bbbd-ea2200ef8a22',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cámara de Refrigeración Steak House',
    'Antes Tex Mex',
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-12-05T16:09:30.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:15.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0fdf-72b8-9aef-56e0b8fe22fc');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1028-70da-9baf-708e0807516d',
    233,
    'CHN-XXJ-DHU',
    '019c52d3-c570-742e-bbbd-ea2200ef8a22',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cocina, Restaurant y Bar Steak House',
    'Antes Tex Mex',
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-12-05T16:09:30.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:15.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1028-70da-9baf-708e0807516d');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1072-7690-ac30-33b931a6e43f',
    234,
    'CHN-Q3C-GUE',
    '019c52d3-c570-742e-bbbd-ea2200ef8a22',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador Steak House',
    'Antes Tex-Mex',
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-12-05T16:09:30.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:15.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1072-7690-ac30-33b931a6e43f');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-10bb-729d-8842-41609424ffb3',
    235,
    'CHN-63G-JNG',
    '019c52d3-c570-742e-bbbd-ea2200ef8a22',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas-Edificios (03), Bombas Piscina Playa (Virtual)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    NULL,
    NULL,
    true,
    '2022-04-05T14:12:33.000Z',
    '2026-02-12T17:09:15.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-10bb-729d-8842-41609424ffb3');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1105-71fa-b6fc-6a8e6572f0f2',
    236,
    'CHN-2N6-JYW',
    '019c52d3-c5ba-71bf-82fb-b9da4e031188',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Roof Top 1 y 2 Japonés',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:56.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:15.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1105-71fa-b6fc-6a8e6572f0f2');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1156-73af-9e74-282a73acdf00',
    237,
    'CHN-9DZ-HJU',
    '019c52d3-c5ba-71bf-82fb-b9da4e031188',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Roof Top 1 Italiano',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:56.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:15.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1156-73af-9e74-282a73acdf00');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-11a7-709b-a5be-4e3c9a19f347',
    238,
    'CHN-USL-6V6',
    '019c52d3-c5ba-71bf-82fb-b9da4e031188',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Roof Top 2 Italiano',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:56.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:15.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-11a7-709b-a5be-4e3c9a19f347');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-11f0-7709-b466-c9c3eeb10089',
    239,
    'CHN-N2X-6Q9',
    '019c52d3-c5ba-71bf-82fb-b9da4e031188',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Equipos de refrigeración',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:56.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:15.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-11f0-7709-b466-c9c3eeb10089');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1238-76cd-82c9-ea92eae718ea',
    240,
    'CHN-PV5-P62',
    '019c52d3-c5ba-71bf-82fb-b9da4e031188',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador Temáticos ',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:56.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:15.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1238-76cd-82c9-ea92eae718ea');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1283-7498-99af-dd085e3f2f79',
    241,
    'CHN-ZPN-PD4',
    '019c52d3-c5ba-71bf-82fb-b9da4e031188',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador SPA',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:56.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1283-7498-99af-dd085e3f2f79');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-12ce-71b4-8772-bebaed43b1e9',
    242,
    'CHN-2V5-AUC',
    '019c52d3-c5ba-71bf-82fb-b9da4e031188',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas-Cocina Japonés e Italiano, SSGG (Virtual)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2022-04-05T14:20:26.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-12ce-71b4-8772-bebaed43b1e9');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1318-730e-8830-e7180bf3da05',
    243,
    'CHN-X37-7JX',
    '019c52d3-c603-757b-95fc-5f623c675100',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cocina 1 Macao',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:03.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1318-730e-8830-e7180bf3da05');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1360-7388-9e1c-94d03517142d',
    244,
    'CHN-WYF-C3N',
    '019c52d3-c603-757b-95fc-5f623c675100',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cocina 2 Macao',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:03.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1360-7388-9e1c-94d03517142d');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-13aa-766d-99c6-797e5dc9a0ad',
    245,
    'CHN-2YQ-QQC',
    '019c52d3-c603-757b-95fc-5f623c675100',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Discoteca',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:03.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-13aa-766d-99c6-797e5dc9a0ad');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-13f3-7199-81bd-1bacdb696db0',
    246,
    'CHN-S4H-JJQ',
    '019c52d3-c603-757b-95fc-5f623c675100',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cámara 1',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:03.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-13f3-7199-81bd-1bacdb696db0');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-143d-706e-95ac-da9077916231',
    247,
    'CHN-MUT-PVF',
    '019c52d3-c603-757b-95fc-5f623c675100',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cámara 2',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:03.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-143d-706e-95ac-da9077916231');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1485-7558-952f-d02937ab950c',
    248,
    'CHN-YNS-PSL',
    '019c52d3-c603-757b-95fc-5f623c675100',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador Cocotal',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:03.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1485-7558-952f-d02937ab950c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1517-721a-8970-50a0eb73d616',
    250,
    'CHN-TQR-Y9G',
    '019c52d3-c64d-715e-8013-178a880c9011',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Teatro',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-06-19T16:31:31.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1517-721a-8970-50a0eb73d616');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1561-75ea-80aa-5272670cdf9f',
    251,
    'CHN-5SX-UGG',
    '019c52d3-c64d-715e-8013-178a880c9011',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Equipos Buffet 1 Macao',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-06-19T16:31:31.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1561-75ea-80aa-5272670cdf9f');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-15aa-7720-a624-febf05e4816c',
    252,
    'CHN-XJU-QMP',
    '019c52d3-c64d-715e-8013-178a880c9011',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Equipos Buffet 2 Macao',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-06-19T16:31:31.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-15aa-7720-a624-febf05e4816c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-15f4-76ed-ab39-505eae65b668',
    253,
    'CHN-SS7-94C',
    '019c52d3-c64d-715e-8013-178a880c9011',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Oficinas Administrativa',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-06-19T16:31:31.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-15f4-76ed-ab39-505eae65b668');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-163d-770e-b0dc-d5ea76cd6f69',
    254,
    'CHN-2XA-SUS',
    '019c52d3-c64d-715e-8013-178a880c9011',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cámara 3 Principal Hotel',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-06-19T16:31:31.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-163d-770e-b0dc-d5ea76cd6f69');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1686-7529-859b-567947dc372e',
    255,
    'CHN-XDA-JW2',
    '019c52d3-c64d-715e-8013-178a880c9011',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cámara Economato, Bar lobby',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-06-19T16:31:31.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:17.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1686-7529-859b-567947dc372e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-14ce-767a-a43f-93828f68ec65',
    249,
    'CHN-NYZ-GJ4',
    '019c52d3-c64d-715e-8013-178a880c9011',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas-Edificios (01), Comedor Ejecutivo y SSGG(Virtual)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2024-11-08T23:18:34.000Z',
    NULL,
    true,
    '2022-04-05T14:31:50.000Z',
    '2026-02-12T17:09:16.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-14ce-767a-a43f-93828f68ec65');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-16cf-77ee-b39d-c40a6ebd4319',
    256,
    'CHN-FZD-9ER',
    '019c52d3-c69c-7749-8e16-bee1f4ebf585',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cocina Saona 1',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:04.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:17.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-16cf-77ee-b39d-c40a6ebd4319');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-171a-73da-b86f-42e676fbdb7b',
    257,
    'CHN-UDT-YD9',
    '019c52d3-c69c-7749-8e16-bee1f4ebf585',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Lobby',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:04.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:17.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-171a-73da-b86f-42e676fbdb7b');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-176d-7334-8698-93519975e01f',
    258,
    'CHN-Z5K-H7A',
    '019c52d3-c69c-7749-8e16-bee1f4ebf585',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Manejadora Saona',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:04.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:17.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-176d-7334-8698-93519975e01f');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-17b7-7238-b720-4c5cba6618e8',
    259,
    'CHN-HDD-4EY',
    '019c52d3-c69c-7749-8e16-bee1f4ebf585',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cocina Saona 2',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:04.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:17.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-17b7-7238-b720-4c5cba6618e8');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1800-762b-af32-a3752e55a693',
    260,
    'CHN-GW2-DTH',
    '019c52d3-c69c-7749-8e16-bee1f4ebf585',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cocina 2',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:04.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:17.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1800-762b-af32-a3752e55a693');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1848-7379-9d8f-8671f5b340fd',
    261,
    'CHN-CUC-PCR',
    '019c52d3-c69c-7749-8e16-bee1f4ebf585',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador Tropical',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:04.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:17.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1848-7379-9d8f-8671f5b340fd');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1891-755e-8c32-bdb5306f1220',
    262,
    'CHN-2QR-JMR',
    '019c52d3-c69c-7749-8e16-bee1f4ebf585',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas-Edificio 30 (Virtual)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2022-04-20T00:41:53.000Z',
    '2026-02-12T17:09:17.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1891-755e-8c32-bdb5306f1220');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-18da-77aa-acae-bd76393bcbc1',
    263,
    'CHN-HYL-DLK',
    '019c52d3-c6e6-70a2-ba1f-5776f96830ce',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cocina 3',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:17.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-18da-77aa-acae-bd76393bcbc1');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1924-70e9-b7b5-68d458405959',
    264,
    'CHN-9GH-AW6',
    '019c52d3-c6e6-70a2-ba1f-5776f96830ce',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Restaurante Rodizio',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:17.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1924-70e9-b7b5-68d458405959');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-196d-74cc-b4f1-4d00bf7a49d1',
    265,
    'CHN-E9S-D63',
    '019c52d3-c6e6-70a2-ba1f-5776f96830ce',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Bufet Saona',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:17.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-196d-74cc-b4f1-4d00bf7a49d1');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-19b7-748f-a75a-4b243c58daec',
    266,
    'CHN-NRM-KHJ',
    '019c52d3-c6e6-70a2-ba1f-5776f96830ce',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cámara de frio (Sótano)',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:17.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-19b7-748f-a75a-4b243c58daec');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-19ff-76f4-af20-b184db953c27',
    267,
    'CHN-GRT-JVY',
    '019c52d3-c6e6-70a2-ba1f-5776f96830ce',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Alimentación Saona',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:17.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-19ff-76f4-af20-b184db953c27');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1a48-767e-a606-a5c43007aaa3',
    268,
    'CHN-U66-NYM',
    '019c52d3-c6e6-70a2-ba1f-5776f96830ce',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Alimentación Exterior',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1a48-767e-a606-a5c43007aaa3');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1a92-76ea-95b5-b8ec38ff045b',
    269,
    'CHN-MN3-TML',
    '019c52d3-c731-7739-9c7b-ed5c99b0e97d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Manejadora 1  y 2 Restaurante Macao',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1a92-76ea-95b5-b8ec38ff045b');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1adc-7294-83b0-e509befaea70',
    270,
    'CHN-PAV-SRV',
    '019c52d3-c731-7739-9c7b-ed5c99b0e97d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Bar lobby',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1adc-7294-83b0-e509befaea70');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1b28-735f-9a8f-67b8ec3a19ac',
    271,
    'CHN-XXQ-9F3',
    '019c52d3-c731-7739-9c7b-ed5c99b0e97d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cámara de frio Economato',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1b28-735f-9a8f-67b8ec3a19ac');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1b71-76ce-bc26-a693f543b300',
    272,
    'CHN-M6P-UR2',
    '019c52d3-c731-7739-9c7b-ed5c99b0e97d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Manejadora 4 y 5 Buffet Macao',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1b71-76ce-bc26-a693f543b300');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1bba-750c-9510-1d97581172dc',
    273,
    'CHN-N6V-UZW',
    '019c52d3-c731-7739-9c7b-ed5c99b0e97d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Bomba de Recirculación Chillers',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1bba-750c-9510-1d97581172dc');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1c02-72d0-9b96-51457087fb2a',
    274,
    'CHN-Y4L-2L3',
    '019c52d3-c731-7739-9c7b-ed5c99b0e97d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Manejadora 3 Restaurante Frances',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1c02-72d0-9b96-51457087fb2a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1c4b-71ff-8e29-8d2ec298ebef',
    275,
    'CHN-7SM-E64',
    '019c52d3-c731-7739-9c7b-ed5c99b0e97d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador Economato y Bar Lobby',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2024-05-08T22:16:43.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1c4b-71ff-8e29-8d2ec298ebef');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1c94-7267-88d6-ea333dc52b1c',
    276,
    'CHN-TLE-E7Z',
    '019c52d3-c77b-7462-8695-b5f6e3e520e3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'TOTALIZADOR TABLERO 3 CHILLERS (480V)',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1c94-7267-88d6-ea333dc52b1c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1cdc-748c-a323-c43cad469dce',
    277,
    'CHN-Q6E-G9D',
    '019c52d3-c77b-7462-8695-b5f6e3e520e3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Chiller 1',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1cdc-748c-a323-c43cad469dce');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1d25-7098-96c8-cc1acc81aafc',
    278,
    'CHN-U6K-VM3',
    '019c52d3-c77b-7462-8695-b5f6e3e520e3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Chiller 3',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1d25-7098-96c8-cc1acc81aafc');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1d72-7159-86af-bb29e9f1fb33',
    279,
    'CHN-AK2-2AG',
    '019c52d3-c77b-7462-8695-b5f6e3e520e3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'TOTALIZADOR TABLERO 5 CHILLERS (480V)',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1d72-7159-86af-bb29e9f1fb33');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1dbb-749f-9256-9a99f2970cea',
    280,
    'CHN-DPT-5KA',
    '019c52d3-c77b-7462-8695-b5f6e3e520e3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Chiller 4',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1dbb-749f-9256-9a99f2970cea');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1e04-7068-84dc-1288c64b6ec9',
    281,
    'CHN-DCK-CEA',
    '019c52d3-c77b-7462-8695-b5f6e3e520e3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Osmosis y Bombas recirculación agua helada',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:59.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:18.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1e04-7068-84dc-1288c64b6ec9');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1e4c-745f-af7b-37213afbf42c',
    282,
    'CHN-KJA-TXD',
    '019c52d3-c77b-7462-8695-b5f6e3e520e3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas-Torres de enfriamiento, bombas Chillers (Virtual)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2022-04-20T01:22:49.000Z',
    '2026-02-12T17:09:19.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1e4c-745f-af7b-37213afbf42c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0a5b-704f-9978-4bebec44e62c',
    213,
    'CHN-5YQ-GYA',
    '019c52d3-c7c5-741a-913c-9deb9d04872d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador Sirenis Punta Cana',
    NULL,
    257,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:02.000Z',
    NULL,
    true,
    '2022-03-29T11:33:02.000Z',
    '2026-02-12T17:09:13.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0a5b-704f-9978-4bebec44e62c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-09c2-70ca-81b8-0d2aa5f9d43a',
    211,
    'CHN-M2L-XZ6',
    '019c52d3-c7c5-741a-913c-9deb9d04872d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas Hotel: Edificios, etc. (Virtual)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-26T14:59:49.000Z',
    NULL,
    true,
    '2022-04-22T16:09:02.000Z',
    '2026-02-12T17:09:13.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-09c2-70ca-81b8-0d2aa5f9d43a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0a0b-75c1-9925-e935338aaa84',
    212,
    'CHN-NMK-6U5',
    '019c52d3-c7c5-741a-913c-9deb9d04872d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Sub Total Cargas en Medición (Virtual)',
    NULL,
    901,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2023-12-23T20:18:59.000Z',
    NULL,
    true,
    '2022-04-22T16:25:11.000Z',
    '2026-02-12T17:09:13.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0a0b-75c1-9925-e935338aaa84');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0aae-72e9-a906-64d39d14c529',
    214,
    'CHN-GQC-MD7',
    '019c52d3-c7c5-741a-913c-9deb9d04872d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador MENOS Parque acuático (V)',
    'Circuito para fines de contabilidad. Totalizador punta cana descontando consumo del SPA y del Parque Acuático',
    902,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2024-06-14T04:39:27.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0aae-72e9-a906-64d39d14c529');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1e95-7093-9ef2-e291f4f32e22',
    283,
    'CHN-ELC-9CE',
    '019c52d3-c818-750f-b276-202fd6f44ff8',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Corriente XAAC1',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2022-08-16T13:30:24.000Z',
    '2026-02-12T17:09:19.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1e95-7093-9ef2-e291f4f32e22');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1ede-731b-976a-f12d4920a992',
    284,
    'CHN-97N-5ZG',
    '019c52d3-c818-750f-b276-202fd6f44ff8',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'VFD XAAC1',
    NULL,
    1,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2022-08-16T13:29:24.000Z',
    '2026-02-12T17:09:19.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1ede-731b-976a-f12d4920a992');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1f27-73df-be05-7cbb62823104',
    285,
    'CHN-J9C-W2C',
    '019c52d3-c818-750f-b276-202fd6f44ff8',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'PID Setpoint XAAC1',
    NULL,
    2,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2022-08-16T14:03:09.000Z',
    '2026-02-12T17:09:19.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1f27-73df-be05-7cbb62823104');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1f71-76bd-9c74-356428bc788c',
    286,
    'CHN-PFE-HL2',
    '019c52d3-c818-750f-b276-202fd6f44ff8',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Frecuancia - XAAC1',
    NULL,
    3,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2023-12-29T15:03:06.000Z',
    '2026-02-12T17:09:19.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1f71-76bd-9c74-356428bc788c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-2005-75b8-9c1e-0a68103c3f83',
    288,
    'CHN-AYZ-2AA',
    '019c52d3-c862-76de-8f61-1a2241bdbdbc',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'VFD XAAC2',
    NULL,
    1,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2022-08-16T13:35:53.000Z',
    '2026-02-12T17:09:19.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-2005-75b8-9c1e-0a68103c3f83');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-1fbb-761f-b8e6-73acf129091f',
    287,
    'CHN-ZDH-V2J',
    '019c52d3-c862-76de-8f61-1a2241bdbdbc',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Corriente XAAC2',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2022-08-16T13:37:21.000Z',
    '2026-02-12T17:09:19.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-1fbb-761f-b8e6-73acf129091f');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-204e-73b9-a7bc-ecd82d9b1c0e',
    289,
    'CHN-QF2-QDT',
    '019c52d3-c862-76de-8f61-1a2241bdbdbc',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'PID Setpoint XAAC2',
    NULL,
    2,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2022-08-16T14:04:14.000Z',
    '2026-02-12T17:09:19.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-204e-73b9-a7bc-ecd82d9b1c0e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-2097-763e-964b-e69b7520cab6',
    290,
    'CHN-ZRY-RND',
    '019c52d3-c862-76de-8f61-1a2241bdbdbc',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Frecuencia - XAAC2',
    NULL,
    3,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2023-12-29T15:03:39.000Z',
    '2026-02-12T17:09:19.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-2097-763e-964b-e69b7520cab6');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-20e0-70bc-a423-27997bda5933',
    291,
    'CHN-T9Z-ZTK',
    '019c52d3-c8ac-742f-9041-9f119228fae3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Corriente LOBBY',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2022-08-16T13:40:08.000Z',
    '2026-02-12T17:09:19.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-20e0-70bc-a423-27997bda5933');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-2129-7077-9375-bb63d0517de3',
    292,
    'CHN-KD4-G6A',
    '019c52d3-c8ac-742f-9041-9f119228fae3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'VFD Lobby',
    NULL,
    1,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2022-08-16T13:39:36.000Z',
    '2026-02-12T17:09:19.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-2129-7077-9375-bb63d0517de3');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-2174-71bb-889f-22a5d1681285',
    293,
    'CHN-VQV-CDF',
    '019c52d3-c8ac-742f-9041-9f119228fae3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'PID Setpoint LOBBY',
    NULL,
    2,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2022-08-16T14:04:43.000Z',
    '2026-02-12T17:09:19.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-2174-71bb-889f-22a5d1681285');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-21bd-743c-aa52-eb1b203cd27e',
    294,
    'CHN-9EX-WT9',
    '019c52d3-c8ac-742f-9041-9f119228fae3',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Frecuencia - Lobby',
    NULL,
    3,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2023-12-29T15:04:11.000Z',
    '2026-02-12T17:09:19.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-21bd-743c-aa52-eb1b203cd27e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-2206-72db-bcd0-9ac730365c89',
    295,
    'CHN-N5X-S4Q',
    '019c52d3-c8f8-71ea-872a-3d3421769de7',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'BTU XACC-1',
    'ID MODBUS: 21',
    1,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:02.000Z',
    NULL,
    true,
    '2025-08-20T22:06:16.000Z',
    '2026-02-12T17:09:20.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-2206-72db-bcd0-9ac730365c89');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-224f-72f5-9491-78c0e6c2fa5e',
    296,
    'CHN-J33-SKP',
    '019c52d3-c8f8-71ea-872a-3d3421769de7',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'BTU XACC-2',
    'ID MODBUS: 31',
    2,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2025-08-20T22:06:46.000Z',
    '2026-02-12T17:09:20.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-224f-72f5-9491-78c0e6c2fa5e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-2297-773a-8014-7903cff94924',
    297,
    'CHN-AG6-TNZ',
    '019c52d3-c8f8-71ea-872a-3d3421769de7',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'BTU Lobby-1',
    'ID MODBUS: 32',
    3,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2025-08-20T23:11:47.000Z',
    '2026-02-12T17:09:20.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-2297-773a-8014-7903cff94924');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-22e0-73ef-811f-01d0ffda4722',
    298,
    'CHN-35Y-GKN',
    '019c52d3-c8f8-71ea-872a-3d3421769de7',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'BTU Lobby-2',
    'ID MODBUS: 11',
    4,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2025-08-20T23:12:17.000Z',
    '2026-02-12T17:09:20.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-22e0-73ef-811f-01d0ffda4722');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-232a-777a-9e2a-bbb4bfb10f93',
    299,
    'CHN-NQ5-QYN',
    '019c52d3-c8f8-71ea-872a-3d3421769de7',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'BTU Tematicos',
    'ID MODBUS: 41',
    5,
    3,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:49:06.000Z',
    NULL,
    true,
    '2025-08-20T23:12:53.000Z',
    '2026-02-12T17:09:20.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-232a-777a-9e2a-bbb4bfb10f93');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d525-700f-b6fb-7453bd69afcc',
    30,
    'CHN-DKF-GNM',
    '019c52d3-c943-746c-838b-baacdc401a85',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'UMA Lobby',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-11T02:04:15.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d525-700f-b6fb-7453bd69afcc');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d570-71f0-b56c-f86fc66166b5',
    31,
    'CHN-PV6-P2V',
    '019c52d3-c943-746c-838b-baacdc401a85',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Lobby Bar 1',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:15:11.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d570-71f0-b56c-f86fc66166b5');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d5ba-737d-a5d0-da59d787359e',
    32,
    'CHN-XK3-TUE',
    '019c52d3-c943-746c-838b-baacdc401a85',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Calentadora de Lavalozas',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:15:38.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d5ba-737d-a5d0-da59d787359e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d609-760f-8f05-ae0fb5ca7ad6',
    33,
    'CHN-WNN-HLT',
    '019c52d3-c943-746c-838b-baacdc401a85',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Front Desk 1',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:16:05.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d609-760f-8f05-ae0fb5ca7ad6');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d652-70f8-b8e9-b5de0db7371d',
    34,
    'CHN-SQF-922',
    '019c52d3-c943-746c-838b-baacdc401a85',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Front Desk 2',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:16:18.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d652-70f8-b8e9-b5de0db7371d');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d69c-727e-a160-3b8937069dae',
    35,
    'CHN-2KV-SWG',
    '019c52d3-c943-746c-838b-baacdc401a85',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Luces zona exterior',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:16:38.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d69c-727e-a160-3b8937069dae');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d6e5-71ce-94c0-09ef974b5428',
    36,
    'CHN-KM2-VWU',
    '019c52d3-c943-746c-838b-baacdc401a85',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Torre de Enfriamiento',
    NULL,
    257,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:06.000Z',
    NULL,
    true,
    '2021-08-21T20:14:05.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d6e5-71ce-94c0-09ef974b5428');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d72e-72ce-8631-8f792ecde34e',
    37,
    'CHN-63S-LWX',
    '019c52d3-c98e-7564-80fe-4da6db231ebd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Toma corrientes',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-13T14:46:25.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d72e-72ce-8631-8f792ecde34e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d777-726a-824d-ab20958ff55e',
    38,
    'CHN-H7M-4K5',
    '019c52d3-c98e-7564-80fe-4da6db231ebd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cuarto frio 3',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-23T18:54:46.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d777-726a-824d-ab20958ff55e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d7c1-702c-afc9-f1a2d04205c8',
    39,
    'CHN-WYZ-AJG',
    '019c52d3-c98e-7564-80fe-4da6db231ebd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Horno',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-23T18:55:04.000Z',
    '2026-02-12T17:09:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d7c1-702c-afc9-f1a2d04205c8');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d80b-74ed-afb1-d7c15eee6f77',
    40,
    'CHN-T36-6NG',
    '019c52d3-c98e-7564-80fe-4da6db231ebd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Extractor 1',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-23T18:55:30.000Z',
    '2026-02-12T17:09:01.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d80b-74ed-afb1-d7c15eee6f77');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d854-75ab-92e0-1d56758a4cd9',
    41,
    'CHN-ZSU-346',
    '019c52d3-c98e-7564-80fe-4da6db231ebd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Rebanadora',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-23T18:56:58.000Z',
    '2026-02-12T17:09:01.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d854-75ab-92e0-1d56758a4cd9');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d89d-74e0-a063-ac1db47d7d79',
    42,
    'CHN-N7A-WDG',
    '019c52d3-c98e-7564-80fe-4da6db231ebd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Luz Cuarto Frio pescados',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:51.000Z',
    NULL,
    true,
    '2021-08-23T18:57:21.000Z',
    '2026-02-12T17:09:01.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d89d-74e0-a063-ac1db47d7d79');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-d8e6-7598-b542-4ff4c44367bb',
    43,
    'CHN-22H-SMQ',
    '019c52d3-c98e-7564-80fe-4da6db231ebd',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras Cargas Cocina 2 (V)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2021-08-23T18:59:58.000Z',
    '2026-02-12T17:09:01.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-d8e6-7598-b542-4ff4c44367bb');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-db41-7038-8a96-3402b747946c',
    51,
    'CHN-HNZ-E6F',
    '019c52d3-c9d8-73dd-938b-c2670566482e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Casa Alma',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T14:50:13.000Z',
    '2026-02-12T17:09:01.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-db41-7038-8a96-3402b747946c');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-db8a-7498-8ff4-ba25210363b1',
    52,
    'CHN-VTU-3LD',
    '019c52d3-c9d8-73dd-938b-c2670566482e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Cocina',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T13:49:31.000Z',
    '2026-02-12T17:09:01.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-db8a-7498-8ff4-ba25210363b1');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-dbd2-72e0-926e-1839f8e9ecf9',
    53,
    'CHN-Z52-JAL',
    '019c52d3-c9d8-73dd-938b-c2670566482e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'HVAC + Luces y Contactos',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T13:49:55.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-dbd2-72e0-926e-1839f8e9ecf9');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-dc1b-74f6-af66-fd0cb6d8cd92',
    54,
    'CHN-DW9-PVJ',
    '019c52d3-c9d8-73dd-938b-c2670566482e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cuarto de Bombas',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T13:50:12.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-dc1b-74f6-af66-fd0cb6d8cd92');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-dc64-7495-a730-383baece74fd',
    55,
    'CHN-YAF-232',
    '019c52d3-c9d8-73dd-938b-c2670566482e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Bancada 2',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T13:50:33.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-dc64-7495-a730-383baece74fd');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-dcad-7029-a6b3-c8c849118f3d',
    56,
    'CHN-E2V-T6F',
    '019c52d3-c9d8-73dd-938b-c2670566482e',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Iluminacion y Tomacorrientes',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T13:51:08.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-dcad-7029-a6b3-c8c849118f3d');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-dcf7-76cc-8862-76efd6f89061',
    57,
    'CHN-F25-2SF',
    '019c52d3-ca23-722e-bd54-fce8a7551177',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG SPA',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:31.000Z',
    NULL,
    true,
    '2021-08-13T14:56:42.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-dcf7-76cc-8862-76efd6f89061');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-dd40-7718-87e5-52cb39ee64fb',
    58,
    'CHN-VKW-DDE',
    '019c52d3-ca23-722e-bd54-fce8a7551177',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Clima 3',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:31.000Z',
    NULL,
    true,
    '2021-08-18T01:29:17.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-dd40-7718-87e5-52cb39ee64fb');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-dd8d-7281-92f8-799f48fece84',
    59,
    'CHN-XLY-3L4',
    '019c52d3-ca23-722e-bd54-fce8a7551177',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Clima 2',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:31.000Z',
    NULL,
    true,
    '2021-08-18T01:29:33.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-dd8d-7281-92f8-799f48fece84');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ddd6-7476-9dcd-47e871266efd',
    60,
    'CHN-ST9-KL4',
    '019c52d3-ca23-722e-bd54-fce8a7551177',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Clima 1',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:31.000Z',
    NULL,
    true,
    '2021-08-18T01:29:50.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ddd6-7476-9dcd-47e871266efd');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-de1e-73ce-b75f-1a23d7bc0c91',
    61,
    'CHN-HTV-VSA',
    '019c52d3-ca23-722e-bd54-fce8a7551177',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cargas cocina',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:31.000Z',
    NULL,
    true,
    '2021-08-18T01:30:15.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-de1e-73ce-b75f-1a23d7bc0c91');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-de67-7408-a74c-ac2dca04fea2',
    62,
    'CHN-7SY-9MQ',
    '019c52d3-ca23-722e-bd54-fce8a7551177',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Gimnasio',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:31.000Z',
    NULL,
    true,
    '2021-08-18T01:30:31.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-de67-7408-a74c-ac2dca04fea2');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-deb0-75ba-b1ee-80a6bae72eb6',
    63,
    'CHN-DYU-U7S',
    '019c52d3-ca23-722e-bd54-fce8a7551177',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras cargas SPA (Bombas)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2021-08-18T01:31:16.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-deb0-75ba-b1ee-80a6bae72eb6');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-def8-752e-9fd4-6e22f6dba617',
    64,
    'CHN-YWD-TFE',
    '019c52d3-ca6c-74d9-96cd-e19f3f088846',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cuartos frios cocinas 1 y 2',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T14:57:55.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-def8-752e-9fd4-6e22f6dba617');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-df41-769c-971a-d1b0af92d1c0',
    65,
    'CHN-DYL-THU',
    '019c52d3-ca6c-74d9-96cd-e19f3f088846',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Pastelería (Cuarto frío)',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:23:58.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-df41-769c-971a-d1b0af92d1c0');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-df8a-77ef-847d-f09b8e1985e1',
    66,
    'CHN-KMK-RZW',
    '019c52d3-ca6c-74d9-96cd-e19f3f088846',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'UMA Comedor 1',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:24:24.000Z',
    '2026-02-12T17:09:02.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-df8a-77ef-847d-f09b8e1985e1');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-dfd2-753f-aad2-460718bfbdc8',
    67,
    'CHN-ACL-NEG',
    '019c52d3-ca6c-74d9-96cd-e19f3f088846',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Sala de conferencias',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:25:00.000Z',
    '2026-02-12T17:09:03.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-dfd2-753f-aad2-460718bfbdc8');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e01c-703d-9dff-ac0435e5cd73',
    68,
    'CHN-FRF-X2E',
    '019c52d3-ca6c-74d9-96cd-e19f3f088846',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'UMA Comedor 2',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:25:19.000Z',
    '2026-02-12T17:09:03.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e01c-703d-9dff-ac0435e5cd73');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e065-7238-bf86-1b692cda51f2',
    69,
    'CHN-H9W-HRX',
    '019c52d3-ca6c-74d9-96cd-e19f3f088846',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Subtotalizador Lobby',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:25:36.000Z',
    '2026-02-12T17:09:03.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e065-7238-bf86-1b692cda51f2');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e0ae-7427-adb6-e1fe08c974a4',
    70,
    'CHN-EAH-SHE',
    '019c52d3-cab8-705f-84df-d27b0e24874d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Extractor 1',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T15:04:49.000Z',
    '2026-02-12T17:09:03.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e0ae-7427-adb6-e1fe08c974a4');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e0f6-722f-a2b2-c1d9a8684bc9',
    71,
    'CHN-S2J-6RT',
    '019c52d3-cab8-705f-84df-d27b0e24874d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Horno cocina 1',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T13:54:25.000Z',
    '2026-02-12T17:09:03.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e0f6-722f-a2b2-c1d9a8684bc9');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e13f-745a-a958-40b4b9a9e007',
    72,
    'CHN-TE5-LK3',
    '019c52d3-cab8-705f-84df-d27b0e24874d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Lavaloza 1',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T13:54:45.000Z',
    '2026-02-12T17:09:03.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e13f-745a-a958-40b4b9a9e007');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e188-7449-a7c7-525450f502e9',
    73,
    'CHN-FYL-E6L',
    '019c52d3-cab8-705f-84df-d27b0e24874d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Lavaloza 2',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T13:54:59.000Z',
    '2026-02-12T17:09:03.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e188-7449-a7c7-525450f502e9');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e1d4-75b7-8c8a-5e2de045b4d4',
    74,
    'CHN-75X-RQ6',
    '019c52d3-cab8-705f-84df-d27b0e24874d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Extractor 2',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T13:55:13.000Z',
    '2026-02-12T17:09:03.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e1d4-75b7-8c8a-5e2de045b4d4');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e21d-73e9-be24-7c40808ec666',
    75,
    'CHN-53A-ZK4',
    '019c52d3-cab8-705f-84df-d27b0e24874d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Tomaccorientes - máquinas cocinas',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-23T13:55:35.000Z',
    '2026-02-12T17:09:03.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e21d-73e9-be24-7c40808ec666');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e266-712e-af8a-ee48ddbcb5c5',
    76,
    'CHN-SRR-77T',
    '019c52d3-cab8-705f-84df-d27b0e24874d',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras cargas cocina 1 (V)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2021-08-23T18:51:11.000Z',
    '2026-02-12T17:09:03.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e266-712e-af8a-ee48ddbcb5c5');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e868-77e9-b526-7a1c9b492762',
    97,
    'CHN-79Q-NT6',
    '019c52d3-cb01-732a-99f8-4c06a55a973b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Chillers 2-3-4 + Bombas',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-13T15:08:54.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e868-77e9-b526-7a1c9b492762');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e8b1-7532-8c92-33ca3450676e',
    98,
    'CHN-5G4-M9Z',
    '019c52d3-cb01-732a-99f8-4c06a55a973b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Chiller 2',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-18T01:09:31.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e8b1-7532-8c92-33ca3450676e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e8fa-732c-b472-c5fd3d3f304d',
    99,
    'CHN-N6J-4FF',
    '019c52d3-cb01-732a-99f8-4c06a55a973b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Chiller 3',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-18T01:09:44.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e8fa-732c-b472-c5fd3d3f304d');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e942-7211-83c4-842c215cf834',
    100,
    'CHN-S7L-699',
    '019c52d3-cb01-732a-99f8-4c06a55a973b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Chiller 4',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-18T01:09:57.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e942-7211-83c4-842c215cf834');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e98b-762d-8bcc-b92aee727ac4',
    101,
    'CHN-GEL-QTR',
    '019c52d3-cb01-732a-99f8-4c06a55a973b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Chiller 1 + Bombas',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-18T01:10:32.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e98b-762d-8bcc-b92aee727ac4');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-e9d4-7588-a5f1-538d848a4c50',
    102,
    'CHN-Z2R-KGP',
    '019c52d3-cb01-732a-99f8-4c06a55a973b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Bombas 3',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:55.000Z',
    NULL,
    true,
    '2021-08-18T01:10:51.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-e9d4-7588-a5f1-538d848a4c50');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ea1d-734a-81d9-f155959c802d',
    103,
    'CHN-S56-VGC',
    '019c52d3-cb01-732a-99f8-4c06a55a973b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Bombas Chillers (V)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2021-08-18T01:12:49.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ea1d-734a-81d9-f155959c802d');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ea66-7465-bf6a-0a6bb285e085',
    104,
    'CHN-AU9-2ZP',
    '019c52d3-cb01-732a-99f8-4c06a55a973b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador Chillers Cuarto de Máquinas',
    'Totalizador de los equipos de cuarto de máquinas',
    901,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2024-01-10T11:58:50.000Z',
    '2026-02-12T17:09:05.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ea66-7465-bf6a-0a6bb285e085');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ecbd-71f1-9924-5488eeb65cee',
    112,
    'CHN-25H-MMS',
    '019c52d3-cb4b-77ec-820c-82e24f69bd4b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Cocina 2',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-13T15:11:04.000Z',
    '2026-02-12T17:09:06.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ecbd-71f1-9924-5488eeb65cee');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ed0a-75d9-bb7d-522ffceda2e3',
    113,
    'CHN-66P-Y4Y',
    '019c52d3-cb4b-77ec-820c-82e24f69bd4b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'IG Cocina 1',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:20:51.000Z',
    '2026-02-12T17:09:06.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ed0a-75d9-bb7d-522ffceda2e3');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ed53-732b-86ed-a0d92767cc01',
    114,
    'CHN-KSU-ERE',
    '019c52d3-cb4b-77ec-820c-82e24f69bd4b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Comedor 2',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:21:13.000Z',
    '2026-02-12T17:09:06.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ed53-732b-86ed-a0d92767cc01');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ed9c-7239-9ba1-3133e9ea0f70',
    115,
    'CHN-47R-MLV',
    '019c52d3-cb4b-77ec-820c-82e24f69bd4b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Comedor 1',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:21:29.000Z',
    '2026-02-12T17:09:06.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ed9c-7239-9ba1-3133e9ea0f70');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-edea-72c1-b347-66ad1e79c0ba',
    116,
    'CHN-R9J-7YY',
    '019c52d3-cb4b-77ec-820c-82e24f69bd4b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Luces Lobby + Comedor personal',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:21:56.000Z',
    '2026-02-12T17:09:06.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-edea-72c1-b347-66ad1e79c0ba');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ee33-7158-90c1-32507d724909',
    117,
    'CHN-KX2-DP2',
    '019c52d3-cb4b-77ec-820c-82e24f69bd4b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Carmaras Frio Sotano',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:50.000Z',
    NULL,
    true,
    '2021-08-18T01:22:15.000Z',
    '2026-02-12T17:09:06.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ee33-7158-90c1-32507d724909');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-ee80-745d-a768-82b4f67c0407',
    118,
    'CHN-H5Q-YNL',
    '019c52d3-cb4b-77ec-820c-82e24f69bd4b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Otras cargas Lobby (V)',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2021-08-18T01:27:38.000Z',
    '2026-02-12T17:09:06.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-ee80-745d-a768-82b4f67c0407');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-eed8-774f-a346-8c0086e46dfd',
    119,
    'CHN-MV3-5ZE',
    '019c52d3-cb4b-77ec-820c-82e24f69bd4b',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador Lobby (V)',
    NULL,
    901,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2021-08-20T05:10:01.000Z',
    '2026-02-12T17:09:06.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-eed8-774f-a346-8c0086e46dfd');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f120-7618-89a3-4a8370504a3a',
    127,
    'CHN-YPJ-6ZW',
    '019c52d3-cb95-7512-8bf8-b0fbf71a13d2',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador',
    NULL,
    257,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-11-05T12:09:08.000Z',
    NULL,
    true,
    '2023-12-13T14:47:25.000Z',
    '2026-02-12T17:09:07.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f120-7618-89a3-4a8370504a3a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d3-f16a-749c-8dee-0d1f7a761091',
    128,
    'CHN-ZRW-D6A',
    '019c52d3-cb95-7512-8bf8-b0fbf71a13d2',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador MENOS SPA (V)',
    'CIrcuito elaborado para fines de contabilidad. Al totalizador se le resta consumo del SPA',
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2025-11-08T12:03:44.000Z',
    NULL,
    true,
    '2024-06-14T04:32:49.000Z',
    '2026-02-12T17:09:07.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d3-f16a-749c-8dee-0d1f7a761091');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0cfc-70b1-963c-b81b5e82a52e',
    222,
    'CHN-JP7-73J',
    '019c52d3-cbe0-751f-9b1f-a954ae564a17',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Roof Top 1 Restaurante',
    NULL,
    1,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:53.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0cfc-70b1-963c-b81b5e82a52e');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0d45-719e-b647-58da7eb58bd1',
    223,
    'CHN-DNS-SRN',
    '019c52d3-cbe0-751f-9b1f-a954ae564a17',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Roof Top 2 Restaurante',
    NULL,
    2,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:53.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0d45-719e-b647-58da7eb58bd1');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0d8e-7698-87a4-77b1d7b856eb',
    224,
    'CHN-PAQ-QJR',
    '019c52d3-cbe0-751f-9b1f-a954ae564a17',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Club Vacaciones ',
    NULL,
    3,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:53.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0d8e-7698-87a4-77b1d7b856eb');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0e23-730b-bdb0-311874d2e22a',
    226,
    'CHN-4FQ-L9D',
    '019c52d3-cbe0-751f-9b1f-a954ae564a17',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cocina, Restaurante y Bar',
    NULL,
    4,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:53.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0e23-730b-bdb0-311874d2e22a');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0dd8-712a-8715-b0eb22e2d0fd',
    225,
    'CHN-CVA-AHN',
    '019c52d3-cbe0-751f-9b1f-a954ae564a17',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Cámara Frio',
    NULL,
    5,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:53.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0dd8-712a-8715-b0eb22e2d0fd');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0e71-7610-bbc5-c2bdb22cdef1',
    227,
    'CHN-ZQT-NY7',
    '019c52d3-cbe0-751f-9b1f-a954ae564a17',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Roof Top 3 Salom Premium y Oficinas ',
    NULL,
    6,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:53.000Z',
    NULL,
    true,
    '2022-03-29T11:33:17.000Z',
    '2026-02-12T17:09:14.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0e71-7610-bbc5-c2bdb22cdef1');

INSERT INTO channels (id, human_id, public_code, device_id, organization_id, name, description, ch, measurement_type_id, phase_system, phase, process, status, last_sync_at, metadata, is_active, created_at, updated_at)
SELECT
    '019c52d4-0ebb-73be-8058-a874a0334cb5',
    228,
    'CHN-QM4-WMM',
    '019c52d3-cbe0-751f-9b1f-a954ae564a17',
    (SELECT id FROM organizations WHERE slug = 'sirenis'),
    'Totalizador Premium',
    NULL,
    900,
    1,
    NULL,
    NULL,
    true,
    'active',
    '2026-02-12T16:48:44.000Z',
    NULL,
    true,
    '2024-05-08T22:20:42.000Z',
    '2026-02-12T17:09:15.000Z'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE id = '019c52d4-0ebb-73be-8058-a874a0334cb5');

COMMIT;

-- --------------------------------------------------------
-- Verificación final
-- --------------------------------------------------------
SELECT 'Dispositivos Sirenis' as tabla, COUNT(*) as total
FROM devices WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'sirenis');

SELECT 'Canales Sirenis' as tabla, COUNT(*) as total
FROM channels WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'sirenis');
