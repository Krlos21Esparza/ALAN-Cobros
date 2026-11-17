# ALAN — Control de cobros

Esta carpeta contiene la copia recuperada del proyecto ALAN, conservada como una aplicación HTML independiente.

## Publicación gratuita con GitHub Pages

1. Sube **el contenido de esta carpeta** a la raíz del repositorio `Krlos21Esparza/ALAN-Cobros` (no subas únicamente el ZIP).
2. En GitHub abre **Settings → Pages**.
3. En **Build and deployment**, selecciona **GitHub Actions**.
4. El workflow `Deploy ALAN to GitHub Pages` publicará `index.html` automáticamente al hacer push a la rama principal.
5. La dirección esperada será `https://krlos21esparza.github.io/ALAN-Cobros/` una vez que GitHub confirme el despliegue.

## Estado técnico comprobado de esta copia

- El archivo original tiene 2.005 líneas aproximadamente y se conserva sin reescribir su lógica.
- El JavaScript embebido pasó la comprobación sintáctica `node --check`.
- La persistencia detectada usa IndexedDB y localStorage del navegador.
- Esta copia no contiene integración con Supabase, Firebase ni Google Drive. Por tanto, **todavía no sincroniza datos entre dispositivos ni tiene una base de datos central en la nube**.
- GitHub Pages aloja archivos estáticos; no es una base de datos ni ejecuta un backend.

## Antes de introducir datos reales

Haz una copia de seguridad desde la propia aplicación y conserva el archivo exportado. No uses esta versión como base de datos compartida entre varios dispositivos hasta implementar y probar autenticación, base de datos remota, políticas de acceso y sincronización offline.
