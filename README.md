# RutaSur

Primera version local de una landing page ficticia para RutaSur, agencia de turismo aventura ubicada en Pucon.

## Contenido

- `index.html`: estructura de la pagina.
- `styles.css`: estilos responsive con variables CSS.
- `script.js`: interacciones del menu, formulario visual y chat simulado.
- `README.md`: descripcion y guia de uso.

## Como abrirlo localmente

Abre `index.html` directamente en tu navegador. No requiere servidor local, dependencias, build ni instalacion.

## Partes simuladas

- El formulario "¿Que tour es para mi?" solo muestra un mensaje visual.
- El chat flotante no se conecta a ningun backend.
- Los enlaces de anexos son placeholders para documentos futuros.
- Los datos de contacto son ficticios.

## Preparado para n8n

El chat esta separado en `script.js`. La respuesta simulada esta concentrada en el `setTimeout` del envio del formulario, por lo que luego puede reemplazarse por una llamada `fetch` a un webhook de n8n sin cambiar la estructura visual.

## Restricciones actuales

- No usa frameworks.
- No usa APIs externas.
- No usa base de datos.
- No agrega dependencias.
