# Estado del Proyecto LionsCore Comments

## Qué es
Plataforma SaaS para gestionar comentarios de Facebook e Instagram con IA.
Cada cliente conecta sus páginas y configura un bot que responde, elimina y oculta comentarios automáticamente.

## Dominio
- Producción: https://sia.lionscore.ai
- Antiguo: https://sia.duberney.online (sigue activo)
- Servidor: 185.225.233.46
- Repositorio: https://github.com/duver88/Sistema-de-inteligencia-artificial

## Stack técnico
- Next.js 14 + TypeScript + Tailwind + shadcn/ui
- PostgreSQL: base de datos lionscore_comments
- Redis: cola de trabajos BullMQ
- Nginx + SSL Let's Encrypt en sia.lionscore.ai

## Procesos PM2
- `lionscore-comments` → App Next.js (puerto 3002)
- `lionscore-worker` → Procesa comentarios de la cola BullMQ

## Meta App
- App ID: 1693982431760040
- App Name: LionsCore Pages
- Estado: **Development mode** (pendiente aprobación de Meta)
- ~~LionsCore Comments (App ID: 268005512929030)~~ — reemplazada, ya no se usa

## Scopes Facebook actuales (.env.local)
```
pages_show_list,pages_read_engagement,pages_manage_metadata,pages_read_user_content,business_management
```

## Cuentas conectadas
| Página | Page ID |
|--------|---------|
| UrbaMares | 224830611012407 |
| Ciudad San Juan | 533578629828960 |
| Soluciones Tecnicas | 131750173356395 |
| Fundamb | 101722275720846 |

## Webhooks
- URL: https://sia.lionscore.ai/api/webhooks/meta
- Token: lionscore-webhook-2024
- Campo suscrito: feed
- Estado: Verificado pero **no recibe eventos reales** (app en Development mode)
- Nota: En Development mode Meta NO entrega webhooks reales ni siquiera para admins

## Estado Meta App Review
| Permiso | Estado |
|---------|--------|
| pages_show_list | Agregado |
| pages_read_engagement | Agregado |
| pages_read_user_content | Agregado |
| pages_manage_metadata | Agregado a revisión |
| pages_manage_engagement | Agregado a revisión |
| business_management | Agregado |

- Llamadas de prueba API ejecutadas (2026-04-16) → esperando 24h para que aparezcan en Meta
- Videos por grabar → **Pendiente con OBS**

## Pendiente
1. Grabar videos con OBS para cada permiso
2. Completar formulario de revisión (Uso permitido, Tratamiento de datos, Instrucciones para revisores)
3. Enviar a revisión de Meta
4. Esperar aprobación (5-7 días hábiles)
5. Pasar app a Live mode
6. Activar webhooks (ya configurados y verificados)
7. Vincular cuenta de Instagram Business a UrbaMares en Meta Business Suite (para llamadas IG API)

## Estado de funcionalidades
- Login con Facebook OAuth: funcionando
- Dashboard completo en español: funcionando
- Cuentas conectadas (4 páginas): funcionando
- Base de conocimiento con importación por IA: funcionando
- Reglas de moderación: keywords + instrucciones IA: funcionando
- Pipeline: keywords → clasificador IA → respuesta IA: funcionando
- Worker BullMQ procesando comentarios: funcionando
- Webhooks Meta: verificados pero sin eventos reales (Development mode — pendiente aprobación)
- Instagram Business: sin cuenta vinculada en UrbaMares

## Comandos útiles en el servidor
```bash
ssh root@185.225.233.46
pm2 status
pm2 logs lionscore-comments --lines 50 --nostream
pm2 logs lionscore-worker --lines 50 --nostream
cd /var/www/lionscore-comments
git pull origin main && npm run build && pm2 restart lionscore-comments && pm2 restart lionscore-worker
```

## Deploy completo
```bash
cd /var/www/lionscore-comments && git pull origin main && npm run build && pm2 restart lionscore-comments && pm2 restart lionscore-worker
```

## Notas importantes
- No tocar otras apps del servidor: `/var/www/restaurante`, `/var/www/smitp`
- Base de datos: `postgresql://lionscore:LionsCore2024!Secure@localhost:5432/lionscore_comments`
- Redis: `redis://localhost:6379`
- App corre en puerto 3002 con PM2
