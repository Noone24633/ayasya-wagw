const whatsappService = require('../services/whatsappService');
const axios = require('axios');

// Get list of known channels/newsletters
exports.getChannels = async (req, res, next) => {
    try {
      const { instanceId } = req.params;
      
      const channels = await whatsappService.getChannels(instanceId);
      
      res.json({
        success: true,
        data: channels || [],
        count: channels?.length || 0
      });
    } catch (error) {
      console.error('Error getting channels:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get channels',
        details: error.message
      });
    }
}

// Get channel info
exports.getChannelInfo = async (req, res, next) => {
    try {
      const { instanceId, channelId } = req.params;
      
      const metadata = await whatsappService.getChannelInfo(instanceId, channelId);
      
      res.json({
        success: true,
        data: metadata
      });
    } catch (error) {
      console.error('Error getting channel info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get channel info',
        details: error.message
      });
    }
}

// Follow a channel
exports.followChannel = async (req, res, next) => {
    try {
      const { instanceId, channelId } = req.params;
      
      const result = await whatsappService.followChannel(instanceId, channelId);
      
      res.json({
        success: true,
        message: 'Successfully followed channel',
        channelId: result
      });
    } catch (error) {
      console.error('Error following channel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to follow channel',
        details: error.message
      });
    }
}

// Unfollow a channel
exports.unfollowChannel = async (req, res, next) => {
    try {
      const { instanceId, channelId } = req.params;
      
      const result = await whatsappService.unfollowChannel(instanceId, channelId);
      
      res.json({
        success: true,
        message: 'Successfully unfollowed channel',
        channelId: result.channelId
      });
    } catch (error) {
      console.error('Error unfollowing channel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unfollow channel',
        details: error.message
      });
    }
}

// Mute a channel
exports.muteChannel = async (req, res, next) => {
    try {
      const { instanceId, channelId } = req.params;
      
      const result = await whatsappService.muteChannel(instanceId, channelId);
      
      res.json({
        success: true,
        message: 'Successfully muted channel',
        channelId: result
      });
    } catch (error) {
      console.error('Error muting channel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mute channel',
        details: error.message
      });
    }
}

// Unmute a channel
exports.unmuteChannel = async (req, res, next) => {
    try {
      const { instanceId, channelId } = req.params;
      
      const result = await whatsappService.unmuteChannel(instanceId, channelId);
      
      res.json({
        success: true,
        message: 'Successfully unmuted channel',
        channelId: result
      });
    } catch (error) {
      console.error('Error unmuting channel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unmute channel',
        details: error.message
      });
    }
}

// Refresh/Sync channels - Force refresh from WhatsApp
exports.refreshChannels = async (req, res, next) => {
  try {
    const { instanceId } = req.params;
    
    const instance = whatsappService.getInstance(instanceId);
    
    if (!instance || !instance.socket) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found or not connected'
      });
    }

    // Get updated channels list (this will sync from store and database)
    // No need to manually trigger store refresh, getChannels already does this
    const channels = await whatsappService.getChannels(instanceId);
    
    res.json({
      success: true,
      message: 'Channels refreshed successfully',
      data: channels || [],
      count: channels?.length || 0
    });
  } catch (error) {
    console.error('Error refreshing channels:', error);
    
    // Check for specific GraphQL errors
    if (error.message?.includes('GraphQL server error') || error.message?.includes('Bad Request')) {
      return res.status(400).json({
        success: false,
        error: 'Failed to refresh channels',
        details: 'Error communicating with WhatsApp servers. Please try again later.',
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to refresh channels',
      details: error.message || 'An unexpected error occurred'
    });
  }
}

// Create a new channel (Newsletter)
exports.createChannel = async (req, res, next) => {
    try {
      const { instanceId } = req.params;
      const { name, description, picture } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Channel name is required'
        });
      }

      // Call the service method to create the channel
      const result = await whatsappService.createChannel(instanceId, name, description, picture);
      
      res.json({
        success: true,
        message: 'Channel created successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error creating channel:', error);
      
      // Check if it's a permission error
      if (error.message?.includes('permission') || error.message?.includes('not available')) {
        return res.status(403).json({
          success: false,
          error: 'Failed to create channel',
          details: error.message || 'This feature may require special WhatsApp Business permissions',
        });
      }
      
      // Check for specific "Bad Request" error from GraphQL
      if (error.message?.includes('Bad Request') || error.message?.includes('GraphQL server error')) {
        return res.status(400).json({
          success: false,
          error: 'Failed to create channel',
          details: error.message || 'Invalid request format. Please check that the channel name is valid and your account has permission to create channels.',
        });
      }

      // Handle "Cannot read properties of null (reading 'id')" or similar
      if (error.message?.includes("Cannot read properties of null")) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create channel',
          details: 'Channel creation might have failed or returned an unexpected null result. Please check logs for more details.',
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to create channel',
        details: error.message,
      });
    }
}

// Delete a channel
exports.deleteChannel = async (req, res, next) => {
    try {
      const { instanceId, channelId } = req.params;
      
      if (!channelId) {
        return res.status(400).json({
          success: false,
          error: 'Channel ID is required'
        });
      }

      // Use service method which has better error handling and validation
      const result = await whatsappService.deleteChannel(instanceId, channelId);
      
      res.json({
        success: true,
        message: 'Channel deleted successfully',
        data: result
      });
    } catch (error) {
      console.error('Error deleting channel:', error);
      
      // Check if it's an authorization error
      if (error.message?.includes('Not Authorized') || error.message?.includes('not authorized')) {
        return res.status(403).json({
          success: false,
          error: 'Failed to delete channel',
          details: error.message || 'You must be the owner of the channel to delete it. Only channel owners can delete their channels.',
        });
      }
      
      // Check if channel not found
      if (error.message?.includes('not found') || error.message?.includes('Not Found')) {
        return res.status(404).json({
          success: false,
          error: 'Failed to delete channel',
          details: error.message || 'Channel not found. The channel may have already been deleted or does not exist.',
        });
      }
      
      // Check if it's a permission error
      if (error.message?.includes('not available') || error.message?.includes('permission')) {
        return res.status(403).json({
          success: false,
          error: 'Failed to delete channel',
          details: error.message || 'This feature may require special WhatsApp Business permissions',
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to delete channel',
        details: error.message || 'An unexpected error occurred'
      });
    }
}

// Get channel messages preview
exports.getChannelMessagesPreview = async (req, res, next) => {
    try {
      const { instanceId, channelId } = req.params;
      const { limit = 20 } = req.query;
      
      const messages = await whatsappService.getChannelMessages(instanceId, channelId, parseInt(limit));
      
      res.json({
        success: true,
        data: messages || [],
        count: messages?.length || 0
      });
    } catch (error) {
      console.error('Error getting channel messages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get channel messages',
        details: error.message
      });
    }
}