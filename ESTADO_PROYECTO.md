# LionsCore Comments - Estado del Proyecto

## Descripción
Plataforma SaaS de gestión de comentarios con IA para Facebook e Instagram.
Permite a negocios conectar sus páginas y automatizar respuestas y moderación
de comentarios usando inteligencia artificial.

## URLs
- Producción: https://sia.lionscore.ai
- Servidor: 185.225.233.46
- Repo: https://github.com/duver88/Sistema-de-inteligencia-artificial

## Stack Técnico
- Next.js 14 (App Router)
- Prisma + PostgreSQL
- BullMQ + Redis (queue de comentarios)
- NextAuth (autenticación Facebook OAuth)
- PM2 (gestión de procesos)
- Nginx + Let's Encrypt (reverse proxy + SSL)

## Procesos PM2
- lionscore-comments → App Next.js (puerto 3002)
- lionscore-worker → Worker BullMQ que procesa comentarios

## Variables de entorno requeridas (.env.local)
- NEXTAUTH_URL → URL pública de la app
- NEXTAUTH_SECRET → Secret para NextAuth
- FACEBOOK_APP_ID → App ID de Meta
- FACEBOOK_CLIENT_ID → mismo que FACEBOOK_APP_ID
- FACEBOOK_APP_SECRET → App Secret de Meta (usado por NextAuth)
- FACEBOOK_CLIENT_SECRET → mismo que FACEBOOK_APP_SECRET
- FACEBOOK_SCOPES → Scopes de Facebook OAuth (login Y conexión de páginas)
- FACEBOOK_PAGES_APP_ID → App ID para el flujo de conexión de páginas (mismo valor que FACEBOOK_APP_ID)
- FACEBOOK_PAGES_APP_SECRET → App Secret para el flujo de conexión de páginas (mismo valor que FACEBOOK_APP_SECRET)
- FACEBOOK_PAGES_REDIRECT_URI → URL callback de cuentas ({NEXTAUTH_URL}/api/accounts/callback)
- META_WEBHOOK_VERIFY_TOKEN → Token de verificación del webhook
- ENCRYPTION_KEY → Clave AES-256-GCM para cifrar tokens de páginas
- POLLING_ENABLED=false → El polling fue eliminado, siempre false
- DATABASE_URL → URL de PostgreSQL
- REDIS_URL → URL de Redis

## App Meta (LionsCore Pages)
- App ID: 1693982431760040
- Estado: Development mode — pendiente aprobación de Meta
- Webhook URL: https://sia.lionscore.ai/api/webhooks/meta
- Webhook Token: META_WEBHOOK_VERIFY_TOKEN del .env
- Webhook campo suscrito: feed
- Modo: Development (webhooks NO llegan en este modo)

## OAuth Redirect URIs registradas en Meta
- {NEXTAUTH_URL}/api/auth/callback/facebook
- {NEXTAUTH_URL}/api/accounts/callback
- {NEXTAUTH_URL}/api/accounts/connect/callback

## Páginas públicas (no requieren login)
- /privacy → Política de privacidad
- /terms → Términos de servicio
- /data-deletion → Eliminación de datos

## Arquitectura Multi-tenant
- Cada usuario tiene su propio tenant aislado
- Las cuentas de Facebook/Instagram son por usuario
- Los bots y comentarios son por tenant
- El webhook recibe eventos de todas las páginas y los enruta por pageId

## Flujo de comentarios (producción)
1. Usuario comenta en página de Facebook conectada
2. Meta envía evento POST a /api/webhooks/meta
3. Webhook verifica firma HMAC-SHA256
4. Encola comentario en BullMQ
5. Worker procesa con IA (Claude API)
6. Bot responde, ignora o elimina según configuración

## Flujo de comentarios (development mode)
- Meta NO entrega webhooks en development mode
- El polling fue implementado temporalmente y luego eliminado
- En development los comentarios no llegan automáticamente
- Solución: aprobar la app y pasar a Live mode

## Estado App Review Meta
- Permisos solicitados:
  * pages_show_list ✅ descripción completada
  * pages_read_engagement ✅ descripción completada
  * pages_read_user_content ✅ descripción completada
  * pages_manage_metadata ✅ descripción completada
  * pages_manage_engagement ✅ descripción completada
  * business_management ✅ descripción completada
  * public_profile ✅ descripción completada
- Llamadas de prueba API: ✅ ejecutadas vía Graph API Explorer
- Videos demostrativos: ⏳ pendiente grabar con OBS
- Tratamiento de datos: ⏳ pendiente completar
- Instrucciones para revisores: ⏳ pendiente completar
- Estado final: No enviado aún

## Pendiente antes de enviar a revisión
1. Esperar 24h para que llamadas de prueba aparezcan en verde en Meta
2. Grabar videos con OBS mostrando flujo completo de la app
3. Subir videos a cada permiso en el formulario de revisión
4. Completar sección "Tratamiento de datos"
5. Completar sección "Instrucciones para revisores"
6. Enviar a revisión de Meta

## Pendiente post-aprobación Meta
1. Pasar app a Live mode en Meta Developer Console
2. Actualizar FACEBOOK_SCOPES agregando pages_manage_engagement
3. Pedir a usuarios que reconecten sus páginas para obtener nuevos tokens
4. Verificar que webhooks reciben comentarios en tiempo real
5. Activar respuestas automáticas de IA en los bots
6. Probar eliminación de comentarios spam
7. Agregar Instagram: instagram_basic, instagram_manage_comments
8. Configurar dominio final si se cambia

## Notas importantes
- En Development mode Meta NO entrega webhooks reales bajo ninguna circunstancia
- El polling fue implementado y eliminado — NO reimplementar en producción
- POLLING_ENABLED debe mantenerse en false siempre
- Cuando Meta apruebe → Live mode → webhooks funcionan automáticamente
- La app es multi-tenant: cada usuario ve solo sus propias páginas y bots
- Los page tokens se cifran con AES-256-GCM antes de guardar en BD

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

## No tocar en el servidor
- /var/www/restaurante — otra app
- /var/www/smitp — otra app
