# Plantilla de recuperación de contraseña de ALAN

Archivo: `reset-password.html`

## Uso

Esta plantilla está preparada para la plantilla **Authentication → Email Templates → Reset password** de Supabase.

- Asunto recomendado: `Restablece tu contraseña de ALAN`
- Cuerpo: copiar el contenido completo de `reset-password.html` en el editor de la plantilla.
- Variable obligatoria: `{{ .ConfirmationURL }}`. No la elimines ni la sustituyas: es el enlace seguro generado por Supabase.

## Estado de activación

La plantilla está guardada en este repositorio, pero todavía **no está activa en Supabase**. El proyecto ALAN-Cobros utiliza el SMTP predeterminado y Supabase muestra el aviso **“Set up custom SMTP to edit templates”**.

Para activarla hace falta configurar un proveedor SMTP externo o un envío personalizado mediante Auth Send Email Hook. No se debe publicar ninguna contraseña SMTP, API key ni secreto en este repositorio o en el frontend.

Una vez configurado el proveedor de correo, abre la plantilla Reset password en Supabase, pega el asunto y el HTML, guarda y realiza una prueba real de recuperación.

## Diseño

- Identidad ALAN: rojo `#d71920`, blanco y grises.
- Maquetación con tablas y estilos en línea para compatibilidad con clientes de correo.
- Botón principal y enlace alternativo con `{{ .ConfirmationURL }}`.
- Avisos de seguridad y diseño adaptable a móviles.
