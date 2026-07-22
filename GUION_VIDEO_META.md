# Guion del video — App Review de Meta (`pages_manage_engagement`)

Versión **mínima recomendada** (Opción A): se demuestra **responder** y **borrar/ocultar** comentarios. No se muestra "editar" (no hace falta, y menos cosas = menos riesgo de que el video no coincida con el texto).

**Texto del caso de uso que va con este video** (pégalo en el formulario, en inglés):
> LionsCore uses pages_manage_engagement to publish replies on behalf of the Page and to delete or hide spam and inappropriate comments. After the admin connects a Page and configures a bot, the app replies to real questions with AI and removes spam based on the admin's rules — all shown end-to-end in this video. Comments arrive via Webhooks and are processed server-to-server on our backend.

---

## ✅ Antes de grabar (checklist)

- [ ] Crea un **usuario de prueba** desde `/admin` (User type: **User**) y anota su email + contraseña. **NO uses la cuenta de admin.**
- [ ] Con ese usuario, conecta la **página de prueba** y deja el **bot encendido** con al menos una entrada en el Knowledge Base (ej. Key: `Price`, Value: `$50`).
- [ ] Ten a mano **otra cuenta de Facebook** (distinta) para comentar en la página.
- [ ] Navegador y app **en inglés**. Graba en 1080p, ritmo pausado.
- [ ] Prepara **subtítulos/rótulos en inglés** (la columna derecha de la tabla).
- [ ] La app está en **Live mode** (ya lo está).

> Consejo: antes de grabar, **desconecta la página y bórrala** para grabar la conexión desde cero, o graba directamente el "Connect account". El revisor quiere ver el flujo completo.

---

## 🎬 Guion escena por escena

| # | En pantalla (qué haces) | Subtítulo en inglés (lo que se ve/lee en el video) |
|---|---|---|
| 1 | Abre `https://sia.lionscore.ai`. Se ve el login de **email + contraseña**. | "LionsCore. Users sign in with email and password — not Facebook Login." |
| 2 | Escribe email y contraseña del **usuario de prueba** y pulsa **Sign in**. | "Signing in with our test user." |
| 3 | En el menú, entra a **Accounts**. Se ve la pantalla de conexión con la guía. | "To connect a Facebook Page, the user goes to Accounts." |
| 4 | Pulsa el botón azul **Continue with Facebook**. | "The user connects a Page. This is where Meta's OAuth dialog appears." |
| 5 | En el **diálogo de Facebook**: selecciona la página que administras y **aprueba todos los permisos**. | "We select a Page we administer and approve the requested permissions, including pages_manage_engagement." |
| 6 | Vuelves a `/accounts`; la página aparece con **"Webhook subscribed"**. | "The Page is connected and subscribed to webhooks." |
| 7 | Entra a **Bots**, abre el bot de la página. Activa **AI auto-reply**, abre **Knowledge Base**, muestra la entrada (Price / $50), y **enciende el bot** (master switch → ON). | "We enable AI auto-reply, show the knowledge base, and turn the bot on." |
| 8 | Abre **Facebook** (en otra cuenta) y **comenta una pregunta real** en un post de la página. Ej: *"How much does it cost?"* | "From another Facebook account, a user comments a real question on the Page." |
| 9 | Vuelve a **/comments** en LionsCore. El comentario **aparece en tiempo real** y el bot publica una **respuesta** (acción REPLIED). | "The comment appears in real time and the AI publishes a reply on the Page." |
| 10 | Ve a la página en **Facebook** y muestra la **respuesta publicada** debajo del comentario. | "Here is the AI reply, published on the Page. → pages_manage_engagement (reply)." |
| 11 | Genera un **comentario spam** que coincida con una keyword prohibida (o usa el botón **Delete** sobre un comentario en `/comments`). | "A spam comment matching a banned keyword is removed by the bot; the admin can also delete manually." |
| 12 | Vuelve a **Facebook** y muestra que ese comentario **ya no está visible**. | "The comment is no longer visible on the Page. → pages_manage_engagement (delete / hide)." |
| 13 | Cierre: muestra `/comments` con las acciones registradas (REPLIED, DELETED). | "Every action is logged. Replying to questions and removing spam is the core of LionsCore." |

---

## 📌 Al enviar el formulario

- Pega el **texto del caso de uso** de arriba.
- En **"Web reviewer instructions"** pon las **credenciales del usuario de prueba** (email + contraseña) y aclara: *"App login is email + password; the Facebook OAuth dialog appears at the Connect Account step, not at sign-in."*
- Sube este **video**.
- Confirma **Live mode**.

> Si algún día quieres incluir también la **edición** de respuestas, hay que añadir en el texto "edit" y en el video un paso extra: responder → editar la respuesta desde `/comments` → verificar el cambio en Facebook. Para esta aprobación **no es necesario**.
