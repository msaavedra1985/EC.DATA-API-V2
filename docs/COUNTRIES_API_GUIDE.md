
# 🌍 Countries API - Guía para Frontend

Guía completa de uso de la API de Países para el equipo de frontend.

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Autenticación](#autenticación)
- [Endpoints](#endpoints)
- [Estructura de Datos](#estructura-de-datos)
- [Caché y Performance](#caché-y-performance)
- [Multi-idioma](#multi-idioma)
- [Ejemplos de Uso](#ejemplos-de-uso)

---

## 🎯 Descripción General

La API de Countries es un **endpoint público de datos de referencia** que proporciona información de países con soporte multi-idioma (español e inglés).

**Características principales:**
- ✅ **Endpoint público** - No requiere autenticación
- 🌐 **Multi-idioma** - Traducciones en español (es) e inglés (en)
- ⚡ **Alta performance** - Datos cacheados en Redis (TTL: 1 hora)
- 📦 **Datos estáticos** - ~55 países de todos los continentes
- 🔒 **Códigos ISO 3166-1** - ISO Alpha-2, Alpha-3 y numérico

**Casos de uso:**
- Selectores/dropdowns de país en formularios
- Validación de country_id en organizaciones
- Banderas de internacionalización
- Filtros por país

---

## 🔐 Autenticación

**⚠️ IMPORTANTE:** Este endpoint **NO requiere autenticación**.

```javascript
// ✅ CORRECTO - Sin headers de autenticación
fetch('/api/v1/countries')

// También funciona (pero innecesario)
fetch('/api/v1/countries', {
  headers: {
    'Authorization': `Bearer ${token}` // Opcional
  }
})
```

---

## 📊 Endpoints

### GET /api/v1/countries

Lista todos los países activos con traducciones.

**URL:** `GET /api/v1/countries`

**Query Parameters:**

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `lang` | string | No | `es` | Idioma de traducciones (`es` o `en`) |

**Response:**

```json
{
  "ok": true,
  "data": [
    {
      "id": 276,
      "iso_alpha2": "AR",
      "iso_alpha3": "ARG",
      "phone_code": "+54",
      "name": "Argentina"
    },
    {
      "id": 152,
      "iso_alpha2": "BR",
      "iso_alpha3": "BRA",
      "phone_code": "+55",
      "name": "Brasil"
    },
    {
      "id": 840,
      "iso_alpha2": "US",
      "iso_alpha3": "USA",
      "phone_code": "+1",
      "name": "Estados Unidos"
    }
  ],
  "lang": "es"
}
```

**Códigos de respuesta:**

| Código | Descripción |
|--------|-------------|
| `200` | Países obtenidos exitosamente |
| `500` | Error interno del servidor |

---

## 📦 Estructura de Datos

### Country Object

```typescript
interface Country {
  id: number;              // ID numérico del país
  iso_alpha2: string;      // Código ISO 3166-1 alpha-2 (AR, US, ES)
  iso_alpha3: string;      // Código ISO 3166-1 alpha-3 (ARG, USA, ESP)
  phone_code: string;      // Código telefónico internacional (+54, +1, +34)
  name: string;            // Nombre traducido según idioma solicitado
}
```

**Ejemplo completo:**
```json
{
  "id": 276,
  "iso_alpha2": "AR",
  "iso_alpha3": "ARG",
  "phone_code": "+54",
  "name": "Argentina"
}
```

---

## ⚡ Caché y Performance

### Estrategia de Caché

- **Redis TTL:** 1 hora (3600 segundos)
- **Cache Key:** `countries:{lang}` (ejemplo: `countries:es`, `countries:en`)
- **Invalidación:** Manual (solo cuando se actualizan países en DB)

### Performance

```
Primera request (cache miss):  ~150-200ms
Siguientes requests (cache hit): ~5-10ms
```

**Recomendación:** Cachear en el frontend también (localStorage/sessionStorage) para evitar requests repetidas.

---

## 🌐 Multi-idioma

### Idiomas Soportados

| Código | Idioma | Ejemplo |
|--------|--------|---------|
| `es` | Español | Argentina, Brasil, Estados Unidos |
| `en` | Inglés | Argentina, Brazil, United States |

### Detección de Idioma

El endpoint respeta esta jerarquía:

1. **Query param `lang`** (máxima prioridad)
2. **Header `Accept-Language`** del request
3. **Default:** `es` (español)

**Ejemplos:**

```javascript
// Español (default)
fetch('/api/v1/countries')

// Inglés explícito
fetch('/api/v1/countries?lang=en')

// Idioma desde header (si no se envía lang)
fetch('/api/v1/countries', {
  headers: {
    'Accept-Language': 'en-US,en;q=0.9'
  }
})
```

---

## 💡 Ejemplos de Uso

### React/Next.js - Hook Custom

```javascript
import { useState, useEffect } from 'react';

const useCountries = (lang = 'es') => {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoading(true);
        
        // Intentar obtener del localStorage primero
        const cacheKey = `countries_${lang}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Validar si el caché tiene menos de 1 hora
          if (Date.now() - timestamp < 3600000) {
            setCountries(data);
            setLoading(false);
            return;
          }
        }

        // Fetch desde API
        const response = await fetch(`/api/v1/countries?lang=${lang}`);
        const result = await response.json();

        if (result.ok) {
          setCountries(result.data);
          
          // Guardar en localStorage
          localStorage.setItem(cacheKey, JSON.stringify({
            data: result.data,
            timestamp: Date.now()
          }));
        } else {
          throw new Error('Error fetching countries');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, [lang]);

  return { countries, loading, error };
};

export default useCountries;
```

### Componente Select de Países

```javascript
import React from 'react';
import useCountries from './hooks/useCountries';

const CountrySelect = ({ value, onChange, language = 'es' }) => {
  const { countries, loading, error } = useCountries(language);

  if (loading) {
    return (
      <select disabled>
        <option>Cargando países...</option>
      </select>
    );
  }

  if (error) {
    return (
      <select disabled>
        <option>Error: {error}</option>
      </select>
    );
  }

  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="country-select"
    >
      <option value="">Selecciona un país</option>
      {countries.map(country => (
        <option 
          key={country.iso_alpha2} 
          value={country.iso_alpha2}
        >
          {country.name}
        </option>
      ))}
    </select>
  );
};

export default CountrySelect;
```

### Uso en Formulario

```javascript
import React, { useState } from 'react';
import CountrySelect from './components/CountrySelect';

const OrganizationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    country_id: '',
    tax_id: '',
    email: ''
  });

  const handleCountryChange = (countryCode) => {
    setFormData(prev => ({
      ...prev,
      country_id: countryCode
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enviar a API de organizaciones
    const response = await fetch('/api/v1/organizations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    // ...
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Nombre de la organización"
      />
      
      <CountrySelect 
        value={formData.country_id}
        onChange={handleCountryChange}
        language="es"
      />
      
      <input 
        type="text" 
        value={formData.tax_id}
        placeholder="RFC / Tax ID"
      />
      
      <button type="submit">Crear Organización</button>
    </form>
  );
};
```

### Vanilla JavaScript

```javascript
// Función para obtener países
async function getCountries(lang = 'es') {
  try {
    const response = await fetch(`/api/v1/countries?lang=${lang}`);
    const data = await response.json();
    
    if (data.ok) {
      return data.data;
    } else {
      throw new Error('Error al obtener países');
    }
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// Llenar select de países
async function populateCountrySelect(selectId, lang = 'es') {
  const select = document.getElementById(selectId);
  const countries = await getCountries(lang);
  
  // Limpiar opciones existentes
  select.innerHTML = '<option value="">Selecciona un país</option>';
  
  // Agregar países
  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country.iso_alpha2;
    option.textContent = country.name;
    select.appendChild(option);
  });
}

// Uso
document.addEventListener('DOMContentLoaded', () => {
  populateCountrySelect('country-select', 'es');
});
```

### TypeScript con Fetch Wrapper

```typescript
// types/country.ts
export interface Country {
  id: number;
  iso_alpha2: string;
  iso_alpha3: string;
  phone_code: string;
  name: string;
}

export interface CountriesResponse {
  ok: boolean;
  data: Country[];
  lang: string;
}

// services/countries.service.ts
export class CountriesService {
  private baseUrl = '/api/v1/countries';
  private cache: Map<string, { data: Country[], timestamp: number }> = new Map();
  private cacheTTL = 3600000; // 1 hora

  async getCountries(lang: 'es' | 'en' = 'es'): Promise<Country[]> {
    // Verificar caché
    const cached = this.cache.get(lang);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Fetch desde API
    const response = await fetch(`${this.baseUrl}?lang=${lang}`);
    const result: CountriesResponse = await response.json();

    if (!result.ok) {
      throw new Error('Failed to fetch countries');
    }

    // Actualizar caché
    this.cache.set(lang, {
      data: result.data,
      timestamp: Date.now()
    });

    return result.data;
  }

  getCountryByCode(countries: Country[], code: string): Country | undefined {
    return countries.find(c => 
      c.iso_alpha2 === code || c.iso_alpha3 === code
    );
  }

  clearCache(lang?: 'es' | 'en') {
    if (lang) {
      this.cache.delete(lang);
    } else {
      this.cache.clear();
    }
  }
}

export const countriesService = new CountriesService();
```

### Búsqueda y Filtrado

```javascript
const CountrySearchSelect = ({ value, onChange }) => {
  const { countries, loading } = useCountries('es');
  const [search, setSearch] = useState('');

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(search.toLowerCase()) ||
    country.iso_alpha2.toLowerCase().includes(search.toLowerCase()) ||
    country.iso_alpha3.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="country-search-select">
      <input
        type="text"
        placeholder="Buscar país..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />
      
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          size={10}
        >
          {filteredCountries.map(country => (
            <option key={country.iso_alpha2} value={country.iso_alpha2}>
              {country.name} ({country.iso_alpha2})
            </option>
          ))}
        </select>
      )}
    </div>
  );
};
```

---

## 📝 Notas Importantes

1. **No requiere autenticación** - Es un endpoint público
2. **Datos estáticos** - Los países no cambian frecuentemente
3. **Cachear en frontend** - Usar localStorage/sessionStorage para mejor UX
4. **Usar iso_alpha2** - Es el estándar más común (AR, US, ES, etc.)
5. **Validación backend** - El campo `country_id` en Organizations valida contra esta lista
6. **TTL corto en Redis** - 1 hora, pero puedes cachear más tiempo en frontend
7. **Ordenamiento** - Los países vienen ordenados alfabéticamente por nombre traducido

---

## 🚀 Quick Start

### Opción 1: Fetch Directo

```javascript
// Español (default)
const response = await fetch('/api/v1/countries');
const { data: countries } = await response.json();

// Inglés
const response = await fetch('/api/v1/countries?lang=en');
const { data: countries } = await response.json();
```

### Opción 2: Hook Custom (Recomendado)

```javascript
// 1. Copiar el hook useCountries
// 2. Usar en cualquier componente
const MyComponent = () => {
  const { countries, loading, error } = useCountries('es');
  
  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;
  
  return (
    <select>
      {countries.map(c => (
        <option key={c.iso_alpha2} value={c.iso_alpha2}>
          {c.name}
        </option>
      ))}
    </select>
  );
};
```

---

## 🔗 Recursos Relacionados

- **Organizations API:** `country_id` es requerido al crear organizaciones
- **Swagger Docs:** `/docs` en desarrollo
- **Códigos ISO:** [iso.org/iso-3166-country-codes](https://www.iso.org/iso-3166-country-codes.html)

---

**¿Preguntas?** Consulta la documentación Swagger en `/api/v1/docs` o contacta al equipo de backend. 🚀
