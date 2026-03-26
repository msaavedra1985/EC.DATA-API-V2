-- =============================================================================
-- Sirenis Seed Script
-- Genera: 43 devices, 319 channels (org creada manualmente, sin sites)
-- Idempotente: usa ON CONFLICT DO NOTHING / ON CONFLICT (...) DO NOTHING
-- human_id: secuencia alta (9_000_000+) para evitar colisión con datos existentes
-- Generado: 2026-03-26
-- =============================================================================

BEGIN;

-- =============================================================================
-- 3. Devices (43 equipos)
-- site_id = NULL (usuario crea sites manualmente)
-- ON CONFLICT (uuid) DO NOTHING para idempotencia
-- =============================================================================
-- Device 1/43: Sirenis - Maleta Doble - EN1 (legacy id=1368, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001000, 'DEV-SIRENIS-001', 'cf41be89-b498-4cf6-bea5-1b03d0e2be11',
  org.id, NULL,
  'Sirenis - Maleta Doble - EN1', '80:1F:12:5A:6B:7E', NULL,
  20.428765, -87.29419,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 2/43: SIRENIS MEX - Poblado Hidro -A1 (legacy id=1663, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001001, 'DEV-SIRENIS-002', '948ca6a5-3a00-4591-a409-1115ce1fc686',
  org.id, NULL,
  'SIRENIS MEX - Poblado Hidro -A1', 'EC:C3:8A:60:2F:B1', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 3/43: SIRENIS MEX - Poblado Hidro -A2 (legacy id=1665, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001002, 'DEV-SIRENIS-003', '1a45a2a2-b727-4c2a-b037-37d9c917105c',
  org.id, NULL,
  'SIRENIS MEX - Poblado Hidro -A2', 'EC:C3:8A:60:2F:0B', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 4/43: SIRENIS MEX - Oficina RRHH (legacy id=1666, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001003, 'DEV-SIRENIS-004', '79f15e01-a61a-44a8-847e-29ef7c349e23',
  org.id, NULL,
  'SIRENIS MEX - Oficina RRHH', 'EC:C3:8A:60:2F:01', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 5/43: SIRENIS MEX - Lavanderia Motores (legacy id=1667, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001004, 'DEV-SIRENIS-005', '2d85da94-9a4f-4e81-a36c-fe655526fcf4',
  org.id, NULL,
  'SIRENIS MEX - Lavanderia Motores', 'EC:C3:8A:60:2F:AF', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 6/43: SIRENIS MEX - TEMATICOS I-A (legacy id=1670, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001005, 'DEV-SIRENIS-006', 'a9561285-6c75-4444-a6e7-deac45a19acb',
  org.id, NULL,
  'SIRENIS MEX - TEMATICOS I-A', 'EC:C3:8A:60:2F:15', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 7/43: SIRENIS MEX - TEMATICOS I-B (legacy id=1675, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001006, 'DEV-SIRENIS-007', '42434aa0-7c0b-4763-9980-097728054583',
  org.id, NULL,
  'SIRENIS MEX - TEMATICOS I-B', 'EC:C3:8A:60:2F:17', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 8/43: SIRENIS MEX - TEMATICOS II (legacy id=1676, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001007, 'DEV-SIRENIS-008', 'ad82451c-5348-40d2-bbcb-2fbf502e04a5',
  org.id, NULL,
  'SIRENIS MEX - TEMATICOS II', 'EC:C3:8A:60:2F:4F', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 9/43: SIRENIS MEX - BAYUM2 (legacy id=1677, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001008, 'DEV-SIRENIS-009', '02686a85-9b14-46b2-800a-64aab64eaa00',
  org.id, NULL,
  'SIRENIS MEX - BAYUM2', 'EC:C3:8A:60:2E:39', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 10/43: SIRENIS MEX - Steak House (legacy id=1679, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001009, 'DEV-SIRENIS-010', '89f592e3-2b07-4218-b0b4-f771d3b6d531',
  org.id, NULL,
  'SIRENIS MEX - Steak House', 'EC:C3:8A:60:2E:53', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 11/43: SIRENIS MEX - EJECUTIVOS (legacy id=1681, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001010, 'DEV-SIRENIS-011', '67182edf-ee4b-4eb2-8e27-6978f6d0ca5e',
  org.id, NULL,
  'SIRENIS MEX - EJECUTIVOS', 'EC:C3:8A:60:2E:A3', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 12/43: Facil de Configurar (legacy id=1701, climaId=1)
WITH org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001011, 'DEV-SIRENIS-012', 'abc4dc8c-3bfb-40fd-ad55-92b09a743a7d',
  org.id, NULL,
  'Facil de Configurar', NULL, NULL,
  19.4142912, -99.16604869999999,
  'America/Mexico_City', 'inactive', false,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 13/43: SIRENIS MEX - BMS - CHILLER 1 (legacy id=1777, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001012, 'DEV-SIRENIS-013', '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d',
  org.id, NULL,
  'SIRENIS MEX - BMS - CHILLER 1', NULL, NULL,
  20.4287539, -87.2954779,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 14/43: SIRENIS MEX - BMS - CHILLER 2 (legacy id=1778, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001013, 'DEV-SIRENIS-014', '2b0f32eb-351a-4171-86a0-d5510a1f19a4',
  org.id, NULL,
  'SIRENIS MEX - BMS - CHILLER 2', NULL, NULL,
  20.4287539, -87.2954779,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 15/43: SIRENIS MEX - BMS - CHILLER 3 (legacy id=1779, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001014, 'DEV-SIRENIS-015', 'b776b651-ce8f-4a98-970e-36ff0f6f0593',
  org.id, NULL,
  'SIRENIS MEX - BMS - CHILLER 3', NULL, NULL,
  20.4287539, -87.2954779,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 16/43: SIRENIS MEX - BMS - CHILLER 4 (legacy id=1780, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001015, 'DEV-SIRENIS-016', 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39',
  org.id, NULL,
  'SIRENIS MEX - BMS - CHILLER 4', NULL, NULL,
  20.4287539, -87.2954779,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 17/43: SIRENIS-PC-PARQUE ACUATICO-ACU1 (legacy id=1802, climaId=1064)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001016, 'DEV-SIRENIS-017', '0e5f4ee9-42d3-4ef1-93c3-846243393c66',
  org.id, NULL,
  'SIRENIS-PC-PARQUE ACUATICO-ACU1', NULL, 'Solution/EC/SIRENIS/',
  18.8175274, -68.5909027,
  'America/Santo_Domingo', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 18/43: SIRENIS-PC-LAVANDERIA-ACU1 (legacy id=1803, climaId=1064)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001017, 'DEV-SIRENIS-018', '2a7f495d-cdb4-474e-8a44-e9dc98eb5337',
  org.id, NULL,
  'SIRENIS-PC-LAVANDERIA-ACU1', NULL, 'Solution/EC/SIRENIS/',
  18.8175274, -68.5909027,
  'America/Santo_Domingo', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 19/43: SIRENIS-PC-CHILLERS-ACU1 (legacy id=1805, climaId=1064)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001018, 'DEV-SIRENIS-019', '948759d7-6b76-4037-8504-a8e6ba508e62',
  org.id, NULL,
  'SIRENIS-PC-CHILLERS-ACU1', NULL, 'Solution/EC/SIRENIS/',
  18.8175274, -68.5909027,
  'America/Santo_Domingo', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 20/43: SIRENIS-PC-TEX MEX-ACU1 (legacy id=1807, climaId=1064)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001019, 'DEV-SIRENIS-020', '1bba1670-9bbb-449c-b81e-905e762a7385',
  org.id, NULL,
  'SIRENIS-PC-TEX MEX-ACU1', NULL, 'Solution/EC/SIRENIS/',
  18.8175274, -68.5909027,
  'America/Santo_Domingo', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 21/43: SIRENIS-PC-TEMATICOS-ACU1 (legacy id=1808, climaId=1064)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001020, 'DEV-SIRENIS-021', 'bb9eca17-8fbc-44d8-b3f2-9587e20bd979',
  org.id, NULL,
  'SIRENIS-PC-TEMATICOS-ACU1', NULL, 'Solution/EC/SIRENIS/',
  18.8175274, -68.5909027,
  'America/Santo_Domingo', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 22/43: SIRENIS-PC-SE COCOTAL-ACU1 (legacy id=1809, climaId=1064)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001021, 'DEV-SIRENIS-022', 'eca28267-d2c5-4ad0-9c60-b734655bc2f9',
  org.id, NULL,
  'SIRENIS-PC-SE COCOTAL-ACU1', NULL, 'Solution/EC/SIRENIS/',
  18.8175274, -68.5909027,
  'America/Santo_Domingo', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 23/43: SIRENIS-PC-SE COCOTAL-ACU2 (legacy id=1810, climaId=1064)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001022, 'DEV-SIRENIS-023', '0cb251b2-af55-4cdf-99cf-0a1d16fd2733',
  org.id, NULL,
  'SIRENIS-PC-SE COCOTAL-ACU2', NULL, 'Solution/EC/SIRENIS/',
  18.8175274, -68.5909027,
  'America/Santo_Domingo', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 24/43: SIRENIS-PC-SE TROPICAL-ACU1 (legacy id=1811, climaId=1064)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001023, 'DEV-SIRENIS-024', '089b07cd-66fa-4ace-906b-17ae21e60e80',
  org.id, NULL,
  'SIRENIS-PC-SE TROPICAL-ACU1', NULL, 'Solution/EC/SIRENIS/',
  18.8175274, -68.5909027,
  'America/Santo_Domingo', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 25/43: SIRENIS-PC-SE TROPICAL-ACU2 (legacy id=1812, climaId=1064)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001024, 'DEV-SIRENIS-025', 'f58e5ffc-75ec-41cf-b60c-6bec6b9b80b2',
  org.id, NULL,
  'SIRENIS-PC-SE TROPICAL-ACU2', NULL, 'Solution/EC/SIRENIS/',
  18.8175274, -68.5909027,
  'America/Santo_Domingo', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 26/43: SIRENIS-PC-REFRIGERACION ECONOMATO-ACU1 (legacy id=1813, climaId=1064)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001025, 'DEV-SIRENIS-026', '044e3c7d-516c-4345-a217-e6d13549c8bf',
  org.id, NULL,
  'SIRENIS-PC-REFRIGERACION ECONOMATO-ACU1', NULL, 'Solution/EC/SIRENIS/',
  18.8175274, -68.5909027,
  'America/Santo_Domingo', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 27/43: SIRENIS-PC-CHILLERS-ACU2 (legacy id=1814, climaId=1064)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001026, 'DEV-SIRENIS-027', 'ec903e09-64a2-4948-b8c6-8d45cfb2d5c1',
  org.id, NULL,
  'SIRENIS-PC-CHILLERS-ACU2', NULL, 'Solution/EC/SIRENIS/',
  18.8175274, -68.5909027,
  'America/Santo_Domingo', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 28/43: SIRENIS-PC-SE PRINCIPAL-NODO1 (legacy id=1804, climaId=1064)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001027, 'DEV-SIRENIS-028', 'da516fb7-eefa-4553-90fd-434844303afc',
  org.id, NULL,
  'SIRENIS-PC-SE PRINCIPAL-NODO1', NULL, 'Solution/EC/SIRENIS/',
  18.8175274, -68.5909027,
  'America/Santo_Domingo', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 29/43: SIRENIS MEX - VFD XAAC1 (legacy id=1889, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001028, 'DEV-SIRENIS-029', '24d8b4a7-c380-49d9-af99-cf379a722d60',
  org.id, NULL,
  'SIRENIS MEX - VFD XAAC1', NULL, NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 30/43: SIRENIS MEX - VFD XAAC2 (legacy id=1890, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001029, 'DEV-SIRENIS-030', '2a9efbbd-2503-4f54-bb5a-a5e290ad0bd4',
  org.id, NULL,
  'SIRENIS MEX - VFD XAAC2', NULL, NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 31/43: SIRENIS MEX - VFD LOBBY (legacy id=1891, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001030, 'DEV-SIRENIS-031', '766ae888-6fd8-4197-adc2-f82844aca6cd',
  org.id, NULL,
  'SIRENIS MEX - VFD LOBBY', '6', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 32/43: SIRENIS MEX - 5c3a346055 - BTU  (legacy id=3863, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001031, 'DEV-SIRENIS-032', 'b0ad4ea4-0b0e-4380-8c67-de7286d15b5e',
  org.id, NULL,
  'SIRENIS MEX - 5c3a346055 - BTU ', NULL, NULL,
  20.4282721, -87.2953194,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 33/43: SIRENIS MEX - Lobby - A1 (legacy id=1668, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001032, 'DEV-SIRENIS-033', 'c155c8b9-a2ae-4018-86aa-6b25a8570160',
  org.id, NULL,
  'SIRENIS MEX - Lobby - A1', 'EC:C3:8A:60:2F:23', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 34/43: SIRENIS MEX - COCINA 2 (legacy id=1669, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001033, 'DEV-SIRENIS-034', 'c2016124-531b-429f-afd9-2f574a88508c',
  org.id, NULL,
  'SIRENIS MEX - COCINA 2', 'EC:C3:8A:60:2F:A7', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 35/43: SIRENIS MEX - CASA DE PLAYA (legacy id=1671, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001034, 'DEV-SIRENIS-035', 'ac82b508-cab1-452c-adcb-589a2b7cd99f',
  org.id, NULL,
  'SIRENIS MEX - CASA DE PLAYA', 'EC:C3:8A:60:2E:45', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 36/43: SIRENIS MEX - SPA (legacy id=1672, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001035, 'DEV-SIRENIS-036', '85fc19a4-19f1-498a-a337-6aa599a2b7cd',
  org.id, NULL,
  'SIRENIS MEX - SPA', 'EC:C3:8A:60:2E:67', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 37/43: SIRENIS MEX - Lobby - A3 (legacy id=1673, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001036, 'DEV-SIRENIS-037', '41e419f7-8ca3-42f0-b473-0971107183ec',
  org.id, NULL,
  'SIRENIS MEX - Lobby - A3', 'EC:C3:8A:60:2E:8D', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 38/43: SIRENIS MEX - COCINA 1 (legacy id=1674, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001037, 'DEV-SIRENIS-038', 'e091e43a-7177-4f1b-9482-eaa3f929dfc1',
  org.id, NULL,
  'SIRENIS MEX - COCINA 1', 'EC:C3:8A:60:2F:61', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 39/43: SIRENIS MEX - CHILLERS (legacy id=1678, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001038, 'DEV-SIRENIS-039', '89879a96-8f0a-4d99-857b-c2428395f4a1',
  org.id, NULL,
  'SIRENIS MEX - CHILLERS', 'EC:C3:8A:60:2E:6D', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 40/43: SIRENIS MEX - Lobby - A2 - Área de servicio (legacy id=1680, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001039, 'DEV-SIRENIS-040', 'e8c21d30-f3d5-4789-bf8f-8374cccbbd62',
  org.id, NULL,
  'SIRENIS MEX - Lobby - A2 - Área de servicio', 'EC:C3:8A:60:2C:9B', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 41/43: SIRENIS MEX - SUB PRINCIPAL MT (legacy id=1703, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001040, 'DEV-SIRENIS-041', 'f6436441-2ee2-4e85-86f4-ec5fe57186bc',
  org.id, NULL,
  'SIRENIS MEX - SUB PRINCIPAL MT', '00:26:45:01:2F:76', NULL,
  20.428599, -87.2958929,
  'America/Cancun', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 42/43: SIRENIS-PC-CLUB PREMIUM-ACU1 (legacy id=1806, climaId=1064)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001041, 'DEV-SIRENIS-042', 'aeda62af-d04d-40b2-b21e-cc06777cadf1',
  org.id, NULL,
  'SIRENIS-PC-CLUB PREMIUM-ACU1', NULL, 'Solution/EC/SIRENIS/',
  18.8175274, -68.5909027,
  'America/Santo_Domingo', 'active', true,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- Device 43/43: Sirenis - Cocina Central - Pasteleria (legacy id=1929, climaId=1061)
WITH
  org AS (SELECT id FROM organizations WHERE slug = 'sirenis')
INSERT INTO devices
  (id, human_id, public_code, uuid, organization_id, site_id, name, mac_address, topic, latitude, longitude, timezone, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9001042, 'DEV-SIRENIS-043', 'f5c2eb16-eca8-4c69-a5e5-f3e55e4f741f',
  org.id, NULL,
  'Sirenis - Cocina Central - Pasteleria', 'C45BBE6AD679', 'shellies/shellyuni/C45BBE6AD679',
  20.428599, -87.2958929,
  'America/Cancun', 'inactive', false,
  NOW(), NOW()
FROM org
ON CONFLICT (uuid) DO NOTHING;

-- =============================================================================
-- 4. Channels (319 canales)
-- Resolución de device_id y organization_id via CTE usando device.uuid
-- ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING
-- (unique index: channels_device_name_unique)
-- =============================================================================
-- Channel 1/319: Canal 1 (legacy id=2820, equipoId=1368)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'cf41be89-b498-4cf6-bea5-1b03d0e2be11')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002000, 'CH-SIRENIS-001',
  dev.device_id, dev.organization_id,
  'Canal 1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 2/319: Edificio 1 - Lado Derecho (legacy id=6421, equipoId=1663)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948ca6a5-3a00-4591-a409-1115ce1fc686')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002001, 'CH-SIRENIS-002',
  dev.device_id, dev.organization_id,
  'Edificio 1 - Lado Derecho', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 3/319: Edificio 1 - Lado Izquierdo (legacy id=6488, equipoId=1663)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948ca6a5-3a00-4591-a409-1115ce1fc686')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002002, 'CH-SIRENIS-003',
  dev.device_id, dev.organization_id,
  'Edificio 1 - Lado Izquierdo', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 4/319: Edificio 3 - Lado Derecho (legacy id=6489, equipoId=1663)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948ca6a5-3a00-4591-a409-1115ce1fc686')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002003, 'CH-SIRENIS-004',
  dev.device_id, dev.organization_id,
  'Edificio 3 - Lado Derecho', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 5/319: Bombas de agua (legacy id=6490, equipoId=1663)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948ca6a5-3a00-4591-a409-1115ce1fc686')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002004, 'CH-SIRENIS-005',
  dev.device_id, dev.organization_id,
  'Bombas de agua', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 6/319: Edificio 2 - Lado Derecho (legacy id=6491, equipoId=1663)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948ca6a5-3a00-4591-a409-1115ce1fc686')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002005, 'CH-SIRENIS-006',
  dev.device_id, dev.organization_id,
  'Edificio 2 - Lado Derecho', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 7/319: Edificio 2 - Lado Izquierdo (legacy id=6492, equipoId=1663)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948ca6a5-3a00-4591-a409-1115ce1fc686')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002006, 'CH-SIRENIS-007',
  dev.device_id, dev.organization_id,
  'Edificio 2 - Lado Izquierdo', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 8/319: Edificio 3 - Lado Izquierdo (legacy id=6423, equipoId=1665)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1a45a2a2-b727-4c2a-b037-37d9c917105c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002007, 'CH-SIRENIS-008',
  dev.device_id, dev.organization_id,
  'Edificio 3 - Lado Izquierdo', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 9/319: IG - Poblado (legacy id=6493, equipoId=1665)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1a45a2a2-b727-4c2a-b037-37d9c917105c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002008, 'CH-SIRENIS-009',
  dev.device_id, dev.organization_id,
  'IG - Poblado', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 10/319: IG - Hidro Bombeo (legacy id=6494, equipoId=1665)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1a45a2a2-b727-4c2a-b037-37d9c917105c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002009, 'CH-SIRENIS-010',
  dev.device_id, dev.organization_id,
  'IG - Hidro Bombeo', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 11/319: Bombas Grandes (legacy id=6495, equipoId=1665)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1a45a2a2-b727-4c2a-b037-37d9c917105c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002010, 'CH-SIRENIS-011',
  dev.device_id, dev.organization_id,
  'Bombas Grandes', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 12/319: Bomba Electrica Contra Incendio (legacy id=6496, equipoId=1665)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1a45a2a2-b727-4c2a-b037-37d9c917105c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002011, 'CH-SIRENIS-012',
  dev.device_id, dev.organization_id,
  'Bomba Electrica Contra Incendio', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 13/319: IG - Osmosis (legacy id=6497, equipoId=1665)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1a45a2a2-b727-4c2a-b037-37d9c917105c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002012, 'CH-SIRENIS-013',
  dev.device_id, dev.organization_id,
  'IG - Osmosis', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 14/319: Otras Cargas Poblado (V) (legacy id=6499, equipoId=1665)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1a45a2a2-b727-4c2a-b037-37d9c917105c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002013, 'CH-SIRENIS-014',
  dev.device_id, dev.organization_id,
  'Otras Cargas Poblado (V)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 15/319: SUBTOTAL- SIRENIS (V) (legacy id=6684, equipoId=1666)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '79f15e01-a61a-44a8-847e-29ef7c349e23')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002014, 'CH-SIRENIS-015',
  dev.device_id, dev.organization_id,
  'SUBTOTAL- SIRENIS (V)', 901, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 16/319: IG Oficina RRHH (legacy id=6424, equipoId=1666)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '79f15e01-a61a-44a8-847e-29ef7c349e23')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002015, 'CH-SIRENIS-016',
  dev.device_id, dev.organization_id,
  'IG Oficina RRHH', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 17/319: Fuerza Cafeteria (legacy id=6447, equipoId=1666)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '79f15e01-a61a-44a8-847e-29ef7c349e23')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002016, 'CH-SIRENIS-017',
  dev.device_id, dev.organization_id,
  'Fuerza Cafeteria', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 18/319: Subtablero de Aires 1 (legacy id=6455, equipoId=1666)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '79f15e01-a61a-44a8-847e-29ef7c349e23')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002017, 'CH-SIRENIS-018',
  dev.device_id, dev.organization_id,
  'Subtablero de Aires 1', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 19/319: Subtablero de Aires 2 (legacy id=6456, equipoId=1666)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '79f15e01-a61a-44a8-847e-29ef7c349e23')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002018, 'CH-SIRENIS-019',
  dev.device_id, dev.organization_id,
  'Subtablero de Aires 2', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 20/319: Oficina Sistemas (legacy id=6457, equipoId=1666)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '79f15e01-a61a-44a8-847e-29ef7c349e23')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002019, 'CH-SIRENIS-020',
  dev.device_id, dev.organization_id,
  'Oficina Sistemas', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 21/319: Iluminacion Osmosis (legacy id=6458, equipoId=1666)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '79f15e01-a61a-44a8-847e-29ef7c349e23')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002020, 'CH-SIRENIS-021',
  dev.device_id, dev.organization_id,
  'Iluminacion Osmosis', 6, 2, 1, 1,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 22/319: Iluminacion Sala de Calderas (legacy id=6459, equipoId=1666)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '79f15e01-a61a-44a8-847e-29ef7c349e23')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002021, 'CH-SIRENIS-022',
  dev.device_id, dev.organization_id,
  'Iluminacion Sala de Calderas', 6, 2, 2, 1,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 23/319: Otras Cargas RRHH (Iluminacion) (V) (legacy id=6498, equipoId=1666)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '79f15e01-a61a-44a8-847e-29ef7c349e23')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002022, 'CH-SIRENIS-023',
  dev.device_id, dev.organization_id,
  'Otras Cargas RRHH (Iluminacion) (V)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 24/319: Compresores (legacy id=6425, equipoId=1667)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2d85da94-9a4f-4e81-a36c-fe655526fcf4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002023, 'CH-SIRENIS-024',
  dev.device_id, dev.organization_id,
  'Compresores', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 25/319: Dobladora 2 (legacy id=6513, equipoId=1667)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2d85da94-9a4f-4e81-a36c-fe655526fcf4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002024, 'CH-SIRENIS-025',
  dev.device_id, dev.organization_id,
  'Dobladora 2', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 26/319: Dobladora 1 (legacy id=6514, equipoId=1667)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2d85da94-9a4f-4e81-a36c-fe655526fcf4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002025, 'CH-SIRENIS-026',
  dev.device_id, dev.organization_id,
  'Dobladora 1', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 27/319: Planchadora 1 (legacy id=6515, equipoId=1667)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2d85da94-9a4f-4e81-a36c-fe655526fcf4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002026, 'CH-SIRENIS-027',
  dev.device_id, dev.organization_id,
  'Planchadora 1', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 28/319: Planchadora 2 (legacy id=6516, equipoId=1667)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2d85da94-9a4f-4e81-a36c-fe655526fcf4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002027, 'CH-SIRENIS-028',
  dev.device_id, dev.organization_id,
  'Planchadora 2', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 29/319: IG Motores lavanderia (legacy id=6517, equipoId=1667)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2d85da94-9a4f-4e81-a36c-fe655526fcf4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002028, 'CH-SIRENIS-029',
  dev.device_id, dev.organization_id,
  'IG Motores lavanderia', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 30/319: Otras Maquinas Lavanderia (V) (legacy id=6518, equipoId=1667)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2d85da94-9a4f-4e81-a36c-fe655526fcf4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002029, 'CH-SIRENIS-030',
  dev.device_id, dev.organization_id,
  'Otras Maquinas Lavanderia (V)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 31/319: IG Temáticos (legacy id=6431, equipoId=1670)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'a9561285-6c75-4444-a6e7-deac45a19acb')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002030, 'CH-SIRENIS-031',
  dev.device_id, dev.organization_id,
  'IG Temáticos', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 32/319: Tablero Frances (legacy id=6540, equipoId=1670)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'a9561285-6c75-4444-a6e7-deac45a19acb')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002031, 'CH-SIRENIS-032',
  dev.device_id, dev.organization_id,
  'Tablero Frances', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 33/319: Coffe Shop (legacy id=6541, equipoId=1670)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'a9561285-6c75-4444-a6e7-deac45a19acb')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002032, 'CH-SIRENIS-033',
  dev.device_id, dev.organization_id,
  'Coffe Shop', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 34/319: Tab Fuerza Mexicano (legacy id=6542, equipoId=1670)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'a9561285-6c75-4444-a6e7-deac45a19acb')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002033, 'CH-SIRENIS-034',
  dev.device_id, dev.organization_id,
  'Tab Fuerza Mexicano', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 35/319: Horno central (legacy id=6543, equipoId=1670)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'a9561285-6c75-4444-a6e7-deac45a19acb')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002034, 'CH-SIRENIS-035',
  dev.device_id, dev.organization_id,
  'Horno central', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 36/319: Tab Luces y contactos Mexicano (legacy id=6544, equipoId=1670)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'a9561285-6c75-4444-a6e7-deac45a19acb')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002035, 'CH-SIRENIS-036',
  dev.device_id, dev.organization_id,
  'Tab Luces y contactos Mexicano', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 37/319: Otras Cargas (V) (legacy id=6550, equipoId=1670)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'a9561285-6c75-4444-a6e7-deac45a19acb')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002036, 'CH-SIRENIS-037',
  dev.device_id, dev.organization_id,
  'Otras Cargas (V)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 38/319: IG Cocina Central (legacy id=6436, equipoId=1675)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '42434aa0-7c0b-4763-9980-097728054583')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002037, 'CH-SIRENIS-038',
  dev.device_id, dev.organization_id,
  'IG Cocina Central', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 39/319: Tab Japones (legacy id=6545, equipoId=1675)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '42434aa0-7c0b-4763-9980-097728054583')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002038, 'CH-SIRENIS-039',
  dev.device_id, dev.organization_id,
  'Tab Japones', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 40/319: Luces pasillo Peruano (legacy id=6546, equipoId=1675)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '42434aa0-7c0b-4763-9980-097728054583')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002039, 'CH-SIRENIS-040',
  dev.device_id, dev.organization_id,
  'Luces pasillo Peruano', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 41/319: Chiringos Bar Playa (legacy id=6547, equipoId=1675)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '42434aa0-7c0b-4763-9980-097728054583')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002040, 'CH-SIRENIS-041',
  dev.device_id, dev.organization_id,
  'Chiringos Bar Playa', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 42/319: Tab Meditarraneo (legacy id=6548, equipoId=1675)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '42434aa0-7c0b-4763-9980-097728054583')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002041, 'CH-SIRENIS-042',
  dev.device_id, dev.organization_id,
  'Tab Meditarraneo', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 43/319: UMAS Mexicano (legacy id=6549, equipoId=1675)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '42434aa0-7c0b-4763-9980-097728054583')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002042, 'CH-SIRENIS-043',
  dev.device_id, dev.organization_id,
  'UMAS Mexicano', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 44/319: Lavavajillas (legacy id=6437, equipoId=1676)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ad82451c-5348-40d2-bbcb-2fbf502e04a5')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002043, 'CH-SIRENIS-044',
  dev.device_id, dev.organization_id,
  'Lavavajillas', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 45/319: Lava Utencilios (legacy id=6551, equipoId=1676)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ad82451c-5348-40d2-bbcb-2fbf502e04a5')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002044, 'CH-SIRENIS-045',
  dev.device_id, dev.organization_id,
  'Lava Utencilios', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 46/319: Cuarto Frio #3 (legacy id=6552, equipoId=1676)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ad82451c-5348-40d2-bbcb-2fbf502e04a5')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002045, 'CH-SIRENIS-046',
  dev.device_id, dev.organization_id,
  'Cuarto Frio #3', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 47/319: Extractor Cocina Central (legacy id=6553, equipoId=1676)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ad82451c-5348-40d2-bbcb-2fbf502e04a5')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002046, 'CH-SIRENIS-047',
  dev.device_id, dev.organization_id,
  'Extractor Cocina Central', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 48/319: Alumbrado Cocina Central  (legacy id=6554, equipoId=1676)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ad82451c-5348-40d2-bbcb-2fbf502e04a5')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002047, 'CH-SIRENIS-048',
  dev.device_id, dev.organization_id,
  'Alumbrado Cocina Central ', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 49/319: Camara de Conservacion #2 (legacy id=6555, equipoId=1676)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ad82451c-5348-40d2-bbcb-2fbf502e04a5')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002048, 'CH-SIRENIS-049',
  dev.device_id, dev.organization_id,
  'Camara de Conservacion #2', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 50/319: Subtotalizador (legacy id=6438, equipoId=1677)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '02686a85-9b14-46b2-800a-64aab64eaa00')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002049, 'CH-SIRENIS-050',
  dev.device_id, dev.organization_id,
  'Subtotalizador', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 51/319: Sala de maquinas (legacy id=6506, equipoId=1677)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '02686a85-9b14-46b2-800a-64aab64eaa00')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002050, 'CH-SIRENIS-051',
  dev.device_id, dev.organization_id,
  'Sala de maquinas', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 52/319: Cocina (legacy id=6507, equipoId=1677)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '02686a85-9b14-46b2-800a-64aab64eaa00')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002051, 'CH-SIRENIS-052',
  dev.device_id, dev.organization_id,
  'Cocina', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 53/319: Aires Acondicinoados (legacy id=6508, equipoId=1677)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '02686a85-9b14-46b2-800a-64aab64eaa00')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002052, 'CH-SIRENIS-053',
  dev.device_id, dev.organization_id,
  'Aires Acondicinoados', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 54/319: Comedor (legacy id=6509, equipoId=1677)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '02686a85-9b14-46b2-800a-64aab64eaa00')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002053, 'CH-SIRENIS-054',
  dev.device_id, dev.organization_id,
  'Comedor', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 55/319: Camaras de frio (legacy id=6510, equipoId=1677)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '02686a85-9b14-46b2-800a-64aab64eaa00')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002054, 'CH-SIRENIS-055',
  dev.device_id, dev.organization_id,
  'Camaras de frio', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 56/319: Totalizador Bayou (V) (legacy id=6511, equipoId=1677)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '02686a85-9b14-46b2-800a-64aab64eaa00')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002055, 'CH-SIRENIS-056',
  dev.device_id, dev.organization_id,
  'Totalizador Bayou (V)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 57/319: Otras Cargas Bayou (V) (legacy id=6512, equipoId=1677)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '02686a85-9b14-46b2-800a-64aab64eaa00')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002056, 'CH-SIRENIS-057',
  dev.device_id, dev.organization_id,
  'Otras Cargas Bayou (V)', 901, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 58/319: Otras Cargas Steak House (V) (legacy id=6453, equipoId=1679)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89f592e3-2b07-4218-b0b4-f771d3b6d531')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002057, 'CH-SIRENIS-058',
  dev.device_id, dev.organization_id,
  'Otras Cargas Steak House (V)', 900, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 59/319: Iluminación exterior (legacy id=6440, equipoId=1679)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89f592e3-2b07-4218-b0b4-f771d3b6d531')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002058, 'CH-SIRENIS-059',
  dev.device_id, dev.organization_id,
  'Iluminación exterior', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 60/319: AA Comedor (legacy id=6448, equipoId=1679)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89f592e3-2b07-4218-b0b4-f771d3b6d531')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002059, 'CH-SIRENIS-060',
  dev.device_id, dev.organization_id,
  'AA Comedor', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 61/319: Bar Alberca (legacy id=6449, equipoId=1679)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89f592e3-2b07-4218-b0b4-f771d3b6d531')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002060, 'CH-SIRENIS-061',
  dev.device_id, dev.organization_id,
  'Bar Alberca', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 62/319: Sub Cuadro Cocina (legacy id=6450, equipoId=1679)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89f592e3-2b07-4218-b0b4-f771d3b6d531')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002061, 'CH-SIRENIS-062',
  dev.device_id, dev.organization_id,
  'Sub Cuadro Cocina', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 63/319: Sub Cuadro Teatro (legacy id=6451, equipoId=1679)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89f592e3-2b07-4218-b0b4-f771d3b6d531')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002062, 'CH-SIRENIS-063',
  dev.device_id, dev.organization_id,
  'Sub Cuadro Teatro', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 64/319: IG Steak House (legacy id=6452, equipoId=1679)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89f592e3-2b07-4218-b0b4-f771d3b6d531')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002063, 'CH-SIRENIS-064',
  dev.device_id, dev.organization_id,
  'IG Steak House', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 65/319: IG Ejecutivos (legacy id=6442, equipoId=1681)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '67182edf-ee4b-4eb2-8e27-6978f6d0ca5e')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002064, 'CH-SIRENIS-065',
  dev.device_id, dev.organization_id,
  'IG Ejecutivos', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 66/319: IG Edificio Ejecutivos (legacy id=6519, equipoId=1681)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '67182edf-ee4b-4eb2-8e27-6978f6d0ca5e')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002065, 'CH-SIRENIS-066',
  dev.device_id, dev.organization_id,
  'IG Edificio Ejecutivos', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 67/319: No identificado 1 (legacy id=6520, equipoId=1681)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '67182edf-ee4b-4eb2-8e27-6978f6d0ca5e')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002066, 'CH-SIRENIS-067',
  dev.device_id, dev.organization_id,
  'No identificado 1', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 68/319: No identificado 2 (legacy id=6521, equipoId=1681)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '67182edf-ee4b-4eb2-8e27-6978f6d0ca5e')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002067, 'CH-SIRENIS-068',
  dev.device_id, dev.organization_id,
  'No identificado 2', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 69/319: No identificado 3 (legacy id=6522, equipoId=1681)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '67182edf-ee4b-4eb2-8e27-6978f6d0ca5e')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002068, 'CH-SIRENIS-069',
  dev.device_id, dev.organization_id,
  'No identificado 3', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 70/319: Iluminacion y Tomacorrientes (legacy id=6523, equipoId=1681)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '67182edf-ee4b-4eb2-8e27-6978f6d0ca5e')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002069, 'CH-SIRENIS-070',
  dev.device_id, dev.organization_id,
  'Iluminacion y Tomacorrientes', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 71/319: Otras Cargas (V) (legacy id=6524, equipoId=1681)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '67182edf-ee4b-4eb2-8e27-6978f6d0ca5e')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002070, 'CH-SIRENIS-071',
  dev.device_id, dev.organization_id,
  'Otras Cargas (V)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 72/319: Demo #1 (legacy id=6807, equipoId=1701)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'abc4dc8c-3bfb-40fd-ad55-92b09a743a7d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002071, 'CH-SIRENIS-072',
  dev.device_id, dev.organization_id,
  'Demo #1', 1, 3, NULL, NULL,
  true, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 73/319: Energia (legacy id=7871, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002072, 'CH-SIRENIS-073',
  dev.device_id, dev.organization_id,
  'Energia', 1, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 74/319: Temperatura consgina (legacy id=7872, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002073, 'CH-SIRENIS-074',
  dev.device_id, dev.organization_id,
  'Temperatura consgina', 1, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 75/319: Temperatura del refrigerante en el evaporador (legacy id=7873, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002074, 'CH-SIRENIS-075',
  dev.device_id, dev.organization_id,
  'Temperatura del refrigerante en el evaporador', 2, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 76/319: Temperatura del refrigerante en el condensador (legacy id=7874, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002075, 'CH-SIRENIS-076',
  dev.device_id, dev.organization_id,
  'Temperatura del refrigerante en el condensador', 3, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 77/319: Temperatura entrada agua evaporador (legacy id=7875, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002076, 'CH-SIRENIS-077',
  dev.device_id, dev.organization_id,
  'Temperatura entrada agua evaporador', 4, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 78/319: Temperatura entrada agua condensador (legacy id=7876, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002077, 'CH-SIRENIS-078',
  dev.device_id, dev.organization_id,
  'Temperatura entrada agua condensador', 5, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 79/319: Temperatura salida agua evaporador (legacy id=7877, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002078, 'CH-SIRENIS-079',
  dev.device_id, dev.organization_id,
  'Temperatura salida agua evaporador', 6, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 80/319: Temperatura salida agua condensador (legacy id=7878, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002079, 'CH-SIRENIS-080',
  dev.device_id, dev.organization_id,
  'Temperatura salida agua condensador', 7, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 81/319: Temperatura del aceite en el compresor (legacy id=7879, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002080, 'CH-SIRENIS-081',
  dev.device_id, dev.organization_id,
  'Temperatura del aceite en el compresor', 8, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 82/319: Carga del chiller (legacy id=7907, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002081, 'CH-SIRENIS-082',
  dev.device_id, dev.organization_id,
  'Carga del chiller', 9, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 83/319: Encendidos desde commissioning (legacy id=7908, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002082, 'CH-SIRENIS-083',
  dev.device_id, dev.organization_id,
  'Encendidos desde commissioning', 10, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 84/319: Presión del refrigerante en el condensador (legacy id=7909, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002083, 'CH-SIRENIS-084',
  dev.device_id, dev.organization_id,
  'Presión del refrigerante en el condensador', 11, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 85/319: Presión del aceite del compresor (legacy id=7910, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002084, 'CH-SIRENIS-085',
  dev.device_id, dev.organization_id,
  'Presión del aceite del compresor', 12, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 86/319: Tiempo que lleva encendido (legacy id=7911, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002085, 'CH-SIRENIS-086',
  dev.device_id, dev.organization_id,
  'Tiempo que lleva encendido', 13, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 87/319: Consumo de Amperios relativo de la fase R con respecto al nominal (legacy id=7912, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002086, 'CH-SIRENIS-087',
  dev.device_id, dev.organization_id,
  'Consumo de Amperios relativo de la fase R con respecto al nominal', 14, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 88/319: Consumo de Amperios relativo de la fase S del chiller 4 (legacy id=7913, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002087, 'CH-SIRENIS-088',
  dev.device_id, dev.organization_id,
  'Consumo de Amperios relativo de la fase S del chiller 4', 15, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 89/319: Consumo de Amperios relativo de la fase T con respecto al nominal del chiller 4 (legacy id=7914, equipoId=1777)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '56268e0c-8ecc-4d4c-a2e9-56c41f96bb0d')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002088, 'CH-SIRENIS-089',
  dev.device_id, dev.organization_id,
  'Consumo de Amperios relativo de la fase T con respecto al nominal del chiller 4', 16, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 90/319: Energia (legacy id=7880, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002089, 'CH-SIRENIS-090',
  dev.device_id, dev.organization_id,
  'Energia', 1, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 91/319: Temperatura consgina (legacy id=7881, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002090, 'CH-SIRENIS-091',
  dev.device_id, dev.organization_id,
  'Temperatura consgina', 1, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 92/319: Temperatura del refrigerante en el evaporador (legacy id=7882, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002091, 'CH-SIRENIS-092',
  dev.device_id, dev.organization_id,
  'Temperatura del refrigerante en el evaporador', 2, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 93/319: Temperatura del refrigerante en el condensador (legacy id=7883, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002092, 'CH-SIRENIS-093',
  dev.device_id, dev.organization_id,
  'Temperatura del refrigerante en el condensador', 3, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 94/319: Temperatura entrada agua evaporador (legacy id=7884, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002093, 'CH-SIRENIS-094',
  dev.device_id, dev.organization_id,
  'Temperatura entrada agua evaporador', 4, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 95/319: Temperatura entrada agua condensador (legacy id=7885, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002094, 'CH-SIRENIS-095',
  dev.device_id, dev.organization_id,
  'Temperatura entrada agua condensador', 5, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 96/319: Temperatura salida agua evaporador (legacy id=7886, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002095, 'CH-SIRENIS-096',
  dev.device_id, dev.organization_id,
  'Temperatura salida agua evaporador', 6, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 97/319: Temperatura salida agua condensador (legacy id=7887, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002096, 'CH-SIRENIS-097',
  dev.device_id, dev.organization_id,
  'Temperatura salida agua condensador', 7, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 98/319: Temperatura del aceite en el compresor (legacy id=7888, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002097, 'CH-SIRENIS-098',
  dev.device_id, dev.organization_id,
  'Temperatura del aceite en el compresor', 8, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 99/319: Carga del chiller (legacy id=7915, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002098, 'CH-SIRENIS-099',
  dev.device_id, dev.organization_id,
  'Carga del chiller', 9, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 100/319: Encendidos desde commissioning (legacy id=7916, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002099, 'CH-SIRENIS-100',
  dev.device_id, dev.organization_id,
  'Encendidos desde commissioning', 10, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 101/319: Presión del refrigerante en el condensador (legacy id=7917, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002100, 'CH-SIRENIS-101',
  dev.device_id, dev.organization_id,
  'Presión del refrigerante en el condensador', 11, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 102/319: Presión del aceite del compresor (legacy id=7918, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002101, 'CH-SIRENIS-102',
  dev.device_id, dev.organization_id,
  'Presión del aceite del compresor', 12, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 103/319: Tiempo que lleva encendido (legacy id=7919, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002102, 'CH-SIRENIS-103',
  dev.device_id, dev.organization_id,
  'Tiempo que lleva encendido', 13, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 104/319: Consumo de Amperios relativo de la fase R con respecto al nominal (legacy id=7920, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002103, 'CH-SIRENIS-104',
  dev.device_id, dev.organization_id,
  'Consumo de Amperios relativo de la fase R con respecto al nominal', 14, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 105/319: Consumo de Amperios relativo de la fase S del chiller 4 (legacy id=7921, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002104, 'CH-SIRENIS-105',
  dev.device_id, dev.organization_id,
  'Consumo de Amperios relativo de la fase S del chiller 4', 15, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 106/319: Consumo de Amperios relativo de la fase T con respecto al nominal del chiller 4 (legacy id=7922, equipoId=1778)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2b0f32eb-351a-4171-86a0-d5510a1f19a4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002105, 'CH-SIRENIS-106',
  dev.device_id, dev.organization_id,
  'Consumo de Amperios relativo de la fase T con respecto al nominal del chiller 4', 16, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 107/319: Energia (legacy id=7889, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002106, 'CH-SIRENIS-107',
  dev.device_id, dev.organization_id,
  'Energia', 1, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 108/319: Temperatura consgina (legacy id=7890, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002107, 'CH-SIRENIS-108',
  dev.device_id, dev.organization_id,
  'Temperatura consgina', 1, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 109/319: Temperatura del refrigerante en el evaporador (legacy id=7891, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002108, 'CH-SIRENIS-109',
  dev.device_id, dev.organization_id,
  'Temperatura del refrigerante en el evaporador', 2, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 110/319: Temperatura del refrigerante en el condensador (legacy id=7892, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002109, 'CH-SIRENIS-110',
  dev.device_id, dev.organization_id,
  'Temperatura del refrigerante en el condensador', 3, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 111/319: Temperatura entrada agua evaporador (legacy id=7893, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002110, 'CH-SIRENIS-111',
  dev.device_id, dev.organization_id,
  'Temperatura entrada agua evaporador', 4, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 112/319: Temperatura entrada agua condensador (legacy id=7894, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002111, 'CH-SIRENIS-112',
  dev.device_id, dev.organization_id,
  'Temperatura entrada agua condensador', 5, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 113/319: Temperatura salida agua evaporador (legacy id=7895, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002112, 'CH-SIRENIS-113',
  dev.device_id, dev.organization_id,
  'Temperatura salida agua evaporador', 6, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 114/319: Temperatura salida agua condensador (legacy id=7896, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002113, 'CH-SIRENIS-114',
  dev.device_id, dev.organization_id,
  'Temperatura salida agua condensador', 7, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 115/319: Temperatura del aceite en el compresor (legacy id=7897, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002114, 'CH-SIRENIS-115',
  dev.device_id, dev.organization_id,
  'Temperatura del aceite en el compresor', 8, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 116/319: Carga del chiller (legacy id=7923, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002115, 'CH-SIRENIS-116',
  dev.device_id, dev.organization_id,
  'Carga del chiller', 9, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 117/319: Encendidos desde commissioning (legacy id=7924, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002116, 'CH-SIRENIS-117',
  dev.device_id, dev.organization_id,
  'Encendidos desde commissioning', 10, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 118/319: Presión del refrigerante en el condensador (legacy id=7925, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002117, 'CH-SIRENIS-118',
  dev.device_id, dev.organization_id,
  'Presión del refrigerante en el condensador', 11, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 119/319: Presión del aceite del compresor (legacy id=7926, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002118, 'CH-SIRENIS-119',
  dev.device_id, dev.organization_id,
  'Presión del aceite del compresor', 12, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 120/319: Tiempo que lleva encendido (legacy id=7927, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002119, 'CH-SIRENIS-120',
  dev.device_id, dev.organization_id,
  'Tiempo que lleva encendido', 13, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 121/319: Consumo de Amperios relativo de la fase R con respecto al nominal (legacy id=7928, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002120, 'CH-SIRENIS-121',
  dev.device_id, dev.organization_id,
  'Consumo de Amperios relativo de la fase R con respecto al nominal', 14, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 122/319: Consumo de Amperios relativo de la fase S del chiller 4 (legacy id=7929, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002121, 'CH-SIRENIS-122',
  dev.device_id, dev.organization_id,
  'Consumo de Amperios relativo de la fase S del chiller 4', 15, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 123/319: Consumo de Amperios relativo de la fase T con respecto al nominal del chiller 4 (legacy id=7930, equipoId=1779)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b776b651-ce8f-4a98-970e-36ff0f6f0593')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002122, 'CH-SIRENIS-123',
  dev.device_id, dev.organization_id,
  'Consumo de Amperios relativo de la fase T con respecto al nominal del chiller 4', 16, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 124/319: Energia (legacy id=7898, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002123, 'CH-SIRENIS-124',
  dev.device_id, dev.organization_id,
  'Energia', 1, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 125/319: Temperatura consgina (legacy id=7899, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002124, 'CH-SIRENIS-125',
  dev.device_id, dev.organization_id,
  'Temperatura consgina', 1, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 126/319: Temperatura del refrigerante en el evaporador (legacy id=7900, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002125, 'CH-SIRENIS-126',
  dev.device_id, dev.organization_id,
  'Temperatura del refrigerante en el evaporador', 2, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 127/319: Temperatura del refrigerante en el condensador (legacy id=7901, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002126, 'CH-SIRENIS-127',
  dev.device_id, dev.organization_id,
  'Temperatura del refrigerante en el condensador', 3, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 128/319: Temperatura entrada agua evaporador (legacy id=7902, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002127, 'CH-SIRENIS-128',
  dev.device_id, dev.organization_id,
  'Temperatura entrada agua evaporador', 4, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 129/319: Temperatura entrada agua condensador (legacy id=7903, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002128, 'CH-SIRENIS-129',
  dev.device_id, dev.organization_id,
  'Temperatura entrada agua condensador', 5, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 130/319: Temperatura salida agua evaporador (legacy id=7904, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002129, 'CH-SIRENIS-130',
  dev.device_id, dev.organization_id,
  'Temperatura salida agua evaporador', 6, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 131/319: Temperatura salida agua condensador (legacy id=7905, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002130, 'CH-SIRENIS-131',
  dev.device_id, dev.organization_id,
  'Temperatura salida agua condensador', 7, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 132/319: Temperatura del aceite en el compresor (legacy id=7906, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002131, 'CH-SIRENIS-132',
  dev.device_id, dev.organization_id,
  'Temperatura del aceite en el compresor', 8, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 133/319: Carga del chiller (legacy id=7931, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002132, 'CH-SIRENIS-133',
  dev.device_id, dev.organization_id,
  'Carga del chiller', 9, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 134/319: Encendidos desde commissioning (legacy id=7932, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002133, 'CH-SIRENIS-134',
  dev.device_id, dev.organization_id,
  'Encendidos desde commissioning', 10, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 135/319: Presión del refrigerante en el condensador (legacy id=7933, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002134, 'CH-SIRENIS-135',
  dev.device_id, dev.organization_id,
  'Presión del refrigerante en el condensador', 11, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 136/319: Presión del aceite del compresor (legacy id=7934, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002135, 'CH-SIRENIS-136',
  dev.device_id, dev.organization_id,
  'Presión del aceite del compresor', 12, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 137/319: Tiempo que lleva encendido (legacy id=7935, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002136, 'CH-SIRENIS-137',
  dev.device_id, dev.organization_id,
  'Tiempo que lleva encendido', 13, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 138/319: Consumo de Amperios relativo de la fase R con respecto al nominal (legacy id=7936, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002137, 'CH-SIRENIS-138',
  dev.device_id, dev.organization_id,
  'Consumo de Amperios relativo de la fase R con respecto al nominal', 14, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 139/319: Consumo de Amperios relativo de la fase S del chiller 4 (legacy id=7937, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002138, 'CH-SIRENIS-139',
  dev.device_id, dev.organization_id,
  'Consumo de Amperios relativo de la fase S del chiller 4', 15, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 140/319: Consumo de Amperios relativo de la fase T con respecto al nominal del chiller 4 (legacy id=7938, equipoId=1780)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c5ab23f8-cc76-4f3a-8770-f05d697b4e39')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002139, 'CH-SIRENIS-140',
  dev.device_id, dev.organization_id,
  'Consumo de Amperios relativo de la fase T con respecto al nominal del chiller 4', 16, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 141/319: sirenis1 (legacy id=13781, equipoId=1802)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0e5f4ee9-42d3-4ef1-93c3-846243393c66')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002140, 'CH-SIRENIS-141',
  dev.device_id, dev.organization_id,
  'sirenis1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 142/319: Piscina Familiar Parque Acuático (legacy id=13860, equipoId=1802)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0e5f4ee9-42d3-4ef1-93c3-846243393c66')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002141, 'CH-SIRENIS-142',
  dev.device_id, dev.organization_id,
  'Piscina Familiar Parque Acuático', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 143/319: Cocina Parque Acuático (legacy id=13861, equipoId=1802)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0e5f4ee9-42d3-4ef1-93c3-846243393c66')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002142, 'CH-SIRENIS-143',
  dev.device_id, dev.organization_id,
  'Cocina Parque Acuático', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 144/319: Coffe Shop y Sport Bar (legacy id=13862, equipoId=1802)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0e5f4ee9-42d3-4ef1-93c3-846243393c66')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002143, 'CH-SIRENIS-144',
  dev.device_id, dev.organization_id,
  'Coffe Shop y Sport Bar', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 145/319: Totalizador PARQUE ACUÁTICO (legacy id=13863, equipoId=1802)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0e5f4ee9-42d3-4ef1-93c3-846243393c66')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002144, 'CH-SIRENIS-145',
  dev.device_id, dev.organization_id,
  'Totalizador PARQUE ACUÁTICO', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 146/319: Kids Club, Tiendas, Consultorio Medico y GYM (legacy id=13864, equipoId=1802)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0e5f4ee9-42d3-4ef1-93c3-846243393c66')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002145, 'CH-SIRENIS-146',
  dev.device_id, dev.organization_id,
  'Kids Club, Tiendas, Consultorio Medico y GYM', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 147/319: Plaza Eventos (legacy id=13865, equipoId=1802)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0e5f4ee9-42d3-4ef1-93c3-846243393c66')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002146, 'CH-SIRENIS-147',
  dev.device_id, dev.organization_id,
  'Plaza Eventos', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 148/319: Otras Cargas-Bombas Piscinas, Farolas Avenida de ingreso (Virtual) (legacy id=14099, equipoId=1802)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0e5f4ee9-42d3-4ef1-93c3-846243393c66')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002147, 'CH-SIRENIS-148',
  dev.device_id, dev.organization_id,
  'Otras Cargas-Bombas Piscinas, Farolas Avenida de ingreso (Virtual)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 149/319: sirenis1 (legacy id=13782, equipoId=1803)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2a7f495d-cdb4-474e-8a44-e9dc98eb5337')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002148, 'CH-SIRENIS-149',
  dev.device_id, dev.organization_id,
  'sirenis1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 150/319: Otras Cargas-SSGG poco consumo (Virtual) (legacy id=14100, equipoId=1803)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2a7f495d-cdb4-474e-8a44-e9dc98eb5337')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002149, 'CH-SIRENIS-150',
  dev.device_id, dev.organization_id,
  'Otras Cargas-SSGG poco consumo (Virtual)', 900, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 151/319: Ejecutivos (legacy id=13872, equipoId=1803)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2a7f495d-cdb4-474e-8a44-e9dc98eb5337')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002150, 'CH-SIRENIS-151',
  dev.device_id, dev.organization_id,
  'Ejecutivos', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 152/319: Equipos Lavandería (legacy id=13873, equipoId=1803)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2a7f495d-cdb4-474e-8a44-e9dc98eb5337')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002151, 'CH-SIRENIS-152',
  dev.device_id, dev.organization_id,
  'Equipos Lavandería', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 153/319: Servicios Generales para Operaciones (legacy id=13874, equipoId=1803)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2a7f495d-cdb4-474e-8a44-e9dc98eb5337')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002152, 'CH-SIRENIS-153',
  dev.device_id, dev.organization_id,
  'Servicios Generales para Operaciones', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 154/319: Grupo Presión (legacy id=13875, equipoId=1803)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2a7f495d-cdb4-474e-8a44-e9dc98eb5337')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002153, 'CH-SIRENIS-154',
  dev.device_id, dev.organization_id,
  'Grupo Presión', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 155/319: Alojamientos y Zona Puerta Principal (Per.Trop) (legacy id=13876, equipoId=1803)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2a7f495d-cdb4-474e-8a44-e9dc98eb5337')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002154, 'CH-SIRENIS-155',
  dev.device_id, dev.organization_id,
  'Alojamientos y Zona Puerta Principal (Per.Trop)', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 156/319: Totalizador Lavandería (legacy id=13877, equipoId=1803)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2a7f495d-cdb4-474e-8a44-e9dc98eb5337')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002155, 'CH-SIRENIS-156',
  dev.device_id, dev.organization_id,
  'Totalizador Lavandería', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 157/319: sirenis1 (legacy id=13784, equipoId=1805)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948759d7-6b76-4037-8504-a8e6ba508e62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002156, 'CH-SIRENIS-157',
  dev.device_id, dev.organization_id,
  'sirenis1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 158/319: Iluminación Planta industrial (legacy id=13884, equipoId=1805)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948759d7-6b76-4037-8504-a8e6ba508e62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002157, 'CH-SIRENIS-158',
  dev.device_id, dev.organization_id,
  'Iluminación Planta industrial', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 159/319: Bombas de recirculación primaria caldera (legacy id=13885, equipoId=1805)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948759d7-6b76-4037-8504-a8e6ba508e62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002158, 'CH-SIRENIS-159',
  dev.device_id, dev.organization_id,
  'Bombas de recirculación primaria caldera', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 160/319: TOTALIZADOR TABLERO 2 (208V) (legacy id=13886, equipoId=1805)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948759d7-6b76-4037-8504-a8e6ba508e62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002159, 'CH-SIRENIS-160',
  dev.device_id, dev.organization_id,
  'TOTALIZADOR TABLERO 2 (208V)', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 161/319: Alojamiento edificio 3 y SSGG Empleados (legacy id=13887, equipoId=1805)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948759d7-6b76-4037-8504-a8e6ba508e62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002160, 'CH-SIRENIS-161',
  dev.device_id, dev.organization_id,
  'Alojamiento edificio 3 y SSGG Empleados', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 162/319: Bombas de recirculación secundaria agua caliente (legacy id=13888, equipoId=1805)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948759d7-6b76-4037-8504-a8e6ba508e62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002161, 'CH-SIRENIS-162',
  dev.device_id, dev.organization_id,
  'Bombas de recirculación secundaria agua caliente', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 163/319: Osmosis Planta (legacy id=13889, equipoId=1805)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948759d7-6b76-4037-8504-a8e6ba508e62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002162, 'CH-SIRENIS-163',
  dev.device_id, dev.organization_id,
  'Osmosis Planta', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 164/319: Otras Cargas-SSGG, control Grupo Electrógeno (Virtual) (legacy id=14101, equipoId=1805)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '948759d7-6b76-4037-8504-a8e6ba508e62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002163, 'CH-SIRENIS-164',
  dev.device_id, dev.organization_id,
  'Otras Cargas-SSGG, control Grupo Electrógeno (Virtual)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 165/319: sirenis1 (legacy id=13786, equipoId=1807)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1bba1670-9bbb-449c-b81e-905e762a7385')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002164, 'CH-SIRENIS-165',
  dev.device_id, dev.organization_id,
  'sirenis1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 166/319: Roof Top 1 Steak House (legacy id=13866, equipoId=1807)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1bba1670-9bbb-449c-b81e-905e762a7385')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002165, 'CH-SIRENIS-166',
  dev.device_id, dev.organization_id,
  'Roof Top 1 Steak House', 1, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 167/319: Roof Top 2 Steak House (legacy id=13867, equipoId=1807)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1bba1670-9bbb-449c-b81e-905e762a7385')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002166, 'CH-SIRENIS-167',
  dev.device_id, dev.organization_id,
  'Roof Top 2 Steak House', 2, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 168/319: Roof Top 3 Steak House (legacy id=13868, equipoId=1807)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1bba1670-9bbb-449c-b81e-905e762a7385')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002167, 'CH-SIRENIS-168',
  dev.device_id, dev.organization_id,
  'Roof Top 3 Steak House', 3, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 169/319: Cámara de Refrigeración Steak House (legacy id=13869, equipoId=1807)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1bba1670-9bbb-449c-b81e-905e762a7385')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002168, 'CH-SIRENIS-169',
  dev.device_id, dev.organization_id,
  'Cámara de Refrigeración Steak House', 4, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 170/319: Cocina, Restaurant y Bar Steak House (legacy id=13870, equipoId=1807)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1bba1670-9bbb-449c-b81e-905e762a7385')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002169, 'CH-SIRENIS-170',
  dev.device_id, dev.organization_id,
  'Cocina, Restaurant y Bar Steak House', 5, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 171/319: Totalizador Steak House (legacy id=13871, equipoId=1807)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1bba1670-9bbb-449c-b81e-905e762a7385')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002170, 'CH-SIRENIS-171',
  dev.device_id, dev.organization_id,
  'Totalizador Steak House', 6, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 172/319: Otras Cargas-Edificios (03), Bombas Piscina Playa (Virtual) (legacy id=14096, equipoId=1807)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '1bba1670-9bbb-449c-b81e-905e762a7385')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002171, 'CH-SIRENIS-172',
  dev.device_id, dev.organization_id,
  'Otras Cargas-Edificios (03), Bombas Piscina Playa (Virtual)', 900, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 173/319: sirenis1 (legacy id=13787, equipoId=1808)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'bb9eca17-8fbc-44d8-b3f2-9587e20bd979')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002172, 'CH-SIRENIS-173',
  dev.device_id, dev.organization_id,
  'sirenis1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 174/319: Roof Top 1 y 2 Japonés (legacy id=13854, equipoId=1808)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'bb9eca17-8fbc-44d8-b3f2-9587e20bd979')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002173, 'CH-SIRENIS-174',
  dev.device_id, dev.organization_id,
  'Roof Top 1 y 2 Japonés', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 175/319: Roof Top 1 Italiano (legacy id=13855, equipoId=1808)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'bb9eca17-8fbc-44d8-b3f2-9587e20bd979')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002174, 'CH-SIRENIS-175',
  dev.device_id, dev.organization_id,
  'Roof Top 1 Italiano', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 176/319: Roof Top 2 Italiano (legacy id=13856, equipoId=1808)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'bb9eca17-8fbc-44d8-b3f2-9587e20bd979')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002175, 'CH-SIRENIS-176',
  dev.device_id, dev.organization_id,
  'Roof Top 2 Italiano', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 177/319: Equipos de refrigeración (legacy id=13857, equipoId=1808)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'bb9eca17-8fbc-44d8-b3f2-9587e20bd979')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002176, 'CH-SIRENIS-177',
  dev.device_id, dev.organization_id,
  'Equipos de refrigeración', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 178/319: Totalizador Temáticos  (legacy id=13858, equipoId=1808)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'bb9eca17-8fbc-44d8-b3f2-9587e20bd979')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002177, 'CH-SIRENIS-178',
  dev.device_id, dev.organization_id,
  'Totalizador Temáticos ', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 179/319: Totalizador SPA (legacy id=13859, equipoId=1808)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'bb9eca17-8fbc-44d8-b3f2-9587e20bd979')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002178, 'CH-SIRENIS-179',
  dev.device_id, dev.organization_id,
  'Totalizador SPA', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 180/319: Otras Cargas-Cocina Japonés e Italiano, SSGG (Virtual) (legacy id=14097, equipoId=1808)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'bb9eca17-8fbc-44d8-b3f2-9587e20bd979')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002179, 'CH-SIRENIS-180',
  dev.device_id, dev.organization_id,
  'Otras Cargas-Cocina Japonés e Italiano, SSGG (Virtual)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 181/319: sirenis1 (legacy id=13788, equipoId=1809)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'eca28267-d2c5-4ad0-9c60-b734655bc2f9')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002180, 'CH-SIRENIS-181',
  dev.device_id, dev.organization_id,
  'sirenis1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 182/319: Cocina 1 Macao (legacy id=13830, equipoId=1809)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'eca28267-d2c5-4ad0-9c60-b734655bc2f9')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002181, 'CH-SIRENIS-182',
  dev.device_id, dev.organization_id,
  'Cocina 1 Macao', 1, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 183/319: Cocina 2 Macao (legacy id=13831, equipoId=1809)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'eca28267-d2c5-4ad0-9c60-b734655bc2f9')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002182, 'CH-SIRENIS-183',
  dev.device_id, dev.organization_id,
  'Cocina 2 Macao', 2, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 184/319: Discoteca (legacy id=13832, equipoId=1809)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'eca28267-d2c5-4ad0-9c60-b734655bc2f9')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002183, 'CH-SIRENIS-184',
  dev.device_id, dev.organization_id,
  'Discoteca', 3, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 185/319: Cámara 1 (legacy id=13833, equipoId=1809)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'eca28267-d2c5-4ad0-9c60-b734655bc2f9')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002184, 'CH-SIRENIS-185',
  dev.device_id, dev.organization_id,
  'Cámara 1', 4, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 186/319: Cámara 2 (legacy id=13834, equipoId=1809)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'eca28267-d2c5-4ad0-9c60-b734655bc2f9')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002185, 'CH-SIRENIS-186',
  dev.device_id, dev.organization_id,
  'Cámara 2', 5, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 187/319: Totalizador Cocotal (legacy id=13835, equipoId=1809)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'eca28267-d2c5-4ad0-9c60-b734655bc2f9')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002186, 'CH-SIRENIS-187',
  dev.device_id, dev.organization_id,
  'Totalizador Cocotal', 6, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 188/319: sirenis1 (legacy id=13789, equipoId=1810)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0cb251b2-af55-4cdf-99cf-0a1d16fd2733')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002187, 'CH-SIRENIS-188',
  dev.device_id, dev.organization_id,
  'sirenis1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 189/319: Otras Cargas-Edificios (01), Comedor Ejecutivo y SSGG(Virtual) (legacy id=14098, equipoId=1810)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0cb251b2-af55-4cdf-99cf-0a1d16fd2733')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002188, 'CH-SIRENIS-189',
  dev.device_id, dev.organization_id,
  'Otras Cargas-Edificios (01), Comedor Ejecutivo y SSGG(Virtual)', 900, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 190/319: Teatro (legacy id=13836, equipoId=1810)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0cb251b2-af55-4cdf-99cf-0a1d16fd2733')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002189, 'CH-SIRENIS-190',
  dev.device_id, dev.organization_id,
  'Teatro', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 191/319: Equipos Buffet 1 Macao (legacy id=13837, equipoId=1810)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0cb251b2-af55-4cdf-99cf-0a1d16fd2733')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002190, 'CH-SIRENIS-191',
  dev.device_id, dev.organization_id,
  'Equipos Buffet 1 Macao', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 192/319: Equipos Buffet 2 Macao (legacy id=13838, equipoId=1810)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0cb251b2-af55-4cdf-99cf-0a1d16fd2733')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002191, 'CH-SIRENIS-192',
  dev.device_id, dev.organization_id,
  'Equipos Buffet 2 Macao', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 193/319: Oficinas Administrativa (legacy id=13839, equipoId=1810)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0cb251b2-af55-4cdf-99cf-0a1d16fd2733')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002192, 'CH-SIRENIS-193',
  dev.device_id, dev.organization_id,
  'Oficinas Administrativa', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 194/319: Cámara 3 Principal Hotel (legacy id=13840, equipoId=1810)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0cb251b2-af55-4cdf-99cf-0a1d16fd2733')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002193, 'CH-SIRENIS-194',
  dev.device_id, dev.organization_id,
  'Cámara 3 Principal Hotel', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 195/319: Cámara Economato, Bar lobby (legacy id=13841, equipoId=1810)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '0cb251b2-af55-4cdf-99cf-0a1d16fd2733')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002194, 'CH-SIRENIS-195',
  dev.device_id, dev.organization_id,
  'Cámara Economato, Bar lobby', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 196/319: sirenis1 (legacy id=13790, equipoId=1811)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '089b07cd-66fa-4ace-906b-17ae21e60e80')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002195, 'CH-SIRENIS-196',
  dev.device_id, dev.organization_id,
  'sirenis1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 197/319: Cocina Saona 1 (legacy id=13842, equipoId=1811)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '089b07cd-66fa-4ace-906b-17ae21e60e80')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002196, 'CH-SIRENIS-197',
  dev.device_id, dev.organization_id,
  'Cocina Saona 1', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 198/319: Lobby (legacy id=13843, equipoId=1811)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '089b07cd-66fa-4ace-906b-17ae21e60e80')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002197, 'CH-SIRENIS-198',
  dev.device_id, dev.organization_id,
  'Lobby', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 199/319: Manejadora Saona (legacy id=13844, equipoId=1811)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '089b07cd-66fa-4ace-906b-17ae21e60e80')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002198, 'CH-SIRENIS-199',
  dev.device_id, dev.organization_id,
  'Manejadora Saona', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 200/319: Cocina Saona 2 (legacy id=13845, equipoId=1811)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '089b07cd-66fa-4ace-906b-17ae21e60e80')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002199, 'CH-SIRENIS-200',
  dev.device_id, dev.organization_id,
  'Cocina Saona 2', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 201/319: Cocina 2 (legacy id=13846, equipoId=1811)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '089b07cd-66fa-4ace-906b-17ae21e60e80')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002200, 'CH-SIRENIS-201',
  dev.device_id, dev.organization_id,
  'Cocina 2', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 202/319: Totalizador Tropical (legacy id=13847, equipoId=1811)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '089b07cd-66fa-4ace-906b-17ae21e60e80')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002201, 'CH-SIRENIS-202',
  dev.device_id, dev.organization_id,
  'Totalizador Tropical', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 203/319: Otras Cargas-Edificio 30 (Virtual) (legacy id=14116, equipoId=1811)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '089b07cd-66fa-4ace-906b-17ae21e60e80')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002202, 'CH-SIRENIS-203',
  dev.device_id, dev.organization_id,
  'Otras Cargas-Edificio 30 (Virtual)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 204/319: sirenis1 (legacy id=13791, equipoId=1812)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'f58e5ffc-75ec-41cf-b60c-6bec6b9b80b2')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002203, 'CH-SIRENIS-204',
  dev.device_id, dev.organization_id,
  'sirenis1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 205/319: Cocina 3 (legacy id=13848, equipoId=1812)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'f58e5ffc-75ec-41cf-b60c-6bec6b9b80b2')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002204, 'CH-SIRENIS-205',
  dev.device_id, dev.organization_id,
  'Cocina 3', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 206/319: Restaurante Rodizio (legacy id=13849, equipoId=1812)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'f58e5ffc-75ec-41cf-b60c-6bec6b9b80b2')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002205, 'CH-SIRENIS-206',
  dev.device_id, dev.organization_id,
  'Restaurante Rodizio', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 207/319: Bufet Saona (legacy id=13850, equipoId=1812)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'f58e5ffc-75ec-41cf-b60c-6bec6b9b80b2')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002206, 'CH-SIRENIS-207',
  dev.device_id, dev.organization_id,
  'Bufet Saona', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 208/319: Cámara de frio (Sótano) (legacy id=13851, equipoId=1812)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'f58e5ffc-75ec-41cf-b60c-6bec6b9b80b2')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002207, 'CH-SIRENIS-208',
  dev.device_id, dev.organization_id,
  'Cámara de frio (Sótano)', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 209/319: Alimentación Saona (legacy id=13852, equipoId=1812)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'f58e5ffc-75ec-41cf-b60c-6bec6b9b80b2')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002208, 'CH-SIRENIS-209',
  dev.device_id, dev.organization_id,
  'Alimentación Saona', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 210/319: Alimentación Exterior (legacy id=13853, equipoId=1812)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'f58e5ffc-75ec-41cf-b60c-6bec6b9b80b2')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002209, 'CH-SIRENIS-210',
  dev.device_id, dev.organization_id,
  'Alimentación Exterior', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 211/319: sirenis1 (legacy id=13792, equipoId=1813)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '044e3c7d-516c-4345-a217-e6d13549c8bf')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002210, 'CH-SIRENIS-211',
  dev.device_id, dev.organization_id,
  'sirenis1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 212/319: Manejadora 1  y 2 Restaurante Macao (legacy id=13896, equipoId=1813)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '044e3c7d-516c-4345-a217-e6d13549c8bf')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002211, 'CH-SIRENIS-212',
  dev.device_id, dev.organization_id,
  'Manejadora 1  y 2 Restaurante Macao', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 213/319: Bar lobby (legacy id=13897, equipoId=1813)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '044e3c7d-516c-4345-a217-e6d13549c8bf')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002212, 'CH-SIRENIS-213',
  dev.device_id, dev.organization_id,
  'Bar lobby', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 214/319: Cámara de frio Economato (legacy id=13898, equipoId=1813)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '044e3c7d-516c-4345-a217-e6d13549c8bf')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002213, 'CH-SIRENIS-214',
  dev.device_id, dev.organization_id,
  'Cámara de frio Economato', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 215/319: Manejadora 4 y 5 Buffet Macao (legacy id=13899, equipoId=1813)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '044e3c7d-516c-4345-a217-e6d13549c8bf')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002214, 'CH-SIRENIS-215',
  dev.device_id, dev.organization_id,
  'Manejadora 4 y 5 Buffet Macao', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 216/319: Bomba de Recirculación Chillers (legacy id=13900, equipoId=1813)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '044e3c7d-516c-4345-a217-e6d13549c8bf')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002215, 'CH-SIRENIS-216',
  dev.device_id, dev.organization_id,
  'Bomba de Recirculación Chillers', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 217/319: Manejadora 3 Restaurante Frances (legacy id=13901, equipoId=1813)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '044e3c7d-516c-4345-a217-e6d13549c8bf')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002216, 'CH-SIRENIS-217',
  dev.device_id, dev.organization_id,
  'Manejadora 3 Restaurante Frances', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 218/319: Totalizador Economato y Bar Lobby (legacy id=31585, equipoId=1813)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '044e3c7d-516c-4345-a217-e6d13549c8bf')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002217, 'CH-SIRENIS-218',
  dev.device_id, dev.organization_id,
  'Totalizador Economato y Bar Lobby', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 219/319: sirenis1 (legacy id=13793, equipoId=1814)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ec903e09-64a2-4948-b8c6-8d45cfb2d5c1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002218, 'CH-SIRENIS-219',
  dev.device_id, dev.organization_id,
  'sirenis1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 220/319: TOTALIZADOR TABLERO 3 CHILLERS (480V) (legacy id=13890, equipoId=1814)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ec903e09-64a2-4948-b8c6-8d45cfb2d5c1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002219, 'CH-SIRENIS-220',
  dev.device_id, dev.organization_id,
  'TOTALIZADOR TABLERO 3 CHILLERS (480V)', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 221/319: Chiller 1 (legacy id=13891, equipoId=1814)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ec903e09-64a2-4948-b8c6-8d45cfb2d5c1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002220, 'CH-SIRENIS-221',
  dev.device_id, dev.organization_id,
  'Chiller 1', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 222/319: Chiller 3 (legacy id=13892, equipoId=1814)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ec903e09-64a2-4948-b8c6-8d45cfb2d5c1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002221, 'CH-SIRENIS-222',
  dev.device_id, dev.organization_id,
  'Chiller 3', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 223/319: TOTALIZADOR TABLERO 5 CHILLERS (480V) (legacy id=13893, equipoId=1814)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ec903e09-64a2-4948-b8c6-8d45cfb2d5c1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002222, 'CH-SIRENIS-223',
  dev.device_id, dev.organization_id,
  'TOTALIZADOR TABLERO 5 CHILLERS (480V)', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 224/319: Chiller 4 (legacy id=13894, equipoId=1814)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ec903e09-64a2-4948-b8c6-8d45cfb2d5c1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002223, 'CH-SIRENIS-224',
  dev.device_id, dev.organization_id,
  'Chiller 4', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 225/319: Osmosis y Bombas recirculación agua helada (legacy id=13895, equipoId=1814)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ec903e09-64a2-4948-b8c6-8d45cfb2d5c1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002224, 'CH-SIRENIS-225',
  dev.device_id, dev.organization_id,
  'Osmosis y Bombas recirculación agua helada', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 226/319: Otras Cargas-Torres de enfriamiento, bombas Chillers (Virtual) (legacy id=14117, equipoId=1814)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ec903e09-64a2-4948-b8c6-8d45cfb2d5c1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002225, 'CH-SIRENIS-226',
  dev.device_id, dev.organization_id,
  'Otras Cargas-Torres de enfriamiento, bombas Chillers (Virtual)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 227/319: sirenis1 (legacy id=13783, equipoId=1804)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'da516fb7-eefa-4553-90fd-434844303afc')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002226, 'CH-SIRENIS-227',
  dev.device_id, dev.organization_id,
  'sirenis1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 228/319: Otras Cargas Hotel: Edificios, etc. (Virtual) (legacy id=14153, equipoId=1804)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'da516fb7-eefa-4553-90fd-434844303afc')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002227, 'CH-SIRENIS-228',
  dev.device_id, dev.organization_id,
  'Otras Cargas Hotel: Edificios, etc. (Virtual)', 900, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 229/319: Sub Total Cargas en Medición (Virtual) (legacy id=14154, equipoId=1804)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'da516fb7-eefa-4553-90fd-434844303afc')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002228, 'CH-SIRENIS-229',
  dev.device_id, dev.organization_id,
  'Sub Total Cargas en Medición (Virtual)', 901, 3, NULL, NULL,
  false, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 230/319: Totalizador Sirenis Punta Cana (legacy id=13829, equipoId=1804)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'da516fb7-eefa-4553-90fd-434844303afc')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002229, 'CH-SIRENIS-230',
  dev.device_id, dev.organization_id,
  'Totalizador Sirenis Punta Cana', 257, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 231/319: Totalizador MENOS Parque acuático (V) (legacy id=32195, equipoId=1804)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'da516fb7-eefa-4553-90fd-434844303afc')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002230, 'CH-SIRENIS-231',
  dev.device_id, dev.organization_id,
  'Totalizador MENOS Parque acuático (V)', 902, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 232/319: Corriente XAAC1 (legacy id=14609, equipoId=1889)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '24d8b4a7-c380-49d9-af99-cf379a722d60')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002231, 'CH-SIRENIS-232',
  dev.device_id, dev.organization_id,
  'Corriente XAAC1', 1, NULL, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 233/319: VFD XAAC1 (legacy id=14608, equipoId=1889)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '24d8b4a7-c380-49d9-af99-cf379a722d60')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002232, 'CH-SIRENIS-233',
  dev.device_id, dev.organization_id,
  'VFD XAAC1', 1, NULL, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 234/319: PID Setpoint XAAC1 (legacy id=14616, equipoId=1889)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '24d8b4a7-c380-49d9-af99-cf379a722d60')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002233, 'CH-SIRENIS-234',
  dev.device_id, dev.organization_id,
  'PID Setpoint XAAC1', 2, 0, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 235/319: Frecuancia - XAAC1 (legacy id=30333, equipoId=1889)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '24d8b4a7-c380-49d9-af99-cf379a722d60')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002234, 'CH-SIRENIS-235',
  dev.device_id, dev.organization_id,
  'Frecuancia - XAAC1', 3, 0, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 236/319: Corriente XAAC2 (legacy id=14611, equipoId=1890)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2a9efbbd-2503-4f54-bb5a-a5e290ad0bd4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002235, 'CH-SIRENIS-236',
  dev.device_id, dev.organization_id,
  'Corriente XAAC2', 1, NULL, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 237/319: VFD XAAC2 (legacy id=14610, equipoId=1890)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2a9efbbd-2503-4f54-bb5a-a5e290ad0bd4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002236, 'CH-SIRENIS-237',
  dev.device_id, dev.organization_id,
  'VFD XAAC2', 1, NULL, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 238/319: PID Setpoint XAAC2 (legacy id=14617, equipoId=1890)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2a9efbbd-2503-4f54-bb5a-a5e290ad0bd4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002237, 'CH-SIRENIS-238',
  dev.device_id, dev.organization_id,
  'PID Setpoint XAAC2', 2, 0, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 239/319: Frecuencia - XAAC2 (legacy id=30334, equipoId=1890)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '2a9efbbd-2503-4f54-bb5a-a5e290ad0bd4')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002238, 'CH-SIRENIS-239',
  dev.device_id, dev.organization_id,
  'Frecuencia - XAAC2', 3, 0, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 240/319: Corriente LOBBY (legacy id=14613, equipoId=1891)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '766ae888-6fd8-4197-adc2-f82844aca6cd')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002239, 'CH-SIRENIS-240',
  dev.device_id, dev.organization_id,
  'Corriente LOBBY', 1, NULL, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 241/319: VFD Lobby (legacy id=14612, equipoId=1891)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '766ae888-6fd8-4197-adc2-f82844aca6cd')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002240, 'CH-SIRENIS-241',
  dev.device_id, dev.organization_id,
  'VFD Lobby', 1, NULL, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 242/319: PID Setpoint LOBBY (legacy id=14618, equipoId=1891)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '766ae888-6fd8-4197-adc2-f82844aca6cd')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002241, 'CH-SIRENIS-242',
  dev.device_id, dev.organization_id,
  'PID Setpoint LOBBY', 2, 0, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 243/319: Frecuencia - Lobby (legacy id=30335, equipoId=1891)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '766ae888-6fd8-4197-adc2-f82844aca6cd')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002242, 'CH-SIRENIS-243',
  dev.device_id, dev.organization_id,
  'Frecuencia - Lobby', 3, 0, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 244/319: xx (legacy id=41853, equipoId=3863)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b0ad4ea4-0b0e-4380-8c67-de7286d15b5e')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002243, 'CH-SIRENIS-244',
  dev.device_id, dev.organization_id,
  'xx', 99, NULL, NULL, NULL,
  true, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 245/319: BTU XACC-1 (legacy id=41854, equipoId=3863)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b0ad4ea4-0b0e-4380-8c67-de7286d15b5e')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002244, 'CH-SIRENIS-245',
  dev.device_id, dev.organization_id,
  'BTU XACC-1', 1, 0, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 246/319: BTU XACC-2 (legacy id=41855, equipoId=3863)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b0ad4ea4-0b0e-4380-8c67-de7286d15b5e')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002245, 'CH-SIRENIS-246',
  dev.device_id, dev.organization_id,
  'BTU XACC-2', 2, 0, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 247/319: BTU Lobby-1 (legacy id=41856, equipoId=3863)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b0ad4ea4-0b0e-4380-8c67-de7286d15b5e')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002246, 'CH-SIRENIS-247',
  dev.device_id, dev.organization_id,
  'BTU Lobby-1', 3, 0, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 248/319: BTU Lobby-2 (legacy id=41857, equipoId=3863)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b0ad4ea4-0b0e-4380-8c67-de7286d15b5e')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002247, 'CH-SIRENIS-248',
  dev.device_id, dev.organization_id,
  'BTU Lobby-2', 4, 0, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 249/319: BTU Tematicos (legacy id=41858, equipoId=3863)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'b0ad4ea4-0b0e-4380-8c67-de7286d15b5e')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002248, 'CH-SIRENIS-249',
  dev.device_id, dev.organization_id,
  'BTU Tematicos', 5, 0, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 250/319: UMA Lobby (legacy id=6426, equipoId=1668)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c155c8b9-a2ae-4018-86aa-6b25a8570160')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002249, 'CH-SIRENIS-250',
  dev.device_id, dev.organization_id,
  'UMA Lobby', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 251/319: Lobby Bar 1 (legacy id=6466, equipoId=1668)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c155c8b9-a2ae-4018-86aa-6b25a8570160')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002250, 'CH-SIRENIS-251',
  dev.device_id, dev.organization_id,
  'Lobby Bar 1', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 252/319: Calentadora de Lavalozas (legacy id=6467, equipoId=1668)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c155c8b9-a2ae-4018-86aa-6b25a8570160')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002251, 'CH-SIRENIS-252',
  dev.device_id, dev.organization_id,
  'Calentadora de Lavalozas', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 253/319: Front Desk 1 (legacy id=6468, equipoId=1668)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c155c8b9-a2ae-4018-86aa-6b25a8570160')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002252, 'CH-SIRENIS-253',
  dev.device_id, dev.organization_id,
  'Front Desk 1', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 254/319: Front Desk 2 (legacy id=6469, equipoId=1668)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c155c8b9-a2ae-4018-86aa-6b25a8570160')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002253, 'CH-SIRENIS-254',
  dev.device_id, dev.organization_id,
  'Front Desk 2', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 255/319: Luces zona exterior (legacy id=6470, equipoId=1668)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c155c8b9-a2ae-4018-86aa-6b25a8570160')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002254, 'CH-SIRENIS-255',
  dev.device_id, dev.organization_id,
  'Luces zona exterior', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 256/319: Torre de Enfriamiento (legacy id=6526, equipoId=1668)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c155c8b9-a2ae-4018-86aa-6b25a8570160')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002255, 'CH-SIRENIS-256',
  dev.device_id, dev.organization_id,
  'Torre de Enfriamiento', 257, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 257/319: Toma corrientes (legacy id=6430, equipoId=1669)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c2016124-531b-429f-afd9-2f574a88508c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002256, 'CH-SIRENIS-257',
  dev.device_id, dev.organization_id,
  'Toma corrientes', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 258/319: Cuarto frio 3 (legacy id=6677, equipoId=1669)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c2016124-531b-429f-afd9-2f574a88508c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002257, 'CH-SIRENIS-258',
  dev.device_id, dev.organization_id,
  'Cuarto frio 3', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 259/319: Horno (legacy id=6678, equipoId=1669)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c2016124-531b-429f-afd9-2f574a88508c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002258, 'CH-SIRENIS-259',
  dev.device_id, dev.organization_id,
  'Horno', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 260/319: Extractor 1 (legacy id=6679, equipoId=1669)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c2016124-531b-429f-afd9-2f574a88508c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002259, 'CH-SIRENIS-260',
  dev.device_id, dev.organization_id,
  'Extractor 1', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 261/319: Rebanadora (legacy id=6681, equipoId=1669)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c2016124-531b-429f-afd9-2f574a88508c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002260, 'CH-SIRENIS-261',
  dev.device_id, dev.organization_id,
  'Rebanadora', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 262/319: Luz Cuarto Frio pescados (legacy id=6682, equipoId=1669)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c2016124-531b-429f-afd9-2f574a88508c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002261, 'CH-SIRENIS-262',
  dev.device_id, dev.organization_id,
  'Luz Cuarto Frio pescados', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 263/319: Otras Cargas Cocina 2 (V) (legacy id=6683, equipoId=1669)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'c2016124-531b-429f-afd9-2f574a88508c')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002262, 'CH-SIRENIS-263',
  dev.device_id, dev.organization_id,
  'Otras Cargas Cocina 2 (V)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 264/319: Otras Cargas (V) (legacy id=6534, equipoId=1671)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ac82b508-cab1-452c-adcb-589a2b7cd99f')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002263, 'CH-SIRENIS-264',
  dev.device_id, dev.organization_id,
  'Otras Cargas (V)', 900, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 265/319: IG Casa Alma (legacy id=6432, equipoId=1671)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ac82b508-cab1-452c-adcb-589a2b7cd99f')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002264, 'CH-SIRENIS-265',
  dev.device_id, dev.organization_id,
  'IG Casa Alma', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 266/319: IG Cocina (legacy id=6529, equipoId=1671)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ac82b508-cab1-452c-adcb-589a2b7cd99f')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002265, 'CH-SIRENIS-266',
  dev.device_id, dev.organization_id,
  'IG Cocina', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 267/319: HVAC + Luces y Contactos (legacy id=6530, equipoId=1671)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ac82b508-cab1-452c-adcb-589a2b7cd99f')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002266, 'CH-SIRENIS-267',
  dev.device_id, dev.organization_id,
  'HVAC + Luces y Contactos', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 268/319: Cuarto de Bombas (legacy id=6531, equipoId=1671)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ac82b508-cab1-452c-adcb-589a2b7cd99f')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002267, 'CH-SIRENIS-268',
  dev.device_id, dev.organization_id,
  'Cuarto de Bombas', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 269/319: Bancada 2 (legacy id=6532, equipoId=1671)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ac82b508-cab1-452c-adcb-589a2b7cd99f')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002268, 'CH-SIRENIS-269',
  dev.device_id, dev.organization_id,
  'Bancada 2', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 270/319: Iluminacion y Tomacorrientes (legacy id=6533, equipoId=1671)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'ac82b508-cab1-452c-adcb-589a2b7cd99f')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002269, 'CH-SIRENIS-270',
  dev.device_id, dev.organization_id,
  'Iluminacion y Tomacorrientes', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 271/319: IG SPA (legacy id=6433, equipoId=1672)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '85fc19a4-19f1-498a-a337-6aa599a2b7cd')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002270, 'CH-SIRENIS-271',
  dev.device_id, dev.organization_id,
  'IG SPA', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 272/319: Clima 3 (legacy id=6482, equipoId=1672)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '85fc19a4-19f1-498a-a337-6aa599a2b7cd')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002271, 'CH-SIRENIS-272',
  dev.device_id, dev.organization_id,
  'Clima 3', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 273/319: Clima 2 (legacy id=6483, equipoId=1672)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '85fc19a4-19f1-498a-a337-6aa599a2b7cd')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002272, 'CH-SIRENIS-273',
  dev.device_id, dev.organization_id,
  'Clima 2', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 274/319: Clima 1 (legacy id=6484, equipoId=1672)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '85fc19a4-19f1-498a-a337-6aa599a2b7cd')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002273, 'CH-SIRENIS-274',
  dev.device_id, dev.organization_id,
  'Clima 1', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 275/319: Cargas cocina (legacy id=6485, equipoId=1672)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '85fc19a4-19f1-498a-a337-6aa599a2b7cd')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002274, 'CH-SIRENIS-275',
  dev.device_id, dev.organization_id,
  'Cargas cocina', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 276/319: Gimnasio (legacy id=6486, equipoId=1672)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '85fc19a4-19f1-498a-a337-6aa599a2b7cd')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002275, 'CH-SIRENIS-276',
  dev.device_id, dev.organization_id,
  'Gimnasio', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 277/319: Otras cargas SPA (Bombas) (legacy id=6487, equipoId=1672)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '85fc19a4-19f1-498a-a337-6aa599a2b7cd')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002276, 'CH-SIRENIS-277',
  dev.device_id, dev.organization_id,
  'Otras cargas SPA (Bombas)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 278/319: Cuartos frios cocinas 1 y 2 (legacy id=6434, equipoId=1673)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '41e419f7-8ca3-42f0-b473-0971107183ec')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002277, 'CH-SIRENIS-278',
  dev.device_id, dev.organization_id,
  'Cuartos frios cocinas 1 y 2', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 279/319: Pastelería (Cuarto frío) (legacy id=6476, equipoId=1673)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '41e419f7-8ca3-42f0-b473-0971107183ec')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002278, 'CH-SIRENIS-279',
  dev.device_id, dev.organization_id,
  'Pastelería (Cuarto frío)', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 280/319: UMA Comedor 1 (legacy id=6477, equipoId=1673)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '41e419f7-8ca3-42f0-b473-0971107183ec')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002279, 'CH-SIRENIS-280',
  dev.device_id, dev.organization_id,
  'UMA Comedor 1', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 281/319: Sala de conferencias (legacy id=6478, equipoId=1673)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '41e419f7-8ca3-42f0-b473-0971107183ec')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002280, 'CH-SIRENIS-281',
  dev.device_id, dev.organization_id,
  'Sala de conferencias', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 282/319: UMA Comedor 2 (legacy id=6479, equipoId=1673)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '41e419f7-8ca3-42f0-b473-0971107183ec')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002281, 'CH-SIRENIS-282',
  dev.device_id, dev.organization_id,
  'UMA Comedor 2', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 283/319: Subtotalizador Lobby (legacy id=6480, equipoId=1673)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '41e419f7-8ca3-42f0-b473-0971107183ec')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002282, 'CH-SIRENIS-283',
  dev.device_id, dev.organization_id,
  'Subtotalizador Lobby', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 284/319: Extractor 1 (legacy id=6435, equipoId=1674)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e091e43a-7177-4f1b-9482-eaa3f929dfc1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002283, 'CH-SIRENIS-284',
  dev.device_id, dev.organization_id,
  'Extractor 1', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 285/319: Horno cocina 1 (legacy id=6535, equipoId=1674)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e091e43a-7177-4f1b-9482-eaa3f929dfc1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002284, 'CH-SIRENIS-285',
  dev.device_id, dev.organization_id,
  'Horno cocina 1', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 286/319: Lavaloza 1 (legacy id=6536, equipoId=1674)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e091e43a-7177-4f1b-9482-eaa3f929dfc1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002285, 'CH-SIRENIS-286',
  dev.device_id, dev.organization_id,
  'Lavaloza 1', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 287/319: Lavaloza 2 (legacy id=6537, equipoId=1674)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e091e43a-7177-4f1b-9482-eaa3f929dfc1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002286, 'CH-SIRENIS-287',
  dev.device_id, dev.organization_id,
  'Lavaloza 2', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 288/319: Extractor 2 (legacy id=6538, equipoId=1674)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e091e43a-7177-4f1b-9482-eaa3f929dfc1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002287, 'CH-SIRENIS-288',
  dev.device_id, dev.organization_id,
  'Extractor 2', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 289/319: Tomaccorientes - máquinas cocinas (legacy id=6539, equipoId=1674)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e091e43a-7177-4f1b-9482-eaa3f929dfc1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002288, 'CH-SIRENIS-289',
  dev.device_id, dev.organization_id,
  'Tomaccorientes - máquinas cocinas', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 290/319: Otras cargas cocina 1 (V) (legacy id=6676, equipoId=1674)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e091e43a-7177-4f1b-9482-eaa3f929dfc1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002289, 'CH-SIRENIS-290',
  dev.device_id, dev.organization_id,
  'Otras cargas cocina 1 (V)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 291/319: IG Chillers 2-3-4 + Bombas (legacy id=6439, equipoId=1678)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89879a96-8f0a-4d99-857b-c2428395f4a1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002290, 'CH-SIRENIS-291',
  dev.device_id, dev.organization_id,
  'IG Chillers 2-3-4 + Bombas', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 292/319: Chiller 2 (legacy id=6460, equipoId=1678)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89879a96-8f0a-4d99-857b-c2428395f4a1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002291, 'CH-SIRENIS-292',
  dev.device_id, dev.organization_id,
  'Chiller 2', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 293/319: Chiller 3 (legacy id=6461, equipoId=1678)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89879a96-8f0a-4d99-857b-c2428395f4a1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002292, 'CH-SIRENIS-293',
  dev.device_id, dev.organization_id,
  'Chiller 3', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 294/319: Chiller 4 (legacy id=6462, equipoId=1678)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89879a96-8f0a-4d99-857b-c2428395f4a1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002293, 'CH-SIRENIS-294',
  dev.device_id, dev.organization_id,
  'Chiller 4', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 295/319: IG Chiller 1 + Bombas (legacy id=6463, equipoId=1678)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89879a96-8f0a-4d99-857b-c2428395f4a1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002294, 'CH-SIRENIS-295',
  dev.device_id, dev.organization_id,
  'IG Chiller 1 + Bombas', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 296/319: IG Bombas 3 (legacy id=6464, equipoId=1678)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89879a96-8f0a-4d99-857b-c2428395f4a1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002295, 'CH-SIRENIS-296',
  dev.device_id, dev.organization_id,
  'IG Bombas 3', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 297/319: Bombas Chillers (V) (legacy id=6465, equipoId=1678)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89879a96-8f0a-4d99-857b-c2428395f4a1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002296, 'CH-SIRENIS-297',
  dev.device_id, dev.organization_id,
  'Bombas Chillers (V)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 298/319: Totalizador Chillers Cuarto de Máquinas (legacy id=30366, equipoId=1678)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = '89879a96-8f0a-4d99-857b-c2428395f4a1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002297, 'CH-SIRENIS-298',
  dev.device_id, dev.organization_id,
  'Totalizador Chillers Cuarto de Máquinas', 901, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 299/319: IG Cocina 2 (legacy id=6441, equipoId=1680)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e8c21d30-f3d5-4789-bf8f-8374cccbbd62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002298, 'CH-SIRENIS-299',
  dev.device_id, dev.organization_id,
  'IG Cocina 2', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 300/319: IG Cocina 1 (legacy id=6471, equipoId=1680)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e8c21d30-f3d5-4789-bf8f-8374cccbbd62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002299, 'CH-SIRENIS-300',
  dev.device_id, dev.organization_id,
  'IG Cocina 1', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 301/319: Comedor 2 (legacy id=6472, equipoId=1680)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e8c21d30-f3d5-4789-bf8f-8374cccbbd62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002300, 'CH-SIRENIS-301',
  dev.device_id, dev.organization_id,
  'Comedor 2', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 302/319: Comedor 1 (legacy id=6473, equipoId=1680)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e8c21d30-f3d5-4789-bf8f-8374cccbbd62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002301, 'CH-SIRENIS-302',
  dev.device_id, dev.organization_id,
  'Comedor 1', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 303/319: Luces Lobby + Comedor personal (legacy id=6474, equipoId=1680)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e8c21d30-f3d5-4789-bf8f-8374cccbbd62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002302, 'CH-SIRENIS-303',
  dev.device_id, dev.organization_id,
  'Luces Lobby + Comedor personal', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 304/319: Carmaras Frio Sotano (legacy id=6475, equipoId=1680)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e8c21d30-f3d5-4789-bf8f-8374cccbbd62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002303, 'CH-SIRENIS-304',
  dev.device_id, dev.organization_id,
  'Carmaras Frio Sotano', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 305/319: Otras cargas Lobby (V) (legacy id=6481, equipoId=1680)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e8c21d30-f3d5-4789-bf8f-8374cccbbd62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002304, 'CH-SIRENIS-305',
  dev.device_id, dev.organization_id,
  'Otras cargas Lobby (V)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 306/319: Totalizador Lobby (V) (legacy id=6525, equipoId=1680)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'e8c21d30-f3d5-4789-bf8f-8374cccbbd62')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002305, 'CH-SIRENIS-306',
  dev.device_id, dev.organization_id,
  'Totalizador Lobby (V)', 901, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 307/319: Totalizador Sirenis Riviera Maya - legacy (legacy id=6902, equipoId=1703)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'f6436441-2ee2-4e85-86f4-ec5fe57186bc')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002306, 'CH-SIRENIS-307',
  dev.device_id, dev.organization_id,
  'Totalizador Sirenis Riviera Maya - legacy', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 308/319: Totalizador (legacy id=29343, equipoId=1703)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'f6436441-2ee2-4e85-86f4-ec5fe57186bc')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002307, 'CH-SIRENIS-308',
  dev.device_id, dev.organization_id,
  'Totalizador', 257, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 309/319: Totalizador MENOS SPA (V) (legacy id=32194, equipoId=1703)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'f6436441-2ee2-4e85-86f4-ec5fe57186bc')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002308, 'CH-SIRENIS-309',
  dev.device_id, dev.organization_id,
  'Totalizador MENOS SPA (V)', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 310/319: sirenis1 (legacy id=13785, equipoId=1806)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'aeda62af-d04d-40b2-b21e-cc06777cadf1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002309, 'CH-SIRENIS-310',
  dev.device_id, dev.organization_id,
  'sirenis1', 1, 3, NULL, NULL,
  false, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 311/319: Roof Top 1 Restaurante (legacy id=13878, equipoId=1806)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'aeda62af-d04d-40b2-b21e-cc06777cadf1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002310, 'CH-SIRENIS-311',
  dev.device_id, dev.organization_id,
  'Roof Top 1 Restaurante', 1, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 312/319: Roof Top 2 Restaurante (legacy id=13879, equipoId=1806)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'aeda62af-d04d-40b2-b21e-cc06777cadf1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002311, 'CH-SIRENIS-312',
  dev.device_id, dev.organization_id,
  'Roof Top 2 Restaurante', 2, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 313/319: Club Vacaciones  (legacy id=13880, equipoId=1806)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'aeda62af-d04d-40b2-b21e-cc06777cadf1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002312, 'CH-SIRENIS-313',
  dev.device_id, dev.organization_id,
  'Club Vacaciones ', 3, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 314/319: Cámara Frio (legacy id=13881, equipoId=1806)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'aeda62af-d04d-40b2-b21e-cc06777cadf1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002313, 'CH-SIRENIS-314',
  dev.device_id, dev.organization_id,
  'Cámara Frio', 5, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 315/319: Cocina, Restaurante y Bar (legacy id=13882, equipoId=1806)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'aeda62af-d04d-40b2-b21e-cc06777cadf1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002314, 'CH-SIRENIS-315',
  dev.device_id, dev.organization_id,
  'Cocina, Restaurante y Bar', 4, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 316/319: Roof Top 3 Salom Premium y Oficinas  (legacy id=13883, equipoId=1806)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'aeda62af-d04d-40b2-b21e-cc06777cadf1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002315, 'CH-SIRENIS-316',
  dev.device_id, dev.organization_id,
  'Roof Top 3 Salom Premium y Oficinas ', 6, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 317/319: Totalizador Premium (legacy id=31586, equipoId=1806)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'aeda62af-d04d-40b2-b21e-cc06777cadf1')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002316, 'CH-SIRENIS-317',
  dev.device_id, dev.organization_id,
  'Totalizador Premium', 900, 3, NULL, NULL,
  true, 'active', true,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 318/319: Sirena (legacy id=14759, equipoId=1929)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'f5c2eb16-eca8-4c69-a5e5-f3e55e4f741f')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002317, 'CH-SIRENIS-318',
  dev.device_id, dev.organization_id,
  'Sirena', 1, 0, NULL, NULL,
  true, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

-- Channel 319/319: Temperatura (legacy id=14758, equipoId=1929)
WITH
  dev AS (SELECT d.id AS device_id, d.organization_id FROM devices d WHERE d.uuid = 'f5c2eb16-eca8-4c69-a5e5-f3e55e4f741f')
INSERT INTO channels
  (id, human_id, public_code, device_id, organization_id, name, ch, phase_system, phase, measurement_type_id, process, status, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(), 9002318, 'CH-SIRENIS-319',
  dev.device_id, dev.organization_id,
  'Temperatura', 3, NULL, NULL, NULL,
  true, 'inactive', false,
  NOW(), NOW()
FROM dev
ON CONFLICT (device_id, name) WHERE deleted_at IS NULL DO NOTHING;

COMMIT;

-- =============================================================================
-- Fin del script Sirenis Seed
-- Total: 1 org, 2 sites, 43 devices, 319 channels
-- =============================================================================