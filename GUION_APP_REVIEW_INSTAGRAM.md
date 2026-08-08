# Guion para App Review de Meta — `instagram_basic` + `instagram_manage_comments`

Segunda solicitud, después de que Meta aprobara `pages_manage_engagement` el **8 ago 2026**. Esta pide **solo los dos permisos de Instagram**; los seis de Facebook ya están aprobados con acceso avanzado y NO se vuelven a solicitar.

> **La regla de oro de esta solicitud**: todas las acciones de moderación que se vean en el vídeo tienen que ser **sobre comentarios de Instagram**. Facebook aparece únicamente en el paso de conexión, porque el diálogo OAuth de Facebook es donde se conceden estos dos permisos. Enseñar moderación de comentarios de Facebook es enseñar `pages_manage_engagement`, que es otro permiso ya aprobado — y "el vídeo no coincide con el caso de uso" fue exactamente el motivo del rechazo de julio.

---

## A. Texto del caso de uso (pégalo en el formulario, en INGLÉS)

**Tell us how you're using these permissions:**

> LionsCore helps a business moderate the comments on the Instagram Business account linked to a Facebook Page it administers. The admin connects the Page, configures one bot with a knowledge base and moderation rules, and the app then moderates incoming Instagram comments. Both permissions are used server-to-server on our backend, triggered by the `instagram` webhook (`comments` field).
>
> **`instagram_basic`** — after the admin authorizes the Page, we read the Instagram Business account linked to it (`GET /me/accounts`, field `instagram_business_account`) so the admin can see and select it in the dashboard, and we read the caption of the media a comment belongs to (`GET /{ig-media-id}?fields=caption`) so the AI answers with the context of that specific post instead of a generic reply.
>
> **`instagram_manage_comments`** — this is the core of the product. Once a comment arrives we act on it in one of three ways, all shown end-to-end in the video:
> 1. **Reply** — when a user asks a genuine question on an Instagram post, the AI composes an answer from the admin's configured knowledge base and publishes it as a reply (`POST /{ig-comment-id}/replies`). The reviewer can then see the reply live on Instagram.
> 2. **Hide** — a comment matching the admin's spam rules is hidden (`POST /{ig-comment-id}` with `hide=true`), so it stops being visible to other users without destroying it.
> 3. **Delete** — a comment matching the admin's banned-keyword rules, or classified as abusive, is deleted (`DELETE /{ig-comment-id}`). The reviewer can confirm it is gone from the post.
>
> Without `instagram_manage_comments` the app could read Instagram comments but could not act on them, which is the entire purpose of the product. Every action is recorded in an auditable log the admin reviews in the dashboard.

---

## B. Nota para los revisores (sección "Web reviewer instructions", en INGLÉS)

> **How login works.** LionsCore uses its own email + password login, not Facebook Login. The Meta OAuth dialog appears only when the admin clicks **"Connect Account"** on the `/accounts` screen, which is where the requested Instagram permissions are granted. We call this out so you know the Meta dialog is shown at the Connect-Account step and not at app sign-in.
>
> **How Instagram is connected.** The app uses the Instagram API with Facebook Login. The Instagram account is not connected on its own: the admin authorizes the **Facebook Page**, and we read the Instagram Business account linked to that Page. One bot then serves both networks, and the admin can enable or disable each channel independently.
>
> **Test credentials:** Email: `<EMAIL DEL USUARIO DE PRUEBA>` · Password: `<CONTRASEÑA>`
> This account already has an Instagram Business account connected and a bot configured, so you can review the connected account, its configuration and the log of actions taken on real Instagram comments right after signing in.
>
> **Steps:** 1) Go to https://sia.lionscore.ai and sign in. 2) Open `/accounts` — the connected Instagram account is listed. 3) Open `/bots`, open the bot and see the **Channels** section, where Instagram is enabled, plus its Knowledge Base and Moderation Rules. 4) Open `/comments` to see the Instagram comments received and the action taken on each one (replied, hidden, deleted), with the published reply text.

---

## C. Guion del vídeo

**Requisitos de forma que exige Meta:** navegador y app en **inglés**, **subtítulos en inglés** describiendo cada clic, ritmo pausado, y cada acción verificada en Instagram. Objetivo 3–5 min, 1080p.

| # | En pantalla | Subtítulo / narración en inglés |
|---|---|---|
| 1 | Abre `https://sia.lionscore.ai`. Pantalla de login. | "This is LionsCore. Users sign in with email and password — not Facebook Login." |
| 2 | Introduces email y contraseña y entras. | "Signing in with our test user's credentials." |
| 3 | Vas a **Accounts** y pulsas **Connect Account**. | "To connect an Instagram account, the admin authorizes the Facebook Page it is linked to. This is where Meta's OAuth dialog appears." |
| 4 | Diálogo de Facebook. **Detente en la lista de permisos** y déjala legible. | "The permission dialog, including instagram_basic and instagram_manage_comments." |
| 5 | Vuelves a `/accounts`: se ve la **cuenta de Instagram** listada con su nombre y foto. | "The Instagram Business account linked to the Page is now connected. (instagram_basic)" |
| 6 | Abres el bot → sección **Channels**: apagas **Facebook**, dejas **Instagram** encendido. | "One bot serves this business. For this review we enable only the Instagram channel." |
| 7 | **Knowledge Base**: añades una entrada (ej. Key `Price`, Value `$50`). | "The admin adds a knowledge entry the AI will use to answer." |
| 8 | **Moderation Rules**: muestras una keyword de spam y otra de borrado. | "And the rules that decide what gets hidden or deleted." |
| 9 | Enciendes el **master switch**. | "The bot is now active." |
| 10 | Desde otra cuenta, comentas una **pregunta real** en un post de Instagram (ej. "How much does it cost?"). | "From another account, a user comments a real question on the Instagram post." |
| 11 | Vuelves a `/comments`: aparece el comentario y la respuesta publicada. | "The comment arrives through the Instagram webhook and the AI publishes a reply." |
| 12 | **En Instagram**, muestras la respuesta publicada bajo el comentario. | "Here is the reply, live on Instagram. (instagram_manage_comments — create)" |
| 13 | Comentas algo que coincida con una keyword de **spam** y muestras que queda oculto. | "A comment matching the spam rules is hidden from the post. (instagram_manage_comments — hide)" |
| 14 | Comentas algo que coincida con una keyword de **borrado**, o borras uno desde el panel. | "A comment matching the banned-keyword rules is deleted." |
| 15 | **En Instagram**, muestras que ese comentario ya no está. | "It is no longer visible on the post. (instagram_manage_comments — delete)" |
| 16 | Cierre en `/comments` con las acciones registradas. | "Every action is logged for the admin to audit." |

**Reaprovechar metraje**: los pasos 1–3 son idénticos a los del vídeo aprobado (`C:\Users\duver\Videos\2026-07-27 00-41-50.mkv`, grabación cruda). Lo único que cambia es el paso 4, donde el diálogo ahora lista dos permisos más — ese hay que regrabarlo sí o sí. Los subtítulos estilizados están en `subs-lionscore.ass`, sirven de plantilla.

---

## D. Pre-flight OBLIGATORIO antes de grabar

Cada punto de esta lista es un fallo que ya ocurrió alguna vez y que **no da error visible** durante la grabación:

- [ ] **Key de OpenAI puesta** en `/admin` → AI & Usage. Sin ella el pipeline corta en `getOpenAiApiKey` y registra IGNORED con "OpenAI API key not configured": no hay respuesta y el vídeo no sirve.
- [ ] **Bot → AI Configuration → Language = English.** El bot nace en `es` por defecto y respondería en español con la UI en inglés, lo que descuadra el vídeo.
- [ ] **Master switch encendido.** Un bot recién creado nace `isActive=false`.
- [ ] **Channels: Facebook OFF, Instagram ON**, para que ninguna acción del vídeo sea ambigua.
- [ ] **Considera apagar "AI-powered moderation"** si quieres garantizar que responde a todos los comentarios de la demo. Con el clasificador encendido, un comentario muy corto puede acabar en IGNORE.
- [ ] La cuenta de Instagram debe ser **Empresa o Creador** y estar **vinculada a la Página** de Facebook. Si no, `/me/accounts` devuelve `instagram_business_account` vacío y no aparece nada.
- [ ] La cuenta de Facebook que conecta debe tener **rol en la Meta app** (admin/desarrollador/tester): mientras estos dos permisos no estén aprobados, Meta solo se los concede a esas cuentas.
- [ ] El webhook de Instagram debe estar suscrito al campo `comments`. Comprobar sin depender de la UI de Meta:
      `GET https://graph.facebook.com/v21.0/{APP_ID}/subscriptions?access_token={APP_ID}|{APP_SECRET}`
      debe devolver `objeto=instagram` con `campo: comments`.
- [ ] App en **Live mode** y **publicada** (lo está).
- [ ] Navegador en **inglés**.

---

## E. Checklist de envío

- [ ] Pegar el **texto A** en el caso de uso de cada uno de los dos permisos.
- [ ] Pegar la **nota B** en las instrucciones para revisores, con credenciales reales rellenadas.
- [ ] Subir el vídeo.
- [ ] **No** solicitar `instagram_manage_contents` (es para publicaciones, no comentarios), `instagram_manage_messages` (mensajes directos) ni ningún otro permiso que la app no use: pedir permisos sin usar es causa habitual de rechazo.
- [ ] Verificar que las llamadas de prueba aparecen registradas (el contador de uso del permiso deja de estar en 0 cuando la app hace llamadas reales).
