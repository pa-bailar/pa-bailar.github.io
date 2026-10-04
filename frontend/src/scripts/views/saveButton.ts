// The bookmark that saves an event ("Guardar", like Instagram's), on every card and in the event's
// detail, and the "Guardados" toggles that show only saved events (the phone bar and the toolbar).
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
 * `labeled`: a button with its word under the icon ("Guardar" / "Guardado"), for the viewer's quick actions.
 */
export function saveButtonHtml(event: DanceEvent, { labeled = false, className = "save-button" } = {}): string {
  const saved = isSaved(event.id);
  return `
    <button class="${className}" type="button" data-save="${escapeHtml(event.id)}" aria-pressed="${saved}"
      aria-label="Guardar: ${escapeHtml(event.title)}" data-track="guardar"${labeled ? " data-save-labeled" : ""}>${buttonInner(saved, labeled)}</button>`;
}

/** Every bookmark of the event `id` (or of every event) shows whether it's saved. */
export function syncSaveButtons(id?: string) {
  const selector = id ? `[data-save="${CSS.escape(id)}"]` : "[data-save]";
  document.querySelectorAll<HTMLElement>(selector).forEach((button) => {
    const saved = isSaved(button.dataset.save!);
    button.setAttribute("aria-pressed", String(saved));
    button.innerHTML = buttonInner(saved, button.dataset.saveLabeled !== undefined);
  });
}

/** "Guardados 3": the toggles that show only saved events, with how many upcoming ones there are. */
export function renderSavedToggles(count: number, active: boolean) {
  document.querySelectorAll<HTMLElement>("[data-saved-only]").forEach((toggle) => {
    toggle.setAttribute("aria-pressed", String(active));
    toggle.setAttribute("aria-label", count ? `Guardados, ${count}` : "Guardados");
    const badge = toggle.querySelector<HTMLElement>("[data-saved-count]");
    if (badge) {
      badge.textContent = count ? String(count) : "";
      badge.hidden = !count;
    }
  });
}

/** Bookmark clicks anywhere on the page; `onChange` runs after an event is saved or unsaved. */
export function initSaveButtons(onChange: () => void = () => {}) {
  document.addEventListener("click", (domEvent) => {
    const button = (domEvent.target as HTMLElement).closest<HTMLElement>("[data-save]");
    if (!button) return;
    domEvent.preventDefault();
    toggleSaved(button.dataset.save!);
    syncSaveButtons(button.dataset.save);
    onChange();
  });
  syncSaveButtons();
}
