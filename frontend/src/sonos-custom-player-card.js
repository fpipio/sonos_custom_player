import { styles } from './modules/styles.js';

class SonosCustomPlayerCard extends HTMLElement {
    _config;
    _hass;
    _elements = {};
    progressInterval = null;
    _previousVolume = null;

    constructor() {
        console.log("constructor()");
        super();
        this.doCard();
        this.doStyle();
        this.doAttach();
        this.doQueryElements();
        this.doListen();
    }

    setConfig(config) {
        console.log("setConfig(config)");
        this._config = config;
        this.doCheckConfig();
        this.doUpdateConfig();
    }

    set hass(hass) {
        console.log("hass(hass)");
        this._hass = hass;
        this.doUpdateHass();
    }

    getEntityID() {
        console.log("getEntityID()");
        const inputTextState = this._hass.states[this._config.entity];
        console.log("inputTextState", inputTextState);
        const entityID = inputTextState ? inputTextState.state : null;
        console.log("Resolved entityID:", entityID);
        return entityID;
    }

    getState() {
        console.log("getState()");
        const entityID = this.getEntityID();
        console.log("entityID", entityID);
        const state = entityID ? this._hass.states[entityID] : null;
        console.log("Full state object:", state);
        return state;
    }

    getAttributes() {
        console.log("getAttributes()");
        const state = this.getState();
        return state ? state.attributes : {};
    }

    getName() {
        console.log("getName()");
        const attributes = this.getAttributes();
        return attributes.friendly_name ? attributes.friendly_name : this.getEntityID();
    }

    onClicked() {
        this.doToggle();
    }

    onVolumeChanged(event) {
        const volume = event.target.value / 100;
        this._hass.callService("media_player", "volume_set", {
            entity_id: this.getEntityID(),
            volume_level: volume
        });
        this._previousVolume = volume;
    }

    syncPositionWithServer() {
        this._hass.callService("media_player", "media_seek", {
            entity_id: this.getEntityID(),
            seek_position: this.lastKnownPosition
        }).then(() => {
            console.log("Position synced with server:", this.lastKnownPosition);
            this._hass.callService("homeassistant", "update_entity", {
                entity_id: this.getEntityID()
            }).then(() => {
                const state = this.getState();
                if (state && state.attributes.media_position !== undefined) {
                    this.lastKnownPosition = state.attributes.media_position;
                    this.updateProgress();
                }
            });
        }).catch(error => {
            console.error("Failed to sync position with server:", error);
        });
    }

    onPlayPause() {
        const state = this.getState();
        const isPlaying = state.state === "playing";
        const service = isPlaying ? "media_pause" : "media_play";
        
        if (isPlaying) {
            this.stopProgressUpdate();
            this.updateProgress();
        }
        
        this._hass.callService("media_player", service, {
            entity_id: this.getEntityID()
        }).then(() => {
            if (isPlaying) {
                this.syncPositionWithServer();
            }
            setTimeout(() => {
                this._hass.callService("homeassistant", "update_entity", {
                    entity_id: this.getEntityID()
                }).then(() => {
                    const newState = this.getState();
                    if (newState && newState.state === "playing") {
                        this.lastKnownPosition = newState.attributes.media_position || this.lastKnownPosition;
                        this.playbackStartTime = performance.now();
                        this.startProgressUpdate();
                    }
                    this.doUpdateHass();
                });
            }, 500);
        });
    }

    onProgressChanged(event) {
        const progress = parseFloat(event.target.value) / 100;
        console.log("Raw progress:", progress);
    
        this.updateSeekBarProgress(progress);
    
        const state = this.getState();
        console.log("Current state:", state);
    
        if (state && state.attributes.media_duration) {
            const mediaDuration = parseFloat(state.attributes.media_duration);
            console.log("Media duration:", mediaDuration);
    
            if (isNaN(mediaDuration) || !isFinite(mediaDuration)) {
                console.error("Invalid media duration");
                return;
            }
    
            const seekPosition = progress * mediaDuration;
            console.log("Calculated seek position:", seekPosition);
    
            const roundedSeekPosition = Math.round(seekPosition * 100) / 100;
            console.log("Rounded seek position:", roundedSeekPosition);
    
            clearTimeout(this.seekTimeout);
            this.seekTimeout = setTimeout(() => {
                this._elements.progressSlider.classList.add('seeking');
                this._elements.currentTime.textContent = this.formatTime(roundedSeekPosition);
    
                console.log("Calling media_seek with position:", roundedSeekPosition);
                this._hass.callService("media_player", "media_seek", {
                    entity_id: this.getEntityID(),
                    seek_position: roundedSeekPosition
                }).then(() => {
                    console.log("Seek successful");
                    this.lastKnownPosition = roundedSeekPosition;
                    this.playbackStartTime = performance.now();
                    this._elements.progressSlider.classList.remove('seeking');
                    this.updateProgress();
                }).catch((error) => {
                    console.error("Seek failed:", error);
                    this._elements.progressSlider.classList.remove('seeking');
                    this._elements.error.textContent = "Impossibile impostare la nuova posizione.";
                    this._elements.error.classList.remove("hidden");
                    setTimeout(() => {
                        this._elements.error.classList.add("hidden");
                    }, 3000);
                }).finally(() => {
                    this.updateStateAfterDelay();
                });
            }, 250);
        } else {
            console.error("State or media duration not available");
        }
    }

    updateStateAfterDelay(delay = 2000) {
        setTimeout(() => {
            this._hass.callService("homeassistant", "update_entity", {
                entity_id: this.getEntityID()
            }).then(() => {
                this.doUpdateHass();
            });
        }, delay);
    }

    onNextTrack() {
        this._hass.callService("media_player", "media_next_track", {
            entity_id: this.getEntityID()
        });
    }

    onPrevTrack() {
        this._hass.callService("media_player", "media_previous_track", {
            entity_id: this.getEntityID()
        });
    }

    onShuffleChanged() {
        const currentShuffle = this.getAttributes().shuffle;
        const newShuffle = !currentShuffle;
        this._hass.callService("media_player", "shuffle_set", {
            entity_id: this.getEntityID(),
            shuffle: newShuffle
        });
    }

    onRepeatChanged() {
        const currentRepeat = this.getAttributes().repeat;
        let newRepeat;
        if (currentRepeat === 'off') {
            newRepeat = 'all';
        } else if (currentRepeat === 'all') {
            newRepeat = 'one';
        } else {
            newRepeat = 'off';
        }
        this._hass.callService("media_player", "repeat_set", {
            entity_id: this.getEntityID(),
            repeat: newRepeat
        });
    }

    onVolumeIconClicked() {
        const state = this.getState();
        const isMuted = state.attributes.is_volume_muted;
        const currentVolume = state.attributes.volume_level;
    
        if (isMuted) {
            // Se è già in muto, ripristina il volume precedente
            const volumeToSet = this._previousVolume !== null ? this._previousVolume : 0.5; // Default a 0.5 se non c'è un volume precedente
            this._hass.callService("media_player", "volume_set", {
                entity_id: this.getEntityID(),
                volume_level: volumeToSet
            });
            this._hass.callService("media_player", "volume_mute", {
                entity_id: this.getEntityID(),
                is_volume_muted: false
            });
            this._previousVolume = null;
        } else {
            // Se non è in muto, memorizza il volume attuale e metti in muto
            this._previousVolume = currentVolume;
            this._hass.callService("media_player", "volume_mute", {
                entity_id: this.getEntityID(),
                is_volume_muted: true
            });
        }
    }

    onQueueClicked() {
        const entityId = this.getEntityID();
        this._hass.callService("sonos_helper", "get_queue", {
            entity_id: entityId
        }).then(() => {
            setTimeout(() => {
                this.updateQueuePopup();
                this.toggleQueuePopup(true);
            }, 500);
        }).catch(error => {
            console.error("Error fetching queue:", error);
            this._elements.error.textContent = "Impossibile recuperare la coda di riproduzione.";
            this._elements.error.classList.remove("hidden");
            setTimeout(() => {
                this._elements.error.classList.add("hidden");
            }, 3000);
        });
    }

    updateQueuePopup() {
        const entityId = this.getEntityID();
        const playerState = this.getState();
        const sensorName = `${entityId.split('.')[1]}_queue`;
        const queueState = this._hass.states[`sensor.${sensorName}`];
        const currentTrackNumber = playerState.attributes.queue_position;
        const friendlyName = this.getFriendlyName();

        if (queueState && queueState.attributes && queueState.attributes.items) {
            this._elements.queueList.innerHTML = '';
            
            const popupTitle = this._elements.queuePopup.querySelector('h3');
            if (popupTitle) {
                popupTitle.textContent = `Coda del player ${friendlyName}`;
            } else {
                const title = document.createElement('h3');
                title.textContent = `Coda del ${friendlyName}`;
                this._elements.queuePopup.insertBefore(title, this._elements.queueList);
            }

            queueState.attributes.items.forEach((item, index) => {
                const li = document.createElement('li');
                const isCurrentTrack = index === currentTrackNumber - 1;
                li.classList.toggle('current-track', isCurrentTrack);
                
                li.innerHTML = `
                    <div class="track-number">${index + 1}</div>
                    <div class="track-info">
                        <strong>${item.title}</strong>
                        <span>${item.artist} - ${item.album}</span>
                        <span>Durata: ${this.formatTime(item.duration)}</span>
                    </div>
                    ${isCurrentTrack ? '<ha-icon class="playing-icon" icon="mdi:play-circle-outline"></ha-icon>' : ''}
                `;
                li.addEventListener('click', () => this.playQueueItem(index));
                this._elements.queueList.appendChild(li);
            });
        } else {
            console.error("Queue information not available");
            this._elements.queueList.innerHTML = '<li>Informazioni sulla coda non disponibili</li>';
        }
    }

    onCloseQueue() {
        this._elements.queuePopup.classList.add("hidden");
    }
    
    getFriendlyName() {
        const state = this.getState();
        return state ? state.attributes.friendly_name || this.getEntityID() : 'Player';
    }

    async playQueueItem(index) {
        const entityId = this.getEntityID();
        try {
            // Otteniamo lo stato corrente del player
            const state = this.getState();
            const currentQueuePosition = state.attributes.queue_position || 0;
    
            // Calcoliamo la differenza tra la posizione attuale e quella desiderata
            const positionDifference = index + 1 - currentQueuePosition;
    
            // Decidiamo quale servizio chiamare in base alla differenza
            if (positionDifference > 0) {
                // Se la traccia desiderata è dopo quella corrente, usiamo next_track
                for (let i = 0; i < positionDifference; i++) {
                    await this._hass.callService("media_player", "media_next_track", {
                        entity_id: entityId
                    });
                }
            } else if (positionDifference < 0) {
                // Se la traccia desiderata è prima di quella corrente, usiamo previous_track
                for (let i = 0; i > positionDifference; i--) {
                    await this._hass.callService("media_player", "media_previous_track", {
                        entity_id: entityId
                    });
                }
            }
    
            // Assicuriamoci che la riproduzione inizi
            await this._hass.callService("media_player", "media_play", {
                entity_id: entityId
            });
    
            console.log(`Playing queue item at position ${index + 1}`);
            this.toggleQueuePopup(false);
    
            // Aggiorniamo lo stato dopo un breve ritardo
            setTimeout(() => {
                this._hass.callService("homeassistant", "update_entity", {
                    entity_id: entityId
                });
            }, 500);
    
        } catch (error) {
            console.error("Error playing queue item:", error);
            this._elements.error.textContent = "Impossibile riprodurre il brano selezionato.";
            this._elements.error.classList.remove("hidden");
            setTimeout(() => {
                this._elements.error.classList.add("hidden");
            }, 3000);
        }
    }



    forceUpdate() {
        this._hass.callService("homeassistant", "update_entity", {
            entity_id: this.getEntityID()
        }).then(() => {
            this.doUpdateHass();
        }).catch(error => {
            console.error("Error forcing update:", error);
        });
    }

    isOff() {
        const state = this.getState();
        return state ? state.state === "off" : true;
    }

    isOn() {
        const state = this.getState();
        return state ? state.state === "on" : false;
    }

    getHeader() {
        return this._config.header;
    }

    doCheckConfig() {
        console.log("doCheckConfig()");
        if (!this._config.entity) {
            throw new Error("Please define an entity!");
        }
    }

    doCard() {
        this._elements.card = document.createElement("ha-card");
        this._elements.card.innerHTML = `
            <div class="card-content">
                <p class="error error hidden"></p>
                <div class="media-info">
                    <img class="album-art" src="" alt="Album Art">
                    <div class="track-info">
                        <div class="media-title"></div>
                        <div class="media-artist"></div>
                        <div class="media-album"></div>                        
                    </div>
                    <ha-icon class="media-source-icon"></ha-icon>
                </div>
                <div class="volume-control">
                    <ha-icon id="volume-icon" class="volume-icon" icon="mdi:volume-high"></ha-icon>
                    <input type="range" id="volume" name="volume" min="0" max="100">
                </div>
                <div class="media-controls">
                    <div class="playback-controls">
                        <ha-icon id="prev-track" icon="mdi:skip-previous-outline"></ha-icon>
                        <ha-icon id="play-pause" icon="mdi:play-outline"></ha-icon>
                        <ha-icon id="next-track" icon="mdi:skip-next-outline"></ha-icon>
                    </div>
                    <div class="extra-controls">
                        <ha-icon id="repeat" icon="mdi:repeat-off"></ha-icon>
                        <ha-icon id="shuffle" icon="mdi:shuffle-disabled"></ha-icon>
                        <ha-icon id="queue" icon="mdi:playlist-music"></ha-icon>
                    </div>
                </div>
                <div class="progress-control">
                    <div class="time-display">
                        <span class="current-time">0:00</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-bar-fill"></div>
                        </div>
                        <input type="range" id="progress" name="progress" min="0" max="100" value="0">
                    </div>
                    <div class="time-display">
                        <span class="duration">0:00</span>
                    </div>
                </div>
            </div>
            <div id="queue-overlay" class="queue-overlay hidden"></div>
            <div id="queue-popup" class="queue-popup hidden">
                <div class="queue-content">
                    <h3></h3>
                    <ul id="queue-list"></ul>
                </div>            
            </div>           
        `;
    }

    doStyle() {
        this._elements.style = document.createElement("style");
        this._elements.style.textContent = styles;
    }

doAttach() {
        console.log("doAttach()");
        this.attachShadow({ mode: "open" });
        this.shadowRoot.append(this._elements.style, this._elements.card);
    }

    doQueryElements() {
        console.log("doQueryElements()");
        const card = this._elements.card;
        this._elements.error = card.querySelector(".error");
        this._elements.albumArt = card.querySelector(".album-art");
        this._elements.mediaTitle = card.querySelector(".media-title");
        this._elements.mediaArtist = card.querySelector(".media-artist");
        this._elements.mediaAlbum = card.querySelector(".media-album");
        this._elements.mediaSourceIcon = card.querySelector(".media-source-icon");
        this._elements.volumeIcon = card.querySelector("#volume-icon");
        this._elements.volumeSlider = card.querySelector("#volume");
        this._elements.playPause = card.querySelector("#play-pause");
        this._elements.nextTrack = card.querySelector("#next-track");
        this._elements.prevTrack = card.querySelector("#prev-track");
        this._elements.shuffle = card.querySelector("#shuffle");
        this._elements.repeat = card.querySelector("#repeat");
        this._elements.progressSlider = card.querySelector("#progress");
        this._elements.currentTime = card.querySelector(".current-time");
        this._elements.duration = card.querySelector(".duration");
        this._elements.progressBar = card.querySelector(".progress-bar-fill");
        this._elements.queueButton = card.querySelector("#queue");
        this._elements.queueOverlay = this.shadowRoot.querySelector("#queue-overlay");
        this._elements.queuePopup = this.shadowRoot.querySelector("#queue-popup");
        this._elements.queueList = this.shadowRoot.querySelector("#queue-list");
    }

    doListen() {
        console.log("doListen()");
        this._elements.volumeIcon.addEventListener("click", this.onVolumeIconClicked.bind(this));
        this._elements.volumeSlider.addEventListener("input", this.onVolumeChanged.bind(this));
        this._elements.playPause.addEventListener("click", this.onPlayPause.bind(this));
        this._elements.nextTrack.addEventListener("click", this.onNextTrack.bind(this));
        this._elements.prevTrack.addEventListener("click", this.onPrevTrack.bind(this));
        this._elements.shuffle.addEventListener("click", this.onShuffleChanged.bind(this));
        this._elements.repeat.addEventListener("click", this.onRepeatChanged.bind(this));
        this._elements.progressSlider.addEventListener("input", this.onProgressChanged.bind(this));
        this._elements.queueButton.addEventListener("click", this.onQueueClicked.bind(this));
        this._elements.queueOverlay.addEventListener('click', () => this.toggleQueuePopup(false));
    }

    toggleQueuePopup(show) {
        if (show) {
            this._elements.queueOverlay.classList.remove("hidden");
            this._elements.queuePopup.classList.remove("hidden");
            document.addEventListener('click', this.handleOutsideClick);
        } else {
            this._elements.queueOverlay.classList.add("hidden");
            this._elements.queuePopup.classList.add("hidden");
            document.removeEventListener('click', this.handleOutsideClick);
        }
    }

    handleOutsideClick = (event) => {
        if (!this._elements.queuePopup.contains(event.target) && !event.target.closest('#queue')) {
            this.toggleQueuePopup(false);
        }
    }

    doUpdateConfig() {
        console.log("doUpdateConfig()");
        if (this.getHeader()) {
            this._elements.card.setAttribute("header", this.getHeader());
        } else {
            this._elements.card.removeAttribute("header");
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    lastKnownPosition = 0;
    playbackStartTime = 0;
    isPlaying = false;

    startProgressUpdate() {
        this.stopProgressUpdate();
        this.playbackStartTime = performance.now();
        this.isPlaying = true;
        this.progressInterval = setInterval(() => {
            this.updateProgress();
        }, 100);
    }

    stopProgressUpdate() {
        this.isPlaying = false;
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    updateProgress() {
        const state = this.getState();
        if (state && state.attributes.media_duration) {
            if (this.isPlaying) {
                const now = performance.now();
                const elapsed = (now - this.playbackStartTime) / 1000;
                this.lastKnownPosition += elapsed;
                this.playbackStartTime = now;
            }
    
            if (this.lastKnownPosition > state.attributes.media_duration) {
                this.lastKnownPosition = state.attributes.media_duration;
                this.stopProgressUpdate();
            }
    
            const progress = this.lastKnownPosition / state.attributes.media_duration;
            this._elements.progressSlider.value = progress * 100;
            this.updateSeekBarProgress(progress);
            this._elements.currentTime.textContent = this.formatTime(this.lastKnownPosition);
            this._elements.duration.textContent = this.formatTime(state.attributes.media_duration);
        }
    }

    updateSeekBarProgress(progress) {
        const percent = (progress * 100).toFixed(2);
        this._elements.progressBar.style.width = `${percent}%`;
        console.log("Updated progress bar width:", percent + "%");
    }

    doUpdateHass() {
        const state = this.getState();
        console.log("Stato completo:", state);
        
        if (!state || state.state === "unavailable" || state.state === "idle") {
            console.log("Player non disponibile o inattivo");
            this._elements.error.textContent = `Player ${this.getName()} non disponibile!`;
            this._elements.error.classList.remove("hidden");
            this._elements.card.classList.add("unavailable");
            this._elements.card.querySelector('.media-info').style.display = 'none';
            this._elements.card.querySelector('.progress-control').style.display = 'none';
            this._elements.card.querySelector('.volume-control').style.display = 'none';
            this._elements.card.querySelector('.media-controls').style.display = 'none';
            this.stopProgressUpdate();
            return;
        }
    
        this._elements.error.textContent = "";
        this._elements.error.classList.add("hidden");
        this._elements.card.classList.remove("unavailable");
        this._elements.card.querySelector('.media-info').style.display = 'flex';
        this._elements.card.querySelector('.progress-control').style.display = 'flex';
        this._elements.card.querySelector('.volume-control').style.display = 'flex';
        this._elements.card.querySelector('.media-controls').style.display = 'flex';
    
        this._elements.card.classList.add("loading");
        
        if (state.attributes) {
            this._elements.albumArt.src = state.attributes.entity_picture || '';
            this._elements.mediaTitle.textContent = state.attributes.media_title || 'Sconosciuto';
            this._elements.mediaArtist.textContent = state.attributes.media_artist || 'Sconosciuto';
            this._elements.mediaAlbum.textContent = state.attributes.media_album_name || 'Sconosciuto';

            const isMuted = state.attributes.is_volume_muted;
            const volumeIcon = isMuted ? "mdi:volume-off" : "mdi:volume-high";
            this._elements.volumeIcon.setAttribute("icon", volumeIcon);
            
            if (!isMuted) {
                this._elements.volumeSlider.value = (state.attributes.volume_level || 0) * 100;
            }


    
            const mediaContentId = state.attributes.media_content_id;
            if (mediaContentId && typeof mediaContentId === 'string') {
                if (mediaContentId.includes("x-sonos-http")) {
                    this._elements.mediaSourceIcon.setAttribute("icon", "mdi:plex");
                } else if (mediaContentId.includes("x-sonos-spotify")) {
                    this._elements.mediaSourceIcon.setAttribute("icon", "mdi:spotify");
                } else {
                    this._elements.mediaSourceIcon.removeAttribute("icon");
                }
            } else {
                this._elements.mediaSourceIcon.removeAttribute("icon");
            }
    
            const isMuted = state.attributes.is_volume_muted;
            const volumeIcon = isMuted ? "mdi:volume-off" : "mdi:volume-high";
            this._elements.volumeIcon.setAttribute("icon", volumeIcon);
            this._elements.volumeSlider.value = (state.attributes.volume_level || 0) * 100;
    
            const playPauseIcon = state.state === "playing" ? "mdi:pause" : "mdi:play";
            this._elements.playPause.setAttribute("icon", playPauseIcon);
    
            const shuffleIcon = state.attributes.shuffle ? "mdi:shuffle" : "mdi:shuffle-disabled";
            this._elements.shuffle.setAttribute("icon", shuffleIcon);
    
            const repeatIconMap = {
                'off': 'mdi:repeat-off',
                'all': 'mdi:repeat',
                'one': 'mdi:repeat-once'
            };
            const repeatIcon = repeatIconMap[state.attributes.repeat] || 'mdi:repeat-off';
            this._elements.repeat.setAttribute("icon", repeatIcon);
    
            if (state.attributes.media_title !== this._lastKnownTitle || state.state !== "playing") {
                this.lastKnownPosition = state.attributes.media_position || 0;
                this._lastKnownTitle = state.attributes.media_title;
            }
            this.lastUpdateTime = performance.now();
    
            this._elements.card.classList.remove("loading");
        } else {
            console.error("Attributi dello stato non disponibili");
            this._elements.error.textContent = "Impossibile recuperare le informazioni del media";
            this._elements.error.classList.remove("hidden");
        }
    
        if (state.state === "playing" && !this.isPlaying) {
            console.log("Starting progress update for playing state");
            this.playbackStartTime = performance.now();
            this.startProgressUpdate();
        } else if (state.state !== "playing" && this.isPlaying) {
            console.log("Stopping progress update for non-playing state");
            this.stopProgressUpdate();
            this.updateProgress();
        }

        if (!this._elements.queuePopup.classList.contains('hidden')) {
            this.updateCurrentTrack();
        }
    }

    updateCurrentTrack() {
        const playerState = this.getState();
        const currentTrackNumber = playerState.attributes.queue_position;
    
        const allTracks = this._elements.queueList.querySelectorAll('li');
        allTracks.forEach((track, index) => {
            track.classList.toggle('current-track', index === currentTrackNumber - 1);
            const playingIcon = track.querySelector('.playing-icon');
            if (index === currentTrackNumber - 1) {
                if (!playingIcon) {
                    const icon = document.createElement('ha-icon');
                    icon.setAttribute('class', 'playing-icon');
                    icon.setAttribute('icon', 'mdi:play-circle-outline');
                    track.appendChild(icon);
                }
            } else if (playingIcon) {
                playingIcon.remove();
            }
        });
    }


    doToggle() {
        this._hass.callService("input_boolean", "toggle", {
            entity_id: this.getEntityID(),
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.stopProgressUpdate();
        document.removeEventListener('click', this.handleOutsideClick);
    }

    static getConfigElement() {
        return document.createElement("toggle-with-graphical-configuration-editor");
    }

    static getStubConfig() {
        return {
            entity: "input_boolean.twgc",
            header: "",
        };
    }
}

if (!customElements.get('sonos-custom-player-card')) {
    customElements.define('sonos-custom-player-card', SonosCustomPlayerCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
    type: "sonos-custom-player-card",
    name: "Sonos custom player card",
    description: "Sonos custom player card (Vanilla JS)",
});