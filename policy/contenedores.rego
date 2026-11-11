# Políticas de contenedores del Observatorio (ítem 3.4). Conftest + OPA/Rego.
#
#   P-01  Ningún contenedor privilegiado       (compose: `privileged: true`; Dockerfile: no aplica)
#   P-02  Usuario no root explícito            (compose: cada servicio declara `user` distinto de root/0;
#                                               Dockerfile: la etapa final declara `USER` distinto de root/0)
#
# Se aplican a `docker-compose.yml` y a los Dockerfile. Cada regla devuelve un mensaje que dice qué
# archivo/servicio incumple y cómo corregirlo. Las pruebas están en `contenedores_test.rego`
# (`conftest verify`) y los ejemplos permitido/rechazado en `policy/ejemplos/`.
# Amenaza que mitiga: T-12 (cadena de suministro) y el endurecimiento del contenedor (T-09).
package main

import rego.v1

root_users := {"root", "0", "0:0", "root:root", "0:root", "root:0"}

# --- Utilidades ---------------------------------------------------------------------------------

# Un usuario es root si es el nombre `root`, el uid 0 (con o sin grupo) o está vacío.
is_root(user) if {
	lower(trim_space(sprintf("%v", [user]))) in root_users
}

is_root(user) if trim_space(sprintf("%v", [user])) == ""

# --- Compose ------------------------------------------------------------------------------------

# P-01: contenedor privilegiado.
deny contains msg if {
	some name, service in input.services
	service.privileged == true
	msg := sprintf("P-01: el servicio '%s' usa 'privileged: true'. Quita la opción o concede solo la capacidad que necesita con cap_add.", [name])
}

# P-02: servicio sin usuario explícito.
deny contains msg if {
	some name, service in input.services
	not "user" in object.keys(service)
	msg := sprintf("P-02: el servicio '%s' no declara 'user'. Indica un usuario no root (por ejemplo 'user: node').", [name])
}

# P-02: servicio con usuario root.
deny contains msg if {
	some name, service in input.services
	"user" in object.keys(service)
	is_root(service.user)
	msg := sprintf("P-02: el servicio '%s' corre como root (user: %v). Usa un usuario no root.", [name, service.user])
}

# --- Dockerfile ---------------------------------------------------------------------------------

# Instrucciones del Dockerfile (Conftest las entrega como un arreglo plano de instrucciones; cada una
# lleva `Cmd`, `Value` y `Stage`). Con un compose, `input` es un objeto y esta lista queda vacía.
instructions := [i | is_array(input); some i in input; i.Cmd != "comment"]

stage_count := count([1 | some i in instructions; i.Cmd == "from"])

final_stage := max([i.Stage | some i in instructions; i.Cmd == "from"])

final_users := [i | some i in instructions; i.Cmd == "user"; i.Stage == final_stage]

# P-02: la etapa final no declara USER.
deny contains msg if {
	is_array(input)
	stage_count > 0
	count(final_users) == 0
	msg := "P-02: el Dockerfile no declara 'USER' en la etapa final: la imagen correría como root. Agrega 'USER node' (o un uid distinto de 0)."
}

# P-02: el último USER de la etapa final es root.
deny contains msg if {
	is_array(input)
	count(final_users) > 0
	last := final_users[count(final_users) - 1]
	is_root(last.Value[0])
	msg := sprintf("P-02: el último 'USER' del Dockerfile es '%s' (root). Usa un usuario no root.", [last.Value[0]])
}
