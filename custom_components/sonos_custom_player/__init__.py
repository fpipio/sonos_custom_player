"""Sonos Helper component for Home Assistant."""
import logging
import voluptuous as vol
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.components.media_player import DOMAIN as MEDIA_PLAYER_DOMAIN
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.helpers.typing import ConfigType

DOMAIN = "sonos_helper"
_LOGGER = logging.getLogger(__name__)

SERVICE_GET_QUEUE = "get_queue"
SERVICE_SET_RADIO_THUMBNAIL = "set_radio_thumbnail"
SERVICE_SET_RADIO_NAME = "set_radio_name"

SERVICE_SCHEMA = vol.Schema({
    vol.Required(ATTR_ENTITY_ID): cv.entity_id,
})

SET_RADIO_THUMBNAIL_SCHEMA = SERVICE_SCHEMA.extend({
    vol.Required("thumbnail"): cv.string,
})

SET_RADIO_NAME_SCHEMA = SERVICE_SCHEMA.extend({
    vol.Required("name"): cv.string,
})

CONFIG_SCHEMA = vol.Schema({DOMAIN: {}}, extra=vol.ALLOW_EXTRA)

async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Sonos Helper component."""
    _LOGGER.info("Sonos Helper component is being set up")

    async def handle_get_queue(call):
        """Handle the get_queue service call."""
        entity_id = call.data.get(ATTR_ENTITY_ID)
        _LOGGER.info(f"Received get_queue call for entity: {entity_id}")
        
        queue, radio_thumbnail, radio_name = await get_queue(hass, entity_id)
        if queue is not None:
            sensor_name = f"{entity_id.split('.')[1]}_info"
            sensor_entity_id = f"sensor.{sensor_name}"
            attributes = {
                'queue_items': queue,
                'radio_thumbnail': radio_thumbnail,
                'radio_name': radio_name
            }
            hass.states.async_set(sensor_entity_id, "updated", attributes)
            _LOGGER.info(f"Created/updated sensor: {sensor_entity_id} with {len(queue)} queue items")
        else:
            _LOGGER.error(f"Failed to get Sonos queue for {entity_id}")

    async def handle_set_radio_thumbnail(call):
        """Handle the set_radio_thumbnail service call."""
        entity_id = call.data.get(ATTR_ENTITY_ID)
        thumbnail = call.data.get("thumbnail")
        sensor_name = f"{entity_id.split('.')[1]}_info"
        sensor_entity_id = f"sensor.{sensor_name}"
        
        current_state = hass.states.get(sensor_entity_id)
        if current_state:
            new_attributes = dict(current_state.attributes)
        else:
            new_attributes = {'queue_items': []}
        
        new_attributes['radio_thumbnail'] = thumbnail
        hass.states.async_set(sensor_entity_id, "updated", new_attributes)
        _LOGGER.info(f"Updated radio thumbnail for {sensor_entity_id}")

    async def handle_set_radio_name(call):
        """Handle the set_radio_name service call."""
        entity_id = call.data.get(ATTR_ENTITY_ID)
        name = call.data.get("name")
        sensor_name = f"{entity_id.split('.')[1]}_info"
        sensor_entity_id = f"sensor.{sensor_name}"
        
        current_state = hass.states.get(sensor_entity_id)
        if current_state:
            new_attributes = dict(current_state.attributes)
        else:
            new_attributes = {'queue_items': []}
        
        new_attributes['radio_name'] = name
        hass.states.async_set(sensor_entity_id, "updated", new_attributes)
        _LOGGER.info(f"Updated radio name for {sensor_entity_id}")

    hass.services.async_register(DOMAIN, SERVICE_GET_QUEUE, handle_get_queue, schema=SERVICE_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_SET_RADIO_THUMBNAIL, handle_set_radio_thumbnail, schema=SET_RADIO_THUMBNAIL_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_SET_RADIO_NAME, handle_set_radio_name, schema=SET_RADIO_NAME_SCHEMA)
    
    _LOGGER.info(f"Registered services: {DOMAIN}.{SERVICE_GET_QUEUE}, {DOMAIN}.{SERVICE_SET_RADIO_THUMBNAIL}, {DOMAIN}.{SERVICE_SET_RADIO_NAME}")
    
    return True

async def get_queue(hass: HomeAssistant, entity_id: str):
    """Get the queue for a Sonos player."""
    try:
        import soco
    except ImportError:
        _LOGGER.error("Failed to import soco. Make sure it's installed.")
        return None, None, None

    entity = hass.states.get(entity_id)
    if not entity:
        _LOGGER.error(f"Entity {entity_id} not found")
        return None, None, None

    media_player = hass.data[MEDIA_PLAYER_DOMAIN].get_entity(entity_id)
    if not media_player:
        _LOGGER.error(f"Media player {entity_id} not found")
        return None, None, None

    if not hasattr(media_player, 'soco'):
        _LOGGER.error(f"Entity {entity_id} does not appear to be a Sonos device")
        return None, None, None

    try:
        _LOGGER.debug(f"Attempting to get queue for Sonos device: {media_player.soco.ip_address}")
        queue = await hass.async_add_executor_job(media_player.soco.get_queue)
        _LOGGER.debug(f"Raw queue data: {queue}")
        
        if not queue:
            _LOGGER.info(f"Queue is empty for {entity_id}")
            return [], None, None
        
        queue_items = []
        for item in queue:
            queue_item = {
                "title": getattr(item, 'title', 'Unknown Title'),
                "artist": getattr(item, 'creator', 'Unknown Artist'),
                "album": getattr(item, 'album', 'Unknown Album'),
                "uri": getattr(item.resources[0], 'uri', '') if item.resources else '',
                "duration": "Unknown"
            }
            
            if item.resources and hasattr(item.resources[0], 'duration'):
                duration = item.resources[0].duration
                if duration:
                    duration_parts = str(duration).split(':')
                    total_seconds = sum(int(x) * 60 ** i for i, x in enumerate(reversed(duration_parts)))
                    queue_item["duration"] = str(total_seconds)
            
            queue_items.append(queue_item)
        
        _LOGGER.info(f"Processed {len(queue_items)} items in the queue")
        
        # Get radio information
        radio_thumbnail = None
        radio_name = None
        current_track = await hass.async_add_executor_job(media_player.soco.get_current_track_info)
        if current_track:
            radio_thumbnail = current_track.get('album_art', None)
            radio_name = current_track.get('station', None)
        
        return queue_items, radio_thumbnail, radio_name
    except Exception as e:
        _LOGGER.error(f"Error getting Sonos queue: {str(e)}")
        _LOGGER.exception("Full traceback:")
        return None, None, None