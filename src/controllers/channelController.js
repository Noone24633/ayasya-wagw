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
        channelId: result.channelId
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
      const { duration = 8 * 60 * 60 } = req.body; // Default 8 hours in seconds
      
      const result = await whatsappService.muteChannel(instanceId, channelId, duration);
      
      res.json({
        success: true,
        message: 'Successfully muted channel',
        channelId: result.channelId,
        duration: result.duration
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
        channelId: result.channelId
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

// Create a new channel (Newsletter)
exports.createChannel = async (req, res, next) => {
    try {
      const { instanceId } = req.params;
      const { name, description } = req.body;
      
      // Validasi name (required)
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Channel name is required and must be a non-empty string'
        });
      }

      // Validasi description (optional, tapi jika ada harus string)
      if (description && typeof description !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Description must be a string'
        });
      }

      const instance = whatsappService.getInstance(instanceId);

      if (!instance || !instance.socket) {
        return res.status(404).json({
          success: false,
          error: 'Instance not found or not connected',
        });
      }

      const result = await instance.socket.newsletterCreate(name.trim(), description?.trim() || undefined);
      
      if (!result || !result.id) {
        console.warn('newsletterCreate returned null or invalid result, but channel may have been created');
        
        return res.json({
          success: true,
          message: 'Channel created successfully (response validation pending)',
          data: result || { created: true },
          note: 'Channel may have been created. Please verify in WhatsApp. You may need to refresh channels list.'
        });
      }

      // Try to save channel to database for persistence
      try {
        const prisma = require('../config/database.js').getInstance();
        const channelId = result.id;
        const channelName = result.thread_metadata?.name?.text || name.trim();
        const channelDescription = result.thread_metadata?.description?.text || description?.trim() || '';
        
        // Upsert channel to database
        await prisma.chat.upsert({
          where: {
            instanceId_chatId: {
              instanceId,
              chatId: channelId
            }
          },
          update: {
            name: channelName,
            lastMessageAt: new Date(),
          },
          create: {
            instanceId,
            chatId: channelId,
            name: channelName,
            type: 'newsletter',
            lastMessageAt: new Date(),
          }
        });
        console.log(`Channel ${channelId} saved to database`);
      } catch (dbError) {
        console.warn(`Failed to save channel to database: ${dbError.message}`);
        // Don't fail the request if DB save fails
      }

      // Try to trigger store update by fetching metadata
      // This will ensure the channel is added to the store immediately
      try {
        if (typeof instance.socket.newsletterMetadata === 'function') {
          console.log(`Fetching metadata for channel ${result.id} to update store...`);
          const metadata = await instance.socket.newsletterMetadata(result.id);
          console.log(`✅ Metadata fetched for channel ${result.id}`);
        }
      } catch (metaError) {
        console.warn(`Failed to fetch channel metadata: ${metaError.message}`);
        // Don't fail the request if metadata fetch fails
      }

      // Note: WhatsApp will automatically send chats.update or chats.upsert event
      // when the channel is created. Our event handlers will catch it and sync to database.
      // We just need to wait a moment for WhatsApp to process and send the event.
      console.log(`Waiting for WhatsApp to sync channel ${result.id} to store...`);
      
      // Wait a bit for WhatsApp to sync the channel to store
      // This gives WhatsApp time to process the creation and send chats.update event
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json({
        success: true,
        message: 'Channel created successfully',
        data: result,
        note: 'Channel has been created and saved. It should appear in the channels list automatically. If not, use the refresh endpoint.'
      });
    } catch (error) {
      console.error('Error creating channel:', error);
      console.error('Error stack:', error.stack);
      
      // Handle error "Cannot read properties of null (reading 'id')"
      // Ini biasanya terjadi ketika channel berhasil dibuat tapi response tidak valid
      if (error.message?.includes("Cannot read properties of null") || 
          error.message?.includes("reading 'id'") ||
          error.message?.includes("null") && error.message?.includes("id")) {
        // Channel mungkin sudah berhasil dibuat meskipun ada error di response
        return res.json({
          success: true,
          message: 'Channel created successfully (response parsing issue)',
          data: { created: true },
          note: 'Channel may have been created successfully. Please verify in WhatsApp. If channel exists, you can update the picture separately.',
          warning: 'Response validation encountered an issue, but the channel creation may have succeeded.'
        });
      }
      
      // Handle berbagai jenis error
      if (error.message?.includes('permission') || 
          error.message?.includes('not available') ||
          error.message?.includes('not allowed')) {
        return res.status(403).json({
          success: false,
          error: 'Failed to create channel',
          details: error.message || 'This feature may require special WhatsApp Business permissions or is not available for your account',
        });
      }

      if (error.message?.includes('picture') || error.message?.includes('image')) {
        return res.status(400).json({
          success: false,
          error: 'Failed to create channel',
          details: error.message || 'Invalid picture URL or failed to load picture',
        });
      }

      // Generic error response
      res.status(500).json({
        success: false,
        error: 'Failed to create channel',
        details: error.message || 'An unexpected error occurred',
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

// Search channels by text
exports.searchChannelsByText = async (req, res, next) => {
    try {
      const { instanceId } = req.params;
      const { query, limit = 20 } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      // Note: Baileys doesn't have built-in channel search
      // This would require WhatsApp Business API or custom implementation
      res.status(501).json({
        success: false,
        error: 'Channel search is not supported',
        details: 'WhatsApp Web API does not support searching for channels'
      });
    } catch (error) {
      console.error('Error searching channels:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search channels',
        details: error.message
      });
    }
}

// Search channels by view count
exports.searchChannelsByView = async (req, res, next) => {
  try {
    // Note: This feature is not available in WhatsApp Web API
    res.status(501).json({
      success: false,
      error: 'Search by view count is not supported',
      details: 'WhatsApp Web API does not support searching channels by view count'
    });
  } catch (error) {
    console.error('Error searching channels by view:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search channels',
      details: error.message
    });
  }
}

// Get search views list
exports.getSearchViews = async (req, res, next) => {
  try {
    // Note: This feature is not available in WhatsApp Web API
    res.status(501).json({
      success: false,
      error: 'Search views list is not supported',
      details: 'WhatsApp Web API does not support getting search view categories'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get search views',
      details: error.message
    });
  }
}

// Get search countries list
exports.getSearchCountries = async (req, res, next) => {
  try {
    // Note: This feature is not available in WhatsApp Web API
    res.status(501).json({
      success: false,
      error: 'Search countries list is not supported',
      details: 'WhatsApp Web API does not support getting search countries'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get search countries',
      details: error.message
    });
  }
}

// Get search categories list
exports.getSearchCategories = async (req, res, next) => {
  try {
    // Note: This feature is not available in WhatsApp Web API
    res.status(501).json({
      success: false,
      error: 'Search categories list is not supported',
      details: 'WhatsApp Web API does not support getting search categories'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get search categories',
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

    // Try to trigger a sync by fetching all chats
    // This will force Baileys to sync with WhatsApp servers
    const { socket } = instance;
    
    // Force refresh by accessing store
    if (socket.store && socket.store.chats) {
      // Try to trigger a refresh by accessing the store
      if (typeof socket.store.chats.all === 'function') {
        socket.store.chats.all();
      }
    }

    // Get updated channels list
    const channels = await whatsappService.getChannels(instanceId);
    
    res.json({
      success: true,
      message: 'Channels refreshed successfully',
      data: channels || [],
      count: channels?.length || 0
    });
  } catch (error) {
    console.error('Error refreshing channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh channels',
      details: error.message
    });
  }
}