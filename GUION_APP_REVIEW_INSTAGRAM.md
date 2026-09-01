# Guion para App Review de Meta — `instagram_basic` + `instagram_manage_comments`

Segunda solicitud, después de que Meta aprobara `pages_manage_engagement` el **8 ago 2026** (resultado del 27 jul 2026). Esta pide **solo los dos permisos de Instagram**; los seis de Facebook ya están aprobados con acceso avanzado y aparecen en el formulario como "Acceso existente para revisar" — no se vuelven a justificar.

> **La regla de oro de esta solicitud**: todas las acciones de moderación que se vean en el vídeo tienen que ser **sobre comentarios de Instagram**. Facebook aparece únicamente en el paso de conexión, porque el diálogo OAuth de Facebook es donde se conceden estos dos permisos. Enseñar moderación de comentarios de Facebook es enseñar `pages_manage_engagement`, que es otro permiso ya aprobado — y *"el vídeo no coincide con el caso de uso"* fue exactamente el motivo del rechazo de julio.

---

## 0. Estado verificado (1 sep 2026)

Comprobado contra el código, la base de datos de producción y la Graph API real. Todo lo que este guion le promete a Meta está implementado y funcionando:

| Lo que se le dice a Meta | Dónde está en el código | Probado |
|---|---|---|
| `GET /me/accounts` … `instagram_business_account{id,name,profile_picture_url}` | `lib/meta/client.ts:237` | ✅ 6 cuentas IG conectadas |
| `GET /{ig-media-id}?fields=caption` | `client.ts:164` ← `pipeline.ts:326` | ✅ HTTP 200 con caption real |
| `POST /{ig-comment-id}/replies` | `client.ts:63` ← `pipeline.ts:372`, `comments.ts:34` | ✅ 3 respuestas reales el 8 ago |
| `POST /{ig-comment-id}` `{hide:true}` | `client.ts:129` ← `pipeline.ts:253,297` | ✅ implementado |
| `DELETE /{ig-comment-id}` | `client.ts:78` ← `pipeline.ts:236,284`, `comments.ts:118,161` | ✅ implementado |

Infraestructura lista: suscripción `instagram → comments (v26.0)` **activa** en la app; los 6 tokens de IG **válidos, sin caducidad, con `instagram_basic` e `instagram_manage_comments`**; `AppSetting.openai_api_key` puesta; webhook recibiendo comentarios de Instagram en tiempo real con firma válida.

**Instagram NO permite editar comentarios.** El vídeo debe enseñar **crear (responder), ocultar y borrar** — nunca editar. El UI ya oculta el botón "Edit reply" en las filas de Instagram (`CommentRow.tsx:50`), así que no hay riesgo de que salga un botón roto en cámara.

---

## 1. Cuenta con la que grabar: **@urbamares_**

| | |
|---|---|
| Cuenta de Instagram | **@urbamares_** — "Urbanizadora Martinez Esparza" (`17841405787641542`) |
| Página de Facebook vinculada | **UrbaMares** (`224830611012407`) |
| Bot | **Bot UrbaMares** |
| Usuario de la app | `duver20000@gmail.com` (tenant "Duberney", ENTERPRISE) |
| Seguidores / posts | 8.486 / 662, publica a diario |

**Por qué esta y no otra**: es el único bot ya configurado **en inglés** (`language='en'`), con **46 entradas de Knowledge Base**, keyword de borrado `scam` e instrucciones de moderación en lenguaje natural en inglés. Es además el bot que aparece en la nota a revisores del envío ya aprobado, así que hay continuidad. Los otros cinco bots con Instagram vinculado están en español y con la KB vacía.

### ⚠️ Antes de encender nada, léete esto

**@urbamares_ es una cuenta real de un negocio real con 8.486 seguidores que publica todos los días.** Encender el bot significa que la IA va a empezar a **responder públicamente, en inglés, a clientes reales** — no solo a tus comentarios de prueba. El post del 1 sep ya tiene 7 comentarios.

Opciones:

- **Grabar y apagar** — enciendes, grabas los ~10 minutos, apagas. Es lo que menos expone.
- **Dejarlo encendido** — Meta valora el uso real y el contador de llamadas de prueba se alimenta solo, pero asume respuestas automáticas en inglés a tu audiencia hispanohablante.
- **Cambiar `language` a `es`** — el bot respondería bien a la audiencia real, pero **rompe el vídeo**: Meta exige inglés. Si eliges esto, cámbialo a `en` solo durante la grabación.

Mi recomendación: **encender, grabar, apagar**, y volver a encender solo cuando decidas conscientemente poner el producto en marcha en esa cuenta.

---

## 2. Pre-flight OBLIGATORIO

Cada punto es un fallo que **no da error visible** durante la grabación — te enteras al revisar el vídeo.

### 2.1 — Bloqueantes que he confirmado hoy que están mal

- [ ] **`Bot UrbaMares` está APAGADO** (`isActive = false`). Igual que los otros 30. Sin esto el webhook descarta el comentario en `route.ts:132` y no pasa absolutamente nada. → **Bots → Bot UrbaMares → Master switch ON.**
- [ ] **`spamKeywords` está VACÍO** (`[]`). Sin una keyword de spam, el paso 2 del pipeline nunca dispara y **la escena de "ocultar" no ocurre de forma determinista** (quedaría a criterio del clasificador de IA, que puede decidir otra cosa en cámara). → **Moderation Rules → añade `followers`** (y si quieres `crypto`, `loan`, `giveaway`).

### 2.2 — Verificar que siguen bien

- [ ] **Channels: Facebook OFF, Instagram ON.** Es la jugada clave del vídeo: con Facebook apagado, ninguna acción que se vea puede confundirse con `pages_manage_engagement`.
- [ ] **AI Configuration → Language = English.** Ya está en `en`. Confírmalo.
- [ ] **Keyword de borrado `scam`.** Ya está.
- [ ] **Knowledge Base con 46 entradas.** Ya está (todas globales, sin proyectos).
- [ ] **Key de OpenAI** en `/admin` → AI & Usage. Ya está puesta.
- [ ] La cuenta de Facebook que conecta debe tener **rol en la Meta app**. Mientras estos dos permisos no estén aprobados, Meta solo se los concede a esas cuentas.
- [ ] **Navegador en inglés** y la app en inglés (ya lo está).
- [ ] **Prueba el modo incógnito antes de grabar**: abre el permalink de un post de @urbamares_ sin sesión y comprueba que se ven los comentarios. Lo necesitas para las escenas de ocultar y borrar.

### 2.3 — Preparación de la grabación

Vas a necesitar **tres contextos en pantalla**, igual que en el vídeo aprobado:

1. **Panel de LionsCore** — sesión de `duver20000@gmail.com`.
2. **Instagram como usuario que comenta** — una cuenta personal, **no** la del negocio. Los comentarios deben ser **de primer nivel** sobre el post: el pipeline ignora deliberadamente las respuestas a comentarios (`pipeline.ts:216`, para evitar bucles).
3. **Instagram sin sesión (incógnito)** — es la "vista pública" con la que se demuestra que ocultar y borrar surten efecto de verdad.

Elige **un post concreto** de @urbamares_ y quédate en él todo el vídeo. Sugerencia: el reel del 1 sep (`https://www.instagram.com/reel/DcuVsbvEjGV/`), cuya caption habla del **96% de avance de la Torre 2 de Flora Club House** — sirve para enseñar que la IA lee el contexto del post.

---

## 3. Guion del vídeo

**Forma que exige Meta**: navegador y app en inglés, subtítulos en inglés describiendo cada clic, ritmo pausado, cada acción verificada en Instagram. Objetivo **6–7,5 min, 1080p** (el aprobado duró 6:47).

Graba **de una sola pasada**. No reaproveches metraje del vídeo de julio: el diálogo de OAuth ahora lista dos permisos más y mezclar tomas con estados distintos del UI se nota.

### Bloque A — Acceso (0:00–0:30)

| # | En pantalla | Subtítulo en inglés |
|---|---|---|
| 1 | `https://sia.lionscore.ai`, pantalla de login. | *This is LionsCore, a comment-moderation tool for businesses.* |
| 2 | Escribes email y contraseña, entras. | *Users sign in with email and password. LionsCore does not use Facebook Login to sign in.* |

### Bloque B — Conectar la cuenta · `instagram_basic` (0:30–1:45)

| # | En pantalla | Subtítulo en inglés |
|---|---|---|
| 3 | Vas a **Accounts** y pulsas **Connect Account**. | *The Meta dialog appears here, at Connect Account — not at sign-in.* |
| 4 | Diálogo de Facebook: selección de Página y de negocio. | *The admin selects the Facebook Page they administer.* |
| 5 | **Pantalla de permisos. PÁRATE AQUÍ 4–5 segundos** y deja la lista legible. Si sale en español, no pasa nada — el subtítulo la traduce. | *Granting access to the Instagram account linked to the Page — instagram_basic and instagram_manage_comments.* |
| 6 | Confirmación y vuelta a `/accounts`. | *Authorization complete.* |
| 7 | **Plano fijo sobre la fila de Instagram**: icono de Instagram, nombre "Urbanizadora Martinez Esparza" y foto de perfil. | *instagram_basic — the app reads the Instagram Business account linked to the Page, and shows it here: name and profile picture. Without this the admin could not see which account is connected, and the app would have no account to moderate.* |

> Esta escena 7 es **la prueba visual de `instagram_basic`**. No la pases rápido.

### Bloque C — Configuración (1:45–3:00)

| # | En pantalla | Subtítulo en inglés |
|---|---|---|
| 8 | Abres el bot → **Channels**. Apagas **Facebook**, dejas **Instagram** encendido. | *One bot serves this business on both networks. For this review we enable only the Instagram channel, so every action you will see is an Instagram action.* |
| 9 | **Knowledge Base**: haces scroll por las 46 entradas (precios, áreas, ubicación). | *The Knowledge Base the admin configured. The AI may only answer from this.* |
| 10 | **Moderation Rules**: keyword de borrado `scam`, keyword de spam `followers`, y las instrucciones en lenguaje natural. | *And the moderation rules: banned keywords, spam keywords, and instructions in plain English. The app never acts outside these rules.* |
| 11 | Enciendes el **Master switch**. | *The bot is now active.* |

### Bloque D — RESPONDER · `instagram_manage_comments` + contexto del post (3:00–4:15)

| # | En pantalla | Subtítulo en inglés |
|---|---|---|
| 12 | Abres el post de Instagram y **muestras su caption** ("...Torre 2 de Flora Club House, 96% de avance..."). | *This is the post. The app will read its caption to give the AI context.* |
| 13 | Desde la cuenta personal, comentas de primer nivel: **"Hello! How much does an apartment cost, and what initial payment do you ask for?"** | *A real user asks a genuine question on the post.* |
| 14 | Vuelves al panel `/comments`. En segundos aparece la fila con el comentario y la respuesta publicada. | *The comment arrives through the Instagram webhook and is processed on our server.* |
| 15 | Lees en pantalla la respuesta generada. | *instagram_basic — the app read this post's caption for context. The AI then composed the answer from the Knowledge Base.* |
| 16 | **En Instagram**: la respuesta publicada bajo el comentario, firmada por @urbamares_. | *instagram_manage_comments — CREATE. The reply is live on Instagram, published by the account.* |

### Bloque E — Corregir la respuesta publicada (4:15–5:10)

Este es el **equivalente honesto al "EDIT"** del vídeo de Facebook, que es la escena que convenció a los revisores en julio. Instagram no tiene endpoint para editar un comentario, así que la app lo resuelve en dos pasos: **borrar la respuesta publicada y publicar una nueva**. El comentario del usuario nunca se toca.

| # | En pantalla | Subtítulo en inglés |
|---|---|---|
| 17 | En `/comments`, sobre la fila respondida, pulsas **Delete reply**. | *Instagram's API does not allow editing a published comment, so LionsCore corrects a reply in two steps. First, the admin deletes the reply the app published.* |
| 18 | **En Instagram**: la respuesta ya no está; el comentario del usuario **sigue ahí**. | *instagram_manage_comments — DELETE, applied only to the reply the account published. The user's own comment is untouched.* |
| 19 | De vuelta en `/comments`, la fila queda como **Reply deleted** y el botón **Reply** vuelve a estar disponible. Escribes una respuesta corregida y la publicas. | *The admin then publishes a corrected reply from the dashboard.* |
| 20 | **En Instagram**: la nueva respuesta bajo el mismo comentario. | *instagram_manage_comments — CREATE, this time written by the admin instead of the AI. The admin keeps full control of what the account publishes.* |

> **No intentes editar**: en Instagram no se puede, y el botón "Edit reply" ni siquiera aparece en las filas de Instagram — el UI lo oculta (`CommentRow.tsx:50`) y el servidor lo rechaza (`lib/meta/comments.ts:69`). Enseñar un botón que falla sería un motivo de rechazo.

### Bloque F — OCULTAR (5:10–6:00)

| # | En pantalla | Subtítulo en inglés |
|---|---|---|
| 21 | Ventana **incógnito** con el post abierto. Se ven los comentarios. | *This is the public view of the post, signed out.* |
| 22 | Desde la cuenta personal comentas: **"Get 10,000 followers fast, link in my bio!"** | *A user posts spam. It matches the spam keyword the admin configured.* |
| 23 | `/comments` registra la acción como **HIDDEN**. | *The app hides it automatically.* |
| 24 | **Refrescas la ventana incógnito**: el comentario ya no aparece. | *instagram_manage_comments — HIDE. The spam is no longer visible to the public.* |
| 25 | En la ventana de la cuenta que comentó, el comentario **sigue existiendo**. | *Hiding does not destroy the comment — it stops being visible to others. The app hides, it does not delete, when the rule says hide.* |

> La escena 23 es la que distingue OCULTAR de BORRAR. A Meta le importa que sepas la diferencia.

### Bloque G — BORRAR (6:00–6:40)

| # | En pantalla | Subtítulo en inglés |
|---|---|---|
| 26 | Desde la cuenta personal comentas: **"Don't buy here, this company is a scam"** | *A comment matching the banned keyword "scam" that the admin configured.* |
| 27 | `/comments` lo registra como **DELETED**. | *The app deletes it automatically, according to the admin's rule.* |
| 28 | **Refrescas incógnito**: no está. | *instagram_manage_comments — DELETE. The comment is gone from the post.* |

### Bloque H — Auditoría y revocación (6:40–7:10)

| # | En pantalla | Subtítulo en inglés |
|---|---|---|
| 29 | `/comments` con las cuatro acciones: Replied, Deleted (reply), Hidden, Deleted. | *Every action is recorded for the admin to audit: what the comment said, what the app did, and the reply it published.* |
| 30 | `/accounts` → **Disconnect**, y lo cancelas (o lo haces de verdad al final). | *The admin can disconnect the account at any time, which revokes our access and stops the webhooks.* |

---

## 4. Textos del caso de uso (en INGLÉS)

⚠️ **Cada permiso se solicita en su propio diálogo**, con su caja de descripción y su subida de vídeo. **El mismo archivo de vídeo va en los dos** — no hay que grabar dos.

### 4.1 — `instagram_basic`

> LionsCore is a comment-moderation tool for businesses. The admin signs in with email and password, then connects a Facebook Page they administer; we use `instagram_basic` to work with the Instagram Business account linked to that Page.
>
> We use it for exactly two things:
>
> 1. **Identify the Instagram account to manage.** Right after the admin authorizes the Page, we read `GET /me/accounts` with the field `instagram_business_account{id,name,profile_picture_url}` to obtain the linked account's id, name and profile picture. Without this the admin could not see which Instagram account is connected, and the app would have no account to moderate. The connected account is displayed on the "Accounts" screen of the dashboard, shown in the video at 01:20.
> 2. **Read the caption of the post a comment belongs to.** When a comment arrives, we read `GET /{ig-media-id}?fields=caption` and pass that caption to the AI as context for that specific post, so the published answer is relevant to what the post is actually about instead of a generic reply. This is shown in the video at 03:00, where the post's caption is displayed before the reply is composed.
>
> The value for the person using the app is that they configure their business once and the app then answers their Instagram audience accurately, with the context of each post. We do not read profile data beyond the account's basic metadata, and we do not use it for advertising or profiling.

### 4.2 — `instagram_manage_comments`

> LionsCore uses `instagram_manage_comments` to moderate the comments on the Instagram Business account the admin has connected. This is the core function of the product: after connecting the account the admin configures a bot with a Knowledge Base and moderation rules, and the app then acts on incoming comments in one of three ways, all shown end to end in the video:
>
> 1. **Reply** (03:00–04:15) — when a user asks a genuine question on an Instagram post, the AI composes an answer strictly from the admin's Knowledge Base and publishes it as a reply with `POST /{ig-comment-id}/replies`. The reply is then shown live on Instagram.
> 2. **Correct a published reply** (04:15–05:10) — Instagram's API does not support editing a published comment, so LionsCore corrects a reply in two steps that the video shows end to end: the admin deletes the reply the account published (`DELETE /{ig-comment-id}` applied to the reply only, leaving the user's comment untouched), and then publishes a corrected reply from the dashboard (`POST /{ig-comment-id}/replies`). Because editing is not possible on Instagram, our interface hides the edit control on Instagram rows and our server rejects an edit request for a non-Facebook comment; we never call an unsupported endpoint.
> 3. **Hide** (05:10–06:00) — a comment matching the admin's spam rules is hidden with `POST /{ig-comment-id}` and `hide=true`, so it stops being visible to others without being destroyed. The video shows the public, signed-out view of the post before and after, and shows that the comment still exists for its author.
> 4. **Delete** (06:00–06:40) — a comment matching the admin's banned-keyword rules, or classified as abusive, is deleted with `DELETE /{ig-comment-id}`. The video shows it is gone from the post.
>
> The value for the person using the app is that questions from potential customers are answered within seconds instead of hours, and abusive or spam comments are removed without anyone watching the account full time. Without this permission the app could read Instagram comments but could not act on them, which is the entire purpose of the product.
>
> Incoming comments arrive through the `instagram` webhook (`comments` field) and are processed server-to-server on our backend through a message queue. Every action is recorded in an auditable log the admin reviews in the dashboard, shown at 06:20.

> Ajusta los minutajes a los del vídeo final. Citar el instante exacto donde se ve cada cosa es lo que hace que un revisor no tenga que buscar — y el rechazo de julio fue precisamente que no encontraron el caso de uso.

---

## 5. Nota para los revisores ("Web reviewer instructions", en INGLÉS)

> **How login works.** LionsCore uses its own email + password login, not Facebook Login. The Meta OAuth dialog appears only when the admin clicks **"Connect Account"** on the `/accounts` screen, which is where the requested Instagram permissions are granted. We call this out so you know the Meta dialog is shown at the Connect-Account step and not at app sign-in.
>
> **How Instagram is connected.** The app uses the Instagram API with Facebook Login. The Instagram account is not connected on its own: the admin authorizes the **Facebook Page**, and we read the Instagram Business account linked to that Page. One bot then serves both networks, and the admin can enable or disable each channel independently. Instagram does not support editing comments, so the app offers reply, hide and delete on Instagram — never edit.
>
> **Reviewer access URL:** https://sia.lionscore.ai
> **Email:** `duver20000@gmail.com` · **Password:** `<LA CONTRASEÑA>`
>
> This test account already has an Instagram Business account connected (**@urbamares_**, linked to the "UrbaMares" Facebook Page), with its bot active, its Knowledge Base and its moderation rules configured, so the whole flow can be reviewed immediately.
>
> **Steps:** 1) Sign in. 2) Open **Accounts** — the connected Instagram account is listed with its name and profile picture. 3) Open **Bots** → the bot → the **Channels** section, where Instagram is enabled, plus its **Knowledge Base** and **Moderation Rules**. 4) Open **Comments** to see the Instagram comments received and the action taken on each one — replied, hidden or deleted — including the text of the reply the app published. 5) To see the Meta OAuth dialog yourself, go to **Accounts** and click **Connect Account**; reconnecting an already connected Page is supported and simply refreshes its access token.

---

## 6. El bloqueante del formulario: 1 llamada de prueba por permiso

Ambos diálogos muestran hoy:

```
instagram_basic            ● 0 de 1 llamadas de prueba a la API necesarias
instagram_manage_comments  ● 0 de 1 llamadas de prueba a la API necesarias
```

Meta no deja completar el envío hasta que el contador llegue a 1, y **los datos tardan hasta 24 horas en aparecer**. No se resuelve el mismo día.

**No hay que fabricar nada**: grabar el vídeo ejecuta las dos llamadas de verdad. La escena 7 dispara `instagram_basic` (lectura de `instagram_business_account`), la escena 15 también (`caption`), y las escenas 16, 22 y 26 disparan `instagram_manage_comments`.

**Qué hacer**: graba el vídeo, espera 24 h, entra y comprueba que ambos marcan `1 de 1`, y solo entonces completa el envío. Si alguno siguiera en 0, fuerza la llamada desde el **Graph API Explorer** con el token de la página.

Guarda el texto de las descripciones antes de salir del diálogo: si sales sin pulsar "Guardar", se pierde lo escrito.

---

## 7. Checklist de envío

- [ ] Pre-flight de la sección 2 completo (**bot encendido** y **keyword de spam añadida** — los dos bloqueantes reales).
- [ ] Vídeo grabado de una pasada, 1080p, inglés.
- [ ] Vídeo subtitulado (lo hago yo a partir de la grabación cruda).
- [ ] Minutajes de los textos 4.1 y 4.2 ajustados a los del vídeo final.
- [ ] Texto **4.1** en el diálogo de `instagram_basic`, texto **4.2** en el de `instagram_manage_comments`. Son cajas distintas.
- [ ] El **mismo vídeo** subido en los dos diálogos.
- [ ] Casilla de confirmación de uso permitido marcada en cada uno.
- [ ] Ambos contadores en **`1 de 1`** llamadas de prueba (tarda hasta 24 h).
- [ ] Nota de la sección 5 pegada en las instrucciones para revisores, con la contraseña real.
- [ ] **No** solicitar `instagram_manage_contents` (publicaciones), `instagram_manage_messages` (mensajes directos) ni `instagram_manage_insights`. Pedir permisos que la app no usa es causa habitual de rechazo.
- [ ] Decidir si el bot de @urbamares_ se queda encendido o se apaga tras grabar (sección 1).

---

## 8. Material de referencia

- Vídeo aprobado: `C:\Users\duver\Videos\LionsCore-AppReview-EN-subtitled.mp4` (6:47, 1920×1080)
- Grabación cruda de aquel: `C:\Users\duver\Videos\2026-07-27 00-41-50.mkv`
- Subtítulos estilizados que sirven de plantilla: `C:\Users\duver\Videos\subs-lionscore.ass`
- Guion del envío aprobado: `GUION_APP_REVIEW_META.md`
