# Sonos Custom Player

## Installazione

1. Copia l'intera cartella `custom_components/sonos_custom_player` nella cartella `custom_components` della tua installazione Home Assistant.

2. Copia il file `frontend/dist/sonos-custom-player-card.js` nella cartella `www` della tua installazione Home Assistant.

3. Aggiungi la seguente riga al tuo `configuration.yaml`:
   sonos_custom_player:

4. Aggiungi la risorsa Lovelace. In Lovelace, vai su Configurazione -> Risorse e aggiungi:  "/local/sonos-custom-player-card.js?vxxx" dove xxx è un progressivo

6. Riavvia Home Assistant.

## Utilizzo

Nella tua configurazione Lovelace, puoi ora utilizzare la card così:

type: 'custom:sonos-custom-player-card'
entity: input_text.active_player

Nota:
Per funzionare bisogna aver creato e gestito entity: input_text.active_player