// The bookmark that saves an event ("Guardar", like Instagram's), on every card and in the event's
// detail, and the number of saved events on the way to Guardados (the bar at the bottom, the toolbar's tab).
// Saved ids live in this browser (lib/saved.ts). The same event's bookmarks all change together.

import type { DanceEvent } from "../types";
import { escapeHtml } from "../lib/dom";
import { ICONS } from "../lib/icons";
import { isSaved, toggleSaved } from "../lib/saved";

function buttonInner(saved: boolean, labeled: boolean): string {
  const icon = saved ? ICONS.bookmarkFilled : ICONS.bookmark;
  return labeled ? `${icon}<span>${saved ? "Guardado" : "Guardar"}</span>` : icon;
}

/**
 * The bookmark for `event`. At build time (the event page) nothing is saved yet: syncSaveButtons fixes it.
 * `labeled`: a button with its word under the icon ("Guardar" / "Guardado"), for the details' quick actions.
 */
export function saveButtonHtml(event: DanceEvent, { labeled = false, className = "save-button" } = {}): string {
  const saved = isSaved(event.id);
  return `
    <button class="${className}" type="button" data-save="${escapeHtml(event.id)}" aria-pressed="${saved}"
      aria-label="Guardar: ${escapeHtml(event.title)}" data-track="guardar"${labeled ? " data-save-labeled" : ""}>${buttonInner(saved, labeled)}</button>`;
}

/** Every bookmark of the event `id` (or of every event) shows whether it's saved. */
function syncSaveButtons(id?: string) {
  const selector = id ? `[data-save="${CSS.escape(id)}"]` : "[data-save]";
  document.querySelectorAll<HTMLElement>(selector).forEach((button) => {
    const saved = isSaved(button.dataset.save ?? "");
    button.setAttribute("aria-pressed", String(saved));
    button.innerHTML = buttonInner(saved, button.dataset.saveLabeled !== undefined);
  });
}

/** "Guardados 3": how many upcoming events are saved, on each way to Guardados (its badge, and its name). */
export function renderSavedCount(count: number) {
  document.querySelectorAll<HTMLElement>("[data-saved-count]").forEach((badge) => {
    badge.closest("[data-view]")?.setAttribute("aria-label", count ? `Guardados, ${count}` : "Guardados");
    badge.textContent = count ? String(count) : "";
    badge.hidden = !count;
  });
}

/** Bookmark clicks anywhere on the page; `onChange` runs after an event is saved or unsaved. */
export function initSaveButtons(onChange: () => void = () => {}) {
  document.addEventListener("click", (domEvent) => {
    const id = (domEvent.target as HTMLElement).closest<HTMLElement>("[data-save]")?.dataset.save;
    if (id === undefined) return;
    domEvent.preventDefault();
    toggleSaved(id);
    syncSaveButtons(id);
    onChange();
  });
  syncSaveButtons();
}
