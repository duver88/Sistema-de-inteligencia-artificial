# Estado del Proyecto — LionsCore Comments

## Qué es
Plataforma SaaS para gestionar comentarios de Facebook e Instagram con IA.
Cada cliente conecta sus páginas y configura un bot que responde, elimina y oculta comentarios automáticamente.

## URLs y repositorio
- Producción: https://sia.duberney.online
- Repositorio: https://github.com/duver88/Sistema-de-inteligencia-artificial
- Servidor: 185.225.233.46 puerto 22

## Stack técnico
- Next.js 14 + TypeScript + Tailwind + shadcn/ui
- PostgreSQL: base de datos lionscore_comments
- Redis: cola de trabajos BullMQ
- PM2: lionscore-comments (puerto 3002) + lionscore-worker
- Nginx + SSL Let's Encrypt en sia.duberney.online

## Meta App
- Nombre: LionsCore Commets
- App ID: 26800551292903051
- Permisos activos: email, public_profile
- Permisos pendientes de aprobación de Meta: pages_manage_comments, pages_show_list, instagram_manage_comments, instagram_basic

## Estado de funcionalidades
✅ Login con Facebook OAuth funcionando
✅ Dashboard completo en español con diseño mejorado
✅ Bot UrbaMares conectado manualmente con token temporal de prueba
✅ Base de conocimiento con importación de documentos por IA (PDF, DOCX, XLSX, CSV, TXT)
✅ Reglas de moderación: palabras clave + instrucciones en lenguaje natural para IA
✅ Pipeline de moderación: keywords → IA classifier → AI responder
✅ Worker BullMQ procesando comentarios en background
⏳ Webhooks de Meta pendientes de configurar (necesita URL pública ya disponible)
⏳ Permisos de Meta pendientes de aprobación
⏳ OpenAI API key: cada usuario la configura desde Settings
⏳ Solicitud de revisión de app en Meta pendiente
⏳ Prueba real end-to-end con comentario real de Facebook/Instagram

## Próximos pasos en orden
1. Configurar webhook de Meta apuntando a https://sia.duberney.online/api/webhooks/meta
2. Solicitar revisión de Meta para permisos de páginas
3. Que Duberney configure su OpenAI API key en Settings
4. Activar el bot de UrbaMares y hacer prueba real
5. Cuando Meta apruebe permisos: probar flujo completo de conexión de cuenta nueva
6. Preparar para producción: dominio definitivo, plan de precios, onboarding

## Comandos útiles en el servidor
ssh root@185.225.233.46
pm2 status
pm2 logs lionscore-comments --lines 50 --nostream
pm2 logs lionscore-worker --lines 50 --nostream
cd /var/www/lionscore-comments
git pull origin main && npm run build && pm2 restart lionscore-comments

## Estructura de carpetas importante
/var/www/lionscore-comments   — app en producción
/var/www/restaurante          — otra app, NO TOCAR
/var/www/smitp                — otra app, NO TOCAR
