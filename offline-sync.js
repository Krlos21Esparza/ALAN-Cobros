/* ALAN Cobros: persistencia local y sincronización diferida.
   No sustituye la autenticación: se necesita haber iniciado sesión antes
   y disponer de una sesión local válida para acceder a datos privados sin red. */
(() => {
  "use strict";
  const PENDING_KEY = "alan_offline_pending_v1";
  const BASELINE_KEY = "alan_cloud_baseline_v1";
  let flushing = false;

  const clone = value => JSON.parse(JSON.stringify(value ?? []));
  const readPending = () => {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "null"); }
    catch (_) { return null; }
  };
  const writeBaseline = () => {
    try {
      localStorage.setItem(BASELINE_KEY, JSON.stringify({
        people: [...(alanKnownPeople || [])],
        payments: [...(alanKnownPayments || [])]
      }));
    } catch (error) { console.warn("ALAN: no se pudo guardar la referencia de nube", error); }
  };
  const restoreBaseline = baseline => {
    if (!baseline) return;
    alanKnownPeople = new Set(baseline.people || []);
    alanKnownPayments = new Set(baseline.payments || []);
  };
  const showState = (message, color) => {
    const notice = document.getElementById("storageNotice");
    if (!notice) return;
    notice.textContent = message;
    notice.style.background = color || "";
    notice.style.color = color ? "#fff" : "";
  };
  const saveLocal = async () => {
    if (typeof database !== "undefined" && database) {
      await guardarIndexedDB(people);
      try { guardarLocalStorage(people); } catch (_) {}
    } else {
      guardarLocalStorage(people);
    }
    if (alanUser && alanUser.id) {
      localStorage.setItem(ALAN_LOCAL_OWNER, alanUser.id);
    }
  };

  const cloudSave = alanSaveCloud;
  const cloudLoad = alanLoadCloud;
  const originalActivate = alanActivate;

  async function flushPending() {
    if (flushing || !navigator.onLine || !alanUser) return false;
    const pending = readPending();
    if (!pending) return true;
    flushing = true;
    try {
      restoreBaseline(pending.baseline);
      people = clone(pending.snapshot).map(normalizarPersona);
      render();
      const ok = await cloudSave();
      if (!ok) throw new Error("El servidor no confirmó la sincronización.");
      localStorage.removeItem(PENDING_KEY);
      writeBaseline();
      showState("✓ Cambios guardados en este dispositivo y sincronizados con Supabase.", "#16743c");
      return true;
    } catch (error) {
      console.warn("ALAN: sincronización pendiente", error);
      showState("⚠ Tus cambios están guardados en este dispositivo. Se sincronizarán cuando la conexión con Supabase esté disponible.", "#9a5b00");
      return false;
    } finally {
      flushing = false;
    }
  }

  guardarDatos = async function guardarDatosOfflineFirst() {
    try {
      await saveLocal();
      let pending = readPending();
      if (!pending) {
        let baseline = null;
        try { baseline = JSON.parse(localStorage.getItem(BASELINE_KEY) || "null"); } catch (_) {}
        pending = {
          version: 1,
          createdAt: new Date().toISOString(),
          baseline: baseline || {
            people: [...(alanKnownPeople || [])],
            payments: [...(alanKnownPayments || [])]
          }
        };
      }
      pending.snapshot = clone(people);
      pending.updatedAt = new Date().toISOString();
      localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
      showState("✓ Guardado en este dispositivo · pendiente de sincronización.", "#9a5b00");
      if (navigator.onLine && alanUser) await flushPending();
      return true;
    } catch (error) {
      console.error("ALAN: error guardando localmente", error);
      showState("⚠ No se pudo confirmar el guardado local. No cierres esta página y descarga una copia de seguridad.", "#a00000");
      return false;
    }
  };

  alanLoadCloud = async function alanLoadCloudWithOfflineQueue() {
    if (readPending()) {
      const pending = readPending();
      people = clone(pending.snapshot || []).map(normalizarPersona);
      restoreBaseline(pending.baseline);
      render();
      if (!navigator.onLine) {
        showState("⚠ Modo sin conexión · cambios guardados en este dispositivo y pendientes de sincronización.", "#9a5b00");
        return;
      }
      const synced = await flushPending();
      if (!synced) return;
    }
    await cloudLoad();
    writeBaseline();
  };

  alanActivate = async function activateWithOfflineSupport(session) {
    if (!session || !session.user) return;
    alanUser = session.user;
    const pending = readPending();
    const owner = localStorage.getItem(ALAN_LOCAL_OWNER);
    if (!navigator.onLine) {
      if (owner && owner !== alanUser.id) {
        alanShowLogin();
        alanMsg("Este dispositivo contiene datos de otra cuenta. Conéctate a internet para verificar tu cuenta.", "error");
        return;
      }
      if (!people.length && !pending) {
        alanShowLogin();
        alanMsg("Todavía no hay datos guardados en este dispositivo. Conéctate a internet una vez para cargar tu cuenta.", "error");
        return;
      }
      if (pending) {
        people = clone(pending.snapshot || []).map(normalizarPersona);
        restoreBaseline(pending.baseline);
      }
      alanShowApp();
      render();
      showState("⚠ Modo sin conexión · puedes consultar y registrar cambios. Se guardarán aquí y se enviarán al recuperar internet.", "#9a5b00");
      return;
    }
    if (pending) {
      people = clone(pending.snapshot || []).map(normalizarPersona);
      restoreBaseline(pending.baseline);
      const synced = await flushPending();
      if (!synced) {
        alanShowApp();
        render();
        return;
      }
    }
    await originalActivate(session);
  };

  window.addEventListener("online", () => {
    if (alanUser) flushPending();
  });
  window.addEventListener("offline", () => {
    showState("⚠ Sin conexión · ALAN sigue disponible con los datos guardados en este dispositivo.", "#9a5b00");
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && navigator.onLine && alanUser) flushPending();
  });

  // Los registros que se cargan desde la nube se convierten en la referencia
  // contra la que se calculan altas, cambios y eliminaciones pendientes.
  if (navigator.onLine) {
    const originalLoad = alanLoadCloud;
    alanLoadCloud = async function() {
      await originalLoad();
      if (!readPending()) writeBaseline();
    };
  }

  // Estado inicial visible, incluso antes del primer intento de sincronización.
  if (!navigator.onLine) {
    showState("⚠ Sin conexión · ALAN usará los datos guardados en este dispositivo.", "#9a5b00");
  } else if (readPending()) {
    showState("⏳ Hay cambios locales esperando sincronización con Supabase.", "#9a5b00");
  }
  window.ALANOffline = { flushPending, hasPending: () => !!readPending() };
})();
