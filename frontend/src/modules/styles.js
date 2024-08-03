export const styles = `
/* Generale */
.error {
    color: red;
    padding: 10px;
    margin-bottom: 10px;
    background-color: #ffeeee;
    border-radius: 4px;
}
.error.hidden { display: none; }

/* Media Info */
.media-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
}

.album-art {
    width: 120px;
    height: 120px;
    object-fit: cover;
    margin-right: 15px;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.track-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex-grow: 1;
}

.media-title {
    font-size: 1.3em;
    font-weight: bold;
    margin-bottom: 5px;
}

.media-artist {
    font-size: 1.1em;
    margin-bottom: 3px;
    color: #666;
}

.media-album {
    font-size: 0.9em;
    color: #888;
}

.media-source-icon {
    width: 24px;
    height: 24px;
    align-self: flex-start;
}

.progress-control {
    display: flex;
    align-items: center;
    margin: 20px 20px 5px 20px;
}

.progress-bar-container {
    flex-grow: 1;
    margin: 0 10px;
    position: relative;
}

.progress-bar {
    width: 100%;
    height: 4px;
    background: var(--secondary-background-color, #d3d3d3);
    border-radius: 2px;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    background-color: var(--primary-color, #4CAF50);
    width: 0%;
    transition: width 0.1s linear;
}

.progress-control input[type="range"] {
    -webkit-appearance: none;    
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    background: transparent;
    margin: 0;
    padding: 0;
    height: 4px;
    cursor: pointer;
    opacity: 0;
    z-index: 2;
}

#progress.seeking {
    opacity: 0.7;
}


.time-display {
    font-size: 0.8em;
    color: var(--secondary-text-color);
    min-width: 40px; /* Assicura che ci sia spazio sufficiente per il testo */
}

.time-display:first-child {
    text-align: right;
}

.time-display:last-child {
    text-align: left;
}

.volume-control {
    display: flex;
    align-items: center;
    height: 36px; /* Altezza fissa per il contenitore */
}

.volume-icon {
    cursor: pointer;
    margin-right: 10px;
    color: var(--secondary-text-color);
}

.volume-control input[type="range"] {
    -webkit-appearance: none;
    width: calc(100% - 34px); /* Sottrai la larghezza dell'icona più il margine */
    height: 4px;
    background: #ddd;
    outline: none;
    opacity: 0.7;
    transition: opacity .2s, background .2s;
    border-radius: 2px;
    margin: 0;
}

.volume-control input[type="range"]:hover {
    opacity: 1;
}

.volume-control input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: var(--primary-color);
    cursor: pointer;
    border-radius: 50%;
}

.volume-control input[type="range"]::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: var(--primary-color);
    cursor: pointer;
    border-radius: 50%;
}

/* Media Controls */
.media-controls {
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.media-controls ha-icon {
    cursor: pointer;
    font-size: 28px;
    color: #333;
}

.media-controls .playback-controls {
    display: flex;
    justify-content: center;
    flex-grow: 1;
    gap: 20px;
}

.media-controls .extra-controls {
    display: flex;
    gap: 15px;
}

.media-controls .extra-controls ha-icon {
    font-size: 22px;
    color: #666;
}

/* Loading State */
.card-content.loading {
    opacity: 0.5;
    pointer-events: none;
}


/* Queue Popup */
.queue-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 999;
}

.queue-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: var(--card-background-color, white);
    padding: 20px;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 80%;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.queue-content {
    display: flex;
    flex-direction: column;
}

.queue-content h3 {
    margin-top: 0;
    margin-bottom: 15px;
}

#queue-list {
    list-style-type: none;
    padding: 0;
    margin: 0;
}

#queue-list li {
    display: flex;
    align-items: center;
    padding: 10px 5px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    cursor: pointer;
    transition: background-color 0.3s;
}

#queue-list li:hover {
    background-color: var(--secondary-background-color, #f0f0f0);
}

#queue-list li.current-track {
    background-color: var(--primary-color-light, #e0e0e0);
    font-weight: bold;
}

.track-number {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: var(--primary-color);
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    margin-right: 15px;
    flex-shrink: 0;
}

.current-track .track-number {
    background-color: var(--accent-color, #f0f0f0);
}

.track-info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
}

.track-info strong {
    font-size: 1.1em;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.track-info span {
    font-size: 0.9em;
    color: var(--secondary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.playing-icon {
    margin-left: auto;
    --mdc-icon-size: 24px;
    color: var(--primary-color);
}

.queue-overlay.hidden,
.queue-popup.hidden {
    display: none;
}

.queue-content h3 {
    margin-top: 0;
    margin-bottom: 15px;
    font-size: 1.2em;
    color: var(--primary-text-color);
}

/* Responsive Design */
@media (max-width: 600px) {
    .queue-popup {
        width: 80%;
        height: 100%;
        max-height: none;
        top: 0;
        left: 0;
        transform: none;
        border-radius: 0;
    }

    .queue-content {
        height: 100%;
    }

    #queue-list {
        flex-grow: 1;
        overflow-y: auto;
    }
}
`;