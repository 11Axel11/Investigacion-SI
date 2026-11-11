// DEFECTO CONTROLADO para la demostración del ítem 3.6. No contiene ningún valor secreto: solo un nombre de
// variable que la regla `observatorio-secreto-en-variable-publica` de Semgrep debe bloquear. Se revierte en el
// commit siguiente. NO FUSIONAR este PR.
export const demoPublica = process.env.NEXT_PUBLIC_DEMO_TOKEN;
