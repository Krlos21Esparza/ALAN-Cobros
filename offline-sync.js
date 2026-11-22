/* ALAN Cobros: persistencia local y sincronización diferida.
   No sustituye la autenticación: se necesita haber iniciado sesión antes
   y disponer de una sesión local válida para acceder a datos privados sin red. */
(() => {
  "use strict";
  const LEGACY_PENDING_KEY = "alan_offline_pending_v1";
  const pendingKey = userId => "alan_offline_pending_v2:" + String(userId || "");
  const baselineKey = userId => "alan_cloud_baseline_v2:" + String(userId || "");
  let flushing = false;
  let cloudLoaded = false;

  const clone = value => JSON.parse(JSON.stringify(value ?? []));
  const readPending = (userId = alanUser && alanUser.id) => {
    if (!userId) return null;
    try {
      const current = JSON.parse(localStorage.getItem(pendingKey(userId)) || "null");
      if (current && current.userId === userId) return current;
      const legacy = JSON.parse(localStorage.getItem(LEGACY_PENDING_KEY) || "null");
      if (legacy && localStorage.getItem(ALAN_LOCAL_OWNER) === userId && (!legacy.userId || legacy.userId === userId)) {
        legacy.userId = userId;
        localStorage.setItem(pendingKey(userId), JSON.stringify(legacy));
        localStorage.removeItem(LEGACY_PENDING_KEY);
        return legacy;
      }
    } catch (_) {}
    return null;
  };
  const writeBaseline = (userId = alanUser && alanUser.id) => {
    if (!userId) return;
    try {
      localStorage.setItem(baselineKey(userId), JSON.stringify({userId, people:[...(alanKnownPeople || [])], payments:[...(alanKnownPayments || [])]}));
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
      localStorage.removeItem(pendingKey(alanUser.id));
      writeBaseline(alanUser.id);
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
      if (!alanUser || !alanUser.id) throw new Error("No hay una cuenta autenticada para asociar los cambios.");
      let pending = readPending(alanUser.id);
      if (!pending) {
        let baseline = null;
        try { baseline = JSON.parse(localStorage.getItem(baselineKey(alanUser.id)) || "null"); } catch (_) {}
        pending = {
          version: 2,
          userId: alanUser.id,
          createdAt: new Date().toISOString(),
          baseline: baseline || {
            people: [...(alanKnownPeople || [])],
            payments: [...(alanKnownPayments || [])]
          }
        };
      }
      pending.snapshot = clone(people);
      pending.updatedAt = new Date().toISOString();
      localStorage.setItem(pendingKey(alanUser.id), JSON.stringify(pending));
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
    if (readPending(alanUser && alanUser.id)) {
      const pending = readPending(alanUser && alanUser.id);
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
    cloudLoaded = true;
    writeBaseline();
  };

  alanActivate = async function activateWithOfflineSupport(session) {
    if (!session || !session.user) return;
    alanUser = session.user;
    const pending = readPending(session.user.id);
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
        if (pending.userId !== alanUser.id) throw new Error("La cola local no coincide con la cuenta iniciada.");
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
    cloudLoaded = false;
    await originalActivate(session);
    if (!cloudLoaded && people.length) {
      showState("⚠ No se pudo contactar con Supabase. ALAN conserva los datos locales y guardará aquí los cambios hasta recuperar la conexión.", "#9a5b00");
      render();
    }
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
      if (!readPending(alanUser && alanUser.id)) writeBaseline(alanUser && alanUser.id);
    };
  }


  function mountNotificationControls() {
    const app = document.querySelector(".app");
    const notice = document.getElementById("storageNotice");
    if (!app || !notice || document.getElementById("alanNotificationPanel")) return;
    const panel = document.createElement("section");
    panel.id = "alanNotificationPanel";
    panel.className = "panel";
    panel.innerHTML = '<h2>🔔 Notificaciones</h2><p style="font-size:12px;color:#666;line-height:1.5;margin-bottom:12px">Permite avisos de ALAN en este dispositivo. Los avisos push remotos también requieren conectar el servicio de envío seguro.</p><button type="button" class="btn-red" id="alanEnableNotifications">ACTIVAR AVISOS</button><p id="alanNotificationStatus" style="font-size:12px;color:#666;line-height:1.5;margin-top:10px" role="status"></p>';
    notice.insertAdjacentElement("afterend", panel);
    const button = document.getElementById("alanEnableNotifications");
    const status = document.getElementById("alanNotificationStatus");
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      button.disabled = true;
      status.textContent = "Este navegador no admite notificaciones web.";
      return;
    }
    if (Notification.permission === "granted") {
      button.textContent = "PERMISO ACTIVADO";
      status.textContent = "Permiso concedido en este dispositivo. Falta conectar las claves VAPID y el servicio de envío para recibir push cuando ALAN esté cerrada.";
    } else if (Notification.permission === "denied") {
      status.textContent = "Las notificaciones están bloqueadas por el navegador. Actívalas desde los ajustes del sitio.";
    }
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          await navigator.serviceWorker.ready;
          button.textContent = "PERMISO ACTIVADO";
          status.textContent = "Permiso concedido. Para enviar notificaciones push reales desde Supabase aún falta configurar VAPID y el servicio de envío.";
        } else {
          status.textContent = permission === "denied" ? "Permiso denegado. Cámbialo desde los ajustes del navegador." : "No se concedió el permiso.";
        }
      } catch (error) {
        status.textContent = "No se pudo activar el permiso: " + (error.message || "error");
      } finally {
        button.disabled = Notification.permission === "granted";
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountNotificationControls, { once: true });
  } else {
    mountNotificationControls();
  }

  // Estado inicial visible, incluso antes del primer intento de sincronización.
  if (!navigator.onLine) {
    showState("⚠ Sin conexión · ALAN usará los datos guardados en este dispositivo.", "#9a5b00");
  } else if (readPending(alanUser && alanUser.id)) {
    showState("⏳ Hay cambios locales esperando sincronización con Supabase.", "#9a5b00");
  }
  window.ALANOffline = { flushPending, hasPending: () => !!readPending(alanUser && alanUser.id) };
})();
