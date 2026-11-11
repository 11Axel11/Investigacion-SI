"use client";

import { KeyRound, LogOut } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearAdminKey, setAdminKey, useOperatorMode } from "@/lib/operator";

/**
 * Control del modo operador (Q-02). Pide la clave de administración y la guarda solo en la
 * memoria de la pestaña. No es una protección: el backend valida la clave en cada escritura.
 */
export function OperatorMode() {
  const active = useOperatorMode();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim() === "") return;
    setAdminKey(value);
    setValue("");
    setEditing(false);
  };

  if (active) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="hidden sm:inline">Modo operador activo</span>
        <Button type="button" variant="outline" size="sm" onClick={clearAdminKey} aria-label="Salir del modo operador">
          <LogOut />
          Salir
        </Button>
      </div>
    );
  }

  if (!editing) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
        <KeyRound />
        <span className="max-sm:sr-only">Modo operador</span>
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input
        type="password"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Clave de administración"
        aria-label="Clave de administración"
        className="h-8 w-40 sm:w-56"
      />
      <Button type="submit" size="sm" disabled={value.trim() === ""}>
        Activar
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setValue("");
          setEditing(false);
        }}
      >
        Cancelar
      </Button>
    </form>
  );
}
