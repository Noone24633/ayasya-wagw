const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');
const { apiKeyAuth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(apiKeyAuth);

// Get list of known channels (subscribed newsletters)
router.get('/:instanceId', channelController.getChannels);

// Refresh/Sync channels - Force refresh from WhatsApp
router.post('/:instanceId/refresh', channelController.refreshChannels);

// Create a new channel (newsletter) - if user has permission
router.post('/:instanceId', channelController.createChannel);

// Get channel info
router.get('/:instanceId/:channelId', channelController.getChannelInfo);

// Delete a channel (not supported in Baileys)
router.delete('/:instanceId/:channelId', channelController.deleteChannel);

// Get channel messages preview
router.get('/:instanceId/:channelId/messages/preview', channelController.getChannelMessagesPreview);

// Follow a channel
router.post('/:instanceId/:channelId/follow', channelController.followChannel);

// Unfollow a channel
router.post('/:instanceId/:channelId/unfollow', channelController.unfollowChannel);

// Mute a channel
router.post('/:instanceId/:channelId/mute', channelController.muteChannel);

// Unmute a channel
router.post('/:instanceId/:channelId/unmute', channelController.unmuteChannel);

module.exports = router;
