# Instrucciones para Revisores de Meta — LionsCore Comments

**App:** LionsCore Pages
**App ID:** 1693982431760040
**URL de producción:** https://sia.lionscore.ai
**Tipo:** Business App
**Productos usados:** Facebook Login for Business (solo para conectar páginas — el acceso a la plataforma es por email + contraseña), Webhooks, Pages API, (Instagram Graph API — fase 2)

---

## 1. Resumen del producto

LionsCore Comments es una plataforma SaaS multi-tenant que ayuda a dueños de páginas de Facebook (e Instagram Business) a moderar y responder comentarios con IA. El usuario conecta sus páginas, configura un bot por página (tono, idioma, base de conocimiento, reglas de moderación), y el sistema procesa los comentarios que Meta entrega vía Webhooks: los responde, elimina los ofensivos, u oculta los de spam, según las reglas definidas por el usuario.

Todo ocurre únicamente sobre páginas que el usuario administra y ha conectado explícitamente en el dashboard.

---

## 2. Credenciales de prueba para el revisor

El acceso a la plataforma es por **email + contraseña** (no hay registro público: las cuentas se crean desde el panel de administración). Para la revisión se creará un usuario de prueba desde el panel admin y sus credenciales se entregarán en el formulario de App Review:

| Campo | Valor |
|---|---|
| URL | https://sia.lionscore.ai |
| Email de prueba | *[completar con el usuario creado desde el panel admin]* |
| Contraseña | *[completar]* |
| Test User de Facebook | *[completar con el Test User de App Dashboard → Roles → Test Users, usado SOLO en el Paso 3 para conectar páginas]* |
| Contraseña del Test User | *[completar]* |
| Página de prueba | *[completar con el nombre de la Page del Test User]* |

> **Nota:** el Test User de Facebook ya tiene permiso de Admin sobre una Facebook Page de prueba. No es necesario crear una página nueva: basta con iniciar sesión en LionsCore con el email/contraseña de prueba y, en el Paso 3, autorizar las páginas con el Test User de Facebook.

---

## 3. Flujo completo que debe probar el revisor

### Paso 1 — Ingresar a la app

1. Abrir https://sia.lionscore.ai en el navegador.
2. El middleware detecta que no hay sesión y redirige automáticamente a `/login`.
3. En `/login` aparece el formulario de **email + contraseña**.

> El login de la plataforma NO usa Facebook. El OAuth de Facebook aparece únicamente en el Paso 3, al conectar páginas desde `/accounts` — que es donde se solicitan los permisos de páginas en contexto.

### Paso 2 — Iniciar sesión con email y contraseña

1. El revisor introduce el email y la contraseña de prueba entregados en el formulario de App Review (sección 2) y pulsa **"Sign in"**.
2. Código relevante: `app/(auth)/login/page.tsx` → `signIn('credentials', { email, password })` (NextAuth v5, provider Credentials, sesión JWT).
3. La contraseña se verifica contra un hash **bcrypt** almacenado en la base de datos; no interviene ninguna API de Meta en este paso.
4. Tras autenticarse, el revisor llega al dashboard. Si la cuenta se creó con contraseña temporal, la app pide cambiarla una vez en `/change-password` antes de continuar.

### Paso 3 — Conectar páginas desde el dashboard (aquí aparece Facebook OAuth)

> Este es el ÚNICO punto donde interviene el login de Facebook: el usuario conecta sus páginas desde `/accounts` (y repite el flujo cuando añade una página nueva o cuando el token expira). Aquí se solicitan los permisos de páginas (`FACEBOOK_SCOPES`, incluido `pages_manage_engagement`). Para este paso el revisor inicia sesión en Facebook con el **Test User** indicado en la sección 2.

1. El revisor navega a `/accounts` (sidebar → "Cuentas Conectadas").
2. Pulsa **"Conectar cuenta"** (componente `ConnectAccountCard.tsx`).
3. El cliente llama `GET /api/accounts/connect` (`app/api/accounts/connect/route.ts`):
   - Valida la sesión (multi-tenant: un usuario solo puede conectar páginas para su propio tenant).
   - Genera un `state` aleatorio de 16 bytes y lo guarda en una cookie `HttpOnly` (mitigación CSRF, TTL 10 min).
   - Construye la URL de OAuth `https://www.facebook.com/dialog/oauth` con el mismo set de scopes y `response_type=code`.
   - Devuelve esa URL al cliente, que hace `window.location = authUrl`.
4. Facebook muestra el diálogo de permisos. El revisor selecciona qué páginas autorizar.
5. Facebook redirige a `https://sia.lionscore.ai/api/accounts/callback?code=…&state=…`.
6. En el callback (`app/api/accounts/callback/route.ts`):
   - Se verifica el `state` contra la cookie (anti-CSRF). Si no coincide, redirige a `/accounts?error=invalid_state`.
   - Se intercambia el `code` por un short-lived token, y luego por un long-lived token de 60 días.
   - `metaClient.getManagedPages(token)` llama `GET /v21.0/me/accounts` e incluye, en el campo `instagram_business_account`, la IG Business Account vinculada si existe.
   - Cada página se persiste (cifrada) en `SocialAccount` (tabla Prisma), junto con su `Bot` por defecto.
   - `metaClient.subscribePageToWebhooks(pageId, pageToken)` suscribe cada página al webhook `feed` vía `POST /v21.0/{pageId}/subscribed_apps`. Esto es **lo que permite recibir eventos de comentarios en tiempo real** una vez la app esté en Live mode.
7. El revisor vuelve a `/accounts?success=true` y ve sus páginas listadas.

### Paso 4 — Configurar el bot

1. El revisor abre `/bots` → ve una tarjeta por cada página conectada.
2. Entra a una página de bot → `/bots/[botId]`:
   - **General:** nombre, switch maestro On/Off.
   - **Automatizaciones:** Auto-reply con IA, Eliminar comentarios negativos, Ocultar spam, Moderación con IA.
   - **IA:** tono (amigable/formal/casual), idioma, longitud máxima de respuesta, instrucciones personalizadas.
   - **Proyectos:** útil para páginas que promueven varios productos (cada proyecto tiene su propia base de conocimiento y keywords de detección).
3. En `/bots/[botId]/knowledge` añade entradas de conocimiento (par clave-valor: precio, ubicación, WhatsApp, etc.). Esta base se inyecta literalmente en el prompt del modelo para que nunca invente datos.
4. En `/bots/[botId]/rules` define listas de keywords/regex para eliminación automática y ocultamiento de spam.
5. El revisor activa el bot con el switch maestro.

### Paso 5 — Probar la gestión de comentarios

1. Desde otra cuenta de Facebook de prueba, comentar en un post de la página conectada.
2. Meta entrega el evento a `POST /api/webhooks/meta` (`app/api/webhooks/meta/route.ts`):
   - Se lee el body crudo y se verifica la firma **HMAC-SHA256** del header `x-hub-signature-256` usando el App Secret (`lib/meta/webhook.ts`). Cualquier payload sin firma válida recibe 401.
   - Se responde `200 OK` inmediatamente (requerimiento de Meta).
   - Asíncronamente, se parsean los comentarios del payload, se localiza el `SocialAccount` por `pageId + platform` y se encola un job en BullMQ (`comment-processing`) con el `botId` y el comentario.
3. El worker (`lib/workers/comment-processor.ts`, proceso PM2 `lionscore-worker`) ejecuta el pipeline definido en `lib/moderation/pipeline.ts`:
   - **Filtros iniciales:** si el bot está inactivo, si el comentario es una reply, o si es un comentario propio de la página, se registra `IGNORED` y se detiene.
   - **STEP 1 — Reglas de eliminación (keywords):** si coincide → `DELETE /v21.0/{commentId}` con el page token → `action = DELETED`.
   - **STEP 2 — Reglas de spam (keywords):** si coincide → `POST /v21.0/{commentId}?is_hidden=true` → `action = HIDDEN`.
   - **STEP 3 — Clasificación con IA (OpenAI `gpt-4o-mini`):** si la IA dice DELETE / HIDE, se aplica la misma acción que arriba.
   - **STEP 4 — Detección de proyecto:** se obtiene el caption del post (`GET /v21.0/{postId}?fields=message`) y se compara con los keywords de detección de cada proyecto.
   - **STEP 5 — Generación de respuesta:** se construye el prompt con la base de conocimiento del proyecto + instrucciones del usuario; se llama a OpenAI (`gpt-4o-mini`) y se publica la respuesta vía `POST /v21.0/{commentId}/comments` → `action = REPLIED`.
4. Cada resultado queda en `CommentLog` (historial auditable).
5. El revisor puede verificar todo esto en `/comments`:
   - Tabla paginada con: fecha, plataforma, página, autor, texto original, acción tomada, respuesta de IA, proyecto detectado, tiempo de procesamiento.
   - Filtros por plataforma, página, acción, rango de fechas, búsqueda.
   - Acciones manuales por fila: **Responder manualmente** (`POST /api/comments/[commentId]/reply`) y **Eliminar manualmente** (`POST /api/comments/[commentId]/delete`), ambas usan los mismos page tokens y endpoints de Meta Graph API.

---

## 4. Cómo se usa cada permiso solicitado

| Permiso | Por qué se necesita | Dónde se usa en el código |
|---|---|---|
| `public_profile` | Identificar al usuario de Facebook durante el flujo de conexión de páginas (el acceso a LionsCore es por email + contraseña, sin Facebook). | Diálogo OAuth de `app/api/accounts/connect/route.ts`. |
| `pages_show_list` | Listar las páginas que el usuario administra para que pueda elegir cuál conectar. | `app/api/accounts/callback/route.ts` → `GET /me/accounts`. |
| `pages_read_engagement` | Leer los comentarios y el caption de los posts para clasificarlos y detectar proyecto. | `lib/meta/client.ts` y `lib/moderation/pipeline.ts`. |
| `pages_read_user_content` | Acceder al contenido del usuario final (texto del comentario, autor) entregado vía webhook. | Payload del webhook, procesado en `lib/meta/webhook.ts` y `comment-processor.ts`. |
| `pages_manage_metadata` | Suscribir/desuscribir cada página a los webhooks (campo `feed`). | `lib/meta/client.ts → subscribePageToWebhooks` (`POST /{pageId}/subscribed_apps`). |
| `pages_manage_engagement` | Responder, eliminar u ocultar comentarios **solo** en las páginas que el usuario conectó y tras configurar reglas en el dashboard. | `lib/meta/comments.ts` (reply/delete/hide) y acciones manuales en `/api/comments/[id]/reply` y `/delete`. |
| `business_management` | Permitir al usuario conectar páginas administradas a través de un Business Manager. | Mismo flujo de OAuth; no hay llamadas adicionales. |

---

## 5. Webhooks

- **URL:** `https://sia.lionscore.ai/api/webhooks/meta`
- **Objeto:** `page`, campo `feed` (ya verificado en App Dashboard).
- **Verificación (`GET`):** compara `hub.verify_token` contra `META_WEBHOOK_VERIFY_TOKEN`.
- **Eventos (`POST`):** cada request se valida con HMAC-SHA256 contra el App Secret antes de procesarse.
- **Suscripción por página:** ocurre automáticamente al conectar la página (paso 3.6 arriba).

> Durante la revisión la app está en **Development mode**, donde Meta no entrega webhooks reales. Los revisores pueden comprobar:
> 1. El endpoint de verificación funciona (responde `hub.challenge`).
> 2. El código de procesamiento (firma HMAC, encolado, worker) está presente y activo.
> 3. Los comentarios creados desde el Graph API Explorer — o tras pasar a Live mode — se procesan end-to-end.

---

## 6. Seguridad y privacidad

- **Cifrado de tokens:** todos los page access tokens y user tokens se cifran con **AES-256-GCM** (`lib/crypto.ts`) antes de persistirse en PostgreSQL. La clave (`ENCRYPTION_KEY`) está fuera del repositorio.
- **Aislamiento multi-tenant:** cada query a la base de datos filtra por `tenantId` (helper `requireTenant` en `lib/tenant.ts`). Un usuario no puede ver ni actuar sobre páginas de otro tenant.
- **Protección CSRF:** el flujo `/api/accounts/connect` usa una cookie `HttpOnly` con un `state` aleatorio de 128 bits verificado en el callback.
- **Rate limiting:** las acciones manuales (responder/eliminar) están limitadas por IP/usuario con Redis (`lib/rateLimit.ts`).
- **Rutas públicas de privacidad** (todas accesibles sin login):
  - https://sia.lionscore.ai/privacy → Política de privacidad
  - https://sia.lionscore.ai/terms → Términos de servicio
  - https://sia.lionscore.ai/data-deletion → Procedimiento de eliminación de datos
- **Desconexión:** desde `/accounts` el usuario puede desconectar una página (`DELETE /api/accounts/[accountId]`), lo que elimina el registro local, desuscribe los webhooks y borra todos los `CommentLog` asociados.

---

## 7. Infraestructura técnica (para referencia)

- **Framework:** Next.js 14 (App Router) + TypeScript.
- **Base de datos:** PostgreSQL con Prisma.
- **Cola:** BullMQ sobre Redis (proceso `lionscore-worker` con PM2).
- **Auth:** NextAuth v5 con provider Credentials (email + contraseña, hash bcrypt) y sesiones JWT. Facebook OAuth se usa únicamente para conectar páginas desde `/accounts`.
- **Versión Meta API:** v21.0 (consistente en login, conexión de páginas y operaciones de comentarios).

---

## 8. Contacto

Si el revisor necesita aclaración o acceso adicional:

- **Email:** duver20000@gmail.com
- **App Dashboard:** https://developers.facebook.com/apps/1693982431760040
