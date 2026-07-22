# Guion para re-enviar App Review a Meta — `pages_manage_engagement`

Motivo del rechazo anterior (4 jul 2026): *"La captura de video no coincide con los detalles del caso de uso"*. Meta pidió: (1) mostrar el flujo de login completo, (2) un usuario con acceso al permiso, (3) la experiencia COMPLETA del caso de uso, (4) UI en inglés con subtítulos que expliquen cada botón, (5) si es server-to-server, indicarlo.

Este guion cubre todo eso. La app cambió desde el rechazo: el login ahora es **email + contraseña** y el OAuth de Facebook aparece **solo al conectar una página**. Además ya existe la función de **editar** respuestas, así que el caso de uso "create, edit, and delete" ahora es 100% real.

---

## A. Texto del caso de uso (pégalo en el formulario, en INGLÉS)

**Tell us how you're using this permission:**

> LionsCore uses `pages_manage_engagement` to reply to, edit, and delete comments on the Facebook Pages that the Page admin connects. After the admin connects a Page and configures a bot, the app moderates incoming comments in three ways, all shown end-to-end in the video:
>
> 1. **Automatic AI reply** — when a user comments a genuine question on a Page post, the app's AI generates a contextual answer from the admin's configured Knowledge Base and publishes it as a reply on the Page. The reviewer can then see the published reply on Facebook.
> 2. **Edit a published reply** — from the "Comments" screen the admin edits a reply the Page already published; the change is applied to the live comment on Facebook.
> 3. **Delete / hide** — a comment that matches the admin's banned-keyword rules is automatically deleted (or hidden as spam) from the Page, which the reviewer can confirm is no longer visible on Facebook.
>
> This permission is essential because moderating comments — replying to legitimate questions, editing replies, and removing spam — is the core function of the app. Without it, LionsCore could read comments but could not act on them. Note: incoming comments arrive via Webhooks and are processed server-to-server on our backend (a message queue); the result is what the admin sees in the "Comments" screen, as demonstrated in the video.

---

## B. Nota para los revisores (sección "Web reviewer instructions", en INGLÉS)

> **Important — how login works.** LionsCore uses its own email + password login (not Facebook Login), so the Facebook/Meta OAuth dialog does NOT appear at sign-in. Facebook OAuth appears only when the admin clicks **"Connect Account"** on the /accounts screen to authorize a Page (this is where the requested Page permissions are granted). We call this out so you are aware the Meta login flow is shown at the Connect-Account step, not at app sign-in.
>
> **Test credentials:** Email: `<CREА UN USUARIO DE PRUEBA DESDE /admin Y PON AQUÍ SU EMAIL>` · Password: `<LA CONTRASEÑA TEMPORAL QUE GENERES>`
> (This user already administers a test Facebook Page. After signing in, go to /accounts → Connect Account to authorize it.)
>
> **Steps:** 1) Go to https://sia.lionscore.ai and sign in with the credentials above. 2) Go to /accounts and click "Connect Account"; approve the Page in the Facebook dialog. 3) Go to /bots, open the bot, enable AI auto-reply and add a Knowledge Base entry (e.g. Key "Price", Value "$50"), then turn the bot ON. 4) Comment on a post of the connected Page from another Facebook account; it appears in /comments in real time. Use Reply, Edit reply, and Delete on comments, then check the Page on Facebook to confirm each action.

---

## C. Guion del video (grábalo así, en este orden)

**Reglas de forma (las exige Meta):** navegador y app en **inglés**; **subtítulos o rótulos en inglés** describiendo cada clic; ritmo pausado; cada acción se verifica en Facebook. Duración objetivo: 3–5 min. Graba en 1080p.

| # | En pantalla (qué haces) | Subtítulo / narración en inglés |
|---|---|---|
| 1 | Abre `https://sia.lionscore.ai`. Se ve la pantalla de login (email + password). | "This is LionsCore. Users sign in with email and password — not Facebook Login." |
| 2 | Escribe el email y la contraseña del usuario de prueba y pulsa **Sign in**. | "Signing in with our test user's email and password." |
| 3 | Ya dentro, ve a **Accounts** en el menú y pulsa **Connect Account**. | "To connect a Facebook Page, the admin clicks Connect Account. This is where Meta's OAuth dialog appears." |
| 4 | Aparece el **diálogo de Facebook**: selecciona la página de prueba y **autoriza todos los permisos**. | "The Facebook permission dialog. We select the Page we administer and approve the requested permissions, including pages_manage_engagement." |
| 5 | Vuelves a `/accounts` y se ve la página listada con "Webhook subscribed". | "The Page is connected and subscribed to webhooks." |
| 6 | Ve a **Bots**, abre el bot de la página, **activa Auto-reply**, abre **Knowledge Base**, añade una entrada (Key: Price, Value: $50) y **enciende el bot** (master switch). | "We enable AI auto-reply, add a knowledge entry, and turn the bot on." |
| 7 | Abre Facebook en otra pestaña/cuenta y **comenta una pregunta real** en un post de la página (ej: "How much does it cost?"). | "From another Facebook account, a user comments a real question on the Page's post." |
| 8 | Vuelve a **/comments** en LionsCore: el comentario aparece en tiempo real y el bot publica una respuesta (acción REPLIED). | "The comment appears in real time and the AI publishes a reply on the Page." |
| 9 | Ve a la página en **Facebook** y muestra la **respuesta publicada** bajo el comentario. | "Here is the AI reply, published on the Page. (pages_manage_engagement — create.)" |
| 10 | En **/comments**, en esa fila pulsa **Edit reply**, cambia el texto y guarda. | "The admin edits the published reply from the dashboard." |
| 11 | Vuelve a **Facebook** y muestra que el texto de la respuesta **cambió**. | "The reply is now updated on the Page. (pages_manage_engagement — edit.)" |
| 12 | Provoca un comentario spam que coincida con una keyword prohibida (o usa el botón **Delete** en /comments sobre un comentario). | "A comment matching a banned keyword is removed by the bot; the admin can also delete manually." |
| 13 | Vuelve a **Facebook** y muestra que el comentario **ya no está visible**. | "The comment is no longer visible on the Page. (pages_manage_engagement — delete.)" |
| 14 | Cierre: muestra /comments con las acciones registradas (REPLIED, MANUAL_REPLY, DELETED). | "Every action is logged. Replying, editing and removing comments is the core of LionsCore." |

---

## D. Checklist antes de grabar y enviar

- [ ] Crear un **usuario de prueba** desde `/admin` (User type: User) y anotar email + contraseña temporal → ponerlos en la sección B.
- [ ] Que ese usuario **reconecte la página demo** (para que su token tenga `pages_manage_engagement`) y que el bot quede activo con Knowledge Base.
- [ ] Navegador con **idioma inglés** y la UI de la app en inglés (ya lo está).
- [ ] **Subtítulos/rótulos en inglés** en el video (los de la tabla C).
- [ ] Mostrar cada acción **verificada en Facebook** (respuesta publicada, editada, borrada).
- [ ] En el formulario: pegar el **texto A**, la **nota B** con las credenciales, y subir el video.
- [ ] Confirmar que la app está en **Live mode** (lo está).
- [ ] Enviar y esperar el resultado (suele tardar unos días).
