@AGENTS.md

Lee ESTADO_PROYECTO.md antes de hacer cualquier cosa.

## Reglas importantes:
- Servidor: 185.225.233.46, usuario root
- SSH hostkey: SHA256:GE6ZhZi6CxbQzFcY/BbMXH/BjsRUDKKK9Fz8o9iNZtU
- SSH password: usar el configurado en el servidor
- App corre en puerto 3002 con PM2
- Siempre hacer commit + push + deploy después de cada cambio
- Deploy: cd /var/www/lionscore-comments && git pull origin main && npm run build && pm2 restart lionscore-comments && pm2 restart lionscore-worker
- App path en servidor: /var/www/lionscore-comments
- Base de datos: postgresql://lionscore:LionsCore2024!Secure@localhost:5432/lionscore_comments
- Redis: redis://localhost:6379

## Antes de empezar cualquier tarea:
1. Leer ESTADO_PROYECTO.md completo
2. Confirmar qué se va a hacer antes de ejecutar
3. No tocar otras apps del servidor: restaurante, smitp
