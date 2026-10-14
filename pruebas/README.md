# Pruebas automáticas

Corren sin navegador y sin dependencias (solo Node 18 o superior). Cargan el `<script>` del visor en un `vm` con un DOM falso y usan el SheetJS de `vendor/`. Solo usan datos sintéticos de `ejemplo/`.

```
node pruebas/correr.js        # cifras del ejemplo contra pruebas/esperado.json
node pruebas/unidad.js        # funciones puras: fechas, coordenadas, horas, catClave
```

Contra otro archivo del visor (por ejemplo un borrador del taller):

```
node pruebas/correr.js ../../versiones/visioncore/visioncore_vNN_borrador.html
node pruebas/unidad.js ../../versiones/visioncore/visioncore_vNN_borrador.html
```

Los dos terminan con código 1 si algo cambia, y dicen qué cifra o caso cambió.

## Regla

Si una cifra cambia, se explica en `CHANGELOG.md` o en la nota de la versión **antes** de actualizar `esperado.json` (`node pruebas/correr.js --actualizar`). Una cifra que se mueve sin explicación es un posible error.

En `unidad.js`, un caso con `pendiente` es un fallo conocido: se informa, pero no hace fallar la corrida. Cuando se arregla, se quita la marca.

Un caso con `si:'expresión'` solo corre si esa expresión da verdadero en el visor cargado (por ejemplo, `typeof avisoMunicipio==="function"`): así los casos de una función nueva se omiten, y se cuentan aparte, contra versiones que aún no la tienen.
