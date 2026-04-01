# Acceder a Cassandra desde Replit usando ngrok

## Problema
Replit asigna IPs públicas dinámicas en cada reinicio, lo que hace difícil whitelist en firewalls.

## Solución: ngrok tunnel

### Instalación de ngrok (una sola vez)
```bash
# En tu máquina local o en Replit Shell
curl https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.zip -o ngrok.zip
unzip ngrok.zip
chmod +x ngrok
# (o instálalo vía apt/brew según tu SO)
```

### Crear un tunnel (mientras desarrollas)
```bash
ngrok tcp 20.14.129.24:9042
```

**Output:**
```
Session Status                online
Account                       <tu cuenta>
Version                        3.x.x

Connections                   ttl    opn    rt1    rt5    p50    p90
                               0      0      0      0      0.00   0.00

TCP Connections               http://127.0.0.1:4040

Forwarding                    tcp://2.tcp.ngrok.io:12345 -> 20.14.129.24:9042
```

### Usar el URL en tu app
```bash
# En desarrollo (Replit)
export CASSANDRA_HOST=2.tcp.ngrok.io:12345

# O en .env
CASSANDRA_HOST=2.tcp.ngrok.io:12345
```

### Whitelist en tu Cassandra
Agrega **una sola vez** el host de ngrok al firewall de Cassandra:
- Host: `*.ngrok.io` (o específico: `2.tcp.ngrok.io`)
- Port: (la que asigne ngrok, ej: 12345)

## Ventajas
✅ IP estable (mientras el tunnel esté abierto)
✅ Funciona en Replit sin cambiar IP dinámicamente
✅ Sin necesidad de modificar código
✅ Gratuito en ngrok free tier

## Alternativa: ngrok con cuenta
Registrate en https://ngrok.com para:
- Túneles más largos (free tier tiene límite)
- Token de autenticación persistente
- Dominios personalizados (plan pro)

## Flujo recomendado
1. Instala ngrok CLI
2. En una terminal: `ngrok tcp 20.14.129.24:9042`
3. Whitelist el `*.ngrok.io` en tu firewall de Cassandra
4. En otra terminal: `npm run dev` (con CASSANDRA_HOST del paso 2)
5. Servidor Replit se conecta a Cassandra vía tunnel
