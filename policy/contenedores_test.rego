# Pruebas de las políticas de contenedores (`conftest verify --policy policy`). Ítem 3.4.
package main

import rego.v1

dockerfile_ok := [
	{"Cmd": "from", "Stage": 0, "Value": ["node:22-alpine"]},
	{"Cmd": "run", "Stage": 0, "Value": ["npm ci"]},
	{"Cmd": "from", "Stage": 1, "Value": ["node:22-alpine"]},
	{"Cmd": "user", "Stage": 1, "Value": ["node"]},
]

# --- Compose ---------------------------------------------------------------------------------

test_compose_permitido if {
	count(deny) == 0 with input as {"services": {"api": {"user": "node"}, "db": {"user": "postgres", "privileged": false}}}
}

test_compose_privilegiado_rechazado if {
	msgs := deny with input as {"services": {"api": {"user": "node", "privileged": true}}}
	count(msgs) == 1
	some m in msgs
	startswith(m, "P-01")
}

test_compose_sin_user_rechazado if {
	msgs := deny with input as {"services": {"api": {"image": "x"}}}
	some m in msgs
	startswith(m, "P-02")
}

test_compose_user_root_en_todas_sus_formas if {
	every u in ["root", "ROOT", "0", "0:0", "root:root", " root ", 0, ""] {
		count(deny) == 1 with input as {"services": {"api": {"user": u}}}
	}
}

test_compose_uid_no_root_permitido if {
	count(deny) == 0 with input as {"services": {"api": {"user": "1000:1000"}}}
}

test_compose_uid_que_empieza_con_cero_no_es_root if {
	# "01" y "10" no son el uid 0 literal; solo "0" y "0:0" lo son.
	count(deny) == 0 with input as {"services": {"api": {"user": "10"}}}
}

# --- Dockerfile ------------------------------------------------------------------------------

test_dockerfile_permitido if {
	count(deny) == 0 with input as dockerfile_ok
}

test_dockerfile_sin_user_rechazado if {
	msgs := deny with input as [{"Cmd": "from", "Stage": 0, "Value": ["node:22-alpine"]}]
	count(msgs) == 1
	some m in msgs
	contains(m, "no declara 'USER'")
}

test_dockerfile_user_root_rechazado if {
	msgs := deny with input as [
		{"Cmd": "from", "Stage": 0, "Value": ["node:22-alpine"]},
		{"Cmd": "user", "Stage": 0, "Value": ["node"]},
		{"Cmd": "user", "Stage": 0, "Value": ["root"]},
	]
	count(msgs) == 1
}

test_dockerfile_user_en_etapa_intermedia_no_basta if {
	# El USER de una etapa de compilación no protege la imagen final.
	msgs := deny with input as [
		{"Cmd": "from", "Stage": 0, "Value": ["node:22-alpine"]},
		{"Cmd": "user", "Stage": 0, "Value": ["node"]},
		{"Cmd": "from", "Stage": 1, "Value": ["node:22-alpine"]},
	]
	count(msgs) == 1
}

test_dockerfile_root_en_etapa_intermedia_no_importa if {
	count(deny) == 0 with input as [
		{"Cmd": "from", "Stage": 0, "Value": ["node:22-alpine"]},
		{"Cmd": "user", "Stage": 0, "Value": ["root"]},
		{"Cmd": "from", "Stage": 1, "Value": ["node:22-alpine"]},
		{"Cmd": "user", "Stage": 1, "Value": ["1000"]},
	]
}

test_dockerfile_los_comentarios_no_cuentan if {
	count(deny) == 0 with input as array.concat([{"Cmd": "comment", "Stage": 0, "Value": ["USER root"]}], dockerfile_ok)
}
