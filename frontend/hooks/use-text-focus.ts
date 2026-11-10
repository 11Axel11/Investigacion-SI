"use client";

import { useEffect, useState } from "react";

const NON_TEXT_INPUTS = new Set([
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "file",
  "range",
  "color",
  "image",
]);

function isTextField(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) return !el.readOnly && !NON_TEXT_INPUTS.has(el.type);
  return el.isContentEditable;
}

/** `true` mientras el foco está en un campo de texto. */
export function useTextFocus(): boolean {
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const sync = () => setTyping(isTextField(document.activeElement));
    const onOut = () => requestAnimationFrame(sync);
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", onOut);
    sync();
    return () => {
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", onOut);
    };
  }, []);

  return typing;
}
