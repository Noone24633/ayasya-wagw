const whatsappService = require('../services/whatsappService');
const database = require('../config/database');

class AdvancedMessageController {
    // ============= BASIC MESSAGING =============

    // Send text message
    async sendText(req, res) {
        try {
            const { instanceId, to, message, quotedMessageId } = req.body;

            if (!instanceId || !to || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId, to, and message are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
            const messageOptions = { text: message };

            // Add quoted message if provided
            if (quotedMessageId) {
                messageOptions.quoted = { key: { id: quotedMessageId } };
            }

            const result = await instance.socket.sendMessage(jid, messageOptions);

            res.json({
                success: true,
                data: {
                    messageId: result.key.id,
                    status: result.status,
                    timestamp: result.messageTimestamp,
                },
                message: 'Text message sent successfully',
            });
        } catch (error) {
            console.error('Error sending text message:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to send text message',
            });
        }
    }

    // Send image
    async sendImage(req, res) {
        try {
            const { instanceId, to, imageUrl, imageBase64, caption, viewOnce } = req.body;

            if (!instanceId || !to || (!imageUrl && !imageBase64)) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId, to, and either imageUrl or imageBase64 are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
            const messageOptions = {
                caption: caption || '',
                viewOnce: viewOnce || false,
            };

            if (imageBase64) {
                const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
                messageOptions.image = Buffer.from(base64Data, 'base64');
            } else if (imageUrl) {
                messageOptions.image = { url: imageUrl };
            }

            const result = await instance.socket.sendMessage(jid, messageOptions);

            res.json({
                success: true,
                data: {
                    messageId: result.key.id,
                    status: result.status,
                    timestamp: result.messageTimestamp,
                },
                message: 'Image sent successfully',
            });
        } catch (error) {
            console.error('Error sending image:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to send image',
            });
        }
    }

    // Send file/document
    async sendFile(req, res) {
        try {
            const { instanceId, to, fileUrl, fileBase64, fileName, mimetype, caption } = req.body;

            if (!instanceId || !to || (!fileUrl && !fileBase64)) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId, to, and either fileUrl or fileBase64 are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
            const messageOptions = {
                fileName: fileName || 'document',
                mimetype: mimetype || 'application/octet-stream',
                caption: caption || '',
            };

            if (fileBase64) {
                const base64Data = fileBase64.replace(/^data:.*;base64,/, '');
                messageOptions.document = Buffer.from(base64Data, 'base64');
            } else if (fileUrl) {
                messageOptions.document = { url: fileUrl };
            }

            const result = await instance.socket.sendMessage(jid, messageOptions);

            res.json({
                success: true,
                data: {
                    messageId: result.key.id,
                    status: result.status,
                    timestamp: result.messageTimestamp,
                },
                message: 'File sent successfully',
            });
        } catch (error) {
            console.error('Error sending file:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to send file',
            });
        }
    }

    // Send voice/audio
    async sendVoice(req, res) {
        try {
            const { instanceId, to, audioUrl, audioBase64, ptt = true } = req.body;

            if (!instanceId || !to || (!audioUrl && !audioBase64)) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId, to, and either audioUrl or audioBase64 are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
            const messageOptions = {
                ptt: ptt, // Push to talk (voice note)
                mimetype: 'audio/ogg; codecs=opus',
            };

            if (audioBase64) {
                const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
                messageOptions.audio = Buffer.from(base64Data, 'base64');
            } else if (audioUrl) {
                messageOptions.audio = { url: audioUrl };
            }

            const result = await instance.socket.sendMessage(jid, messageOptions);

            res.json({
                success: true,
                data: {
                    messageId: result.key.id,
                    status: result.status,
                    timestamp: result.messageTimestamp,
                },
                message: 'Voice message sent successfully',
            });
        } catch (error) {
            console.error('Error sending voice message:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to send voice message',
            });
        }
    }

    // Send video
    async sendVideo(req, res) {
        try {
            const { instanceId, to, videoUrl, videoBase64, caption, gifPlayback = false } = req.body;

            if (!instanceId || !to || (!videoUrl && !videoBase64)) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId, to, and either videoUrl or videoBase64 are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
            const messageOptions = {
                caption: caption || '',
                gifPlayback: gifPlayback,
            };

            if (videoBase64) {
                const base64Data = videoBase64.replace(/^data:video\/\w+;base64,/, '');
                messageOptions.video = Buffer.from(base64Data, 'base64');
            } else if (videoUrl) {
                messageOptions.video = { url: videoUrl };
            }

            const result = await instance.socket.sendMessage(jid, messageOptions);

            res.json({
                success: true,
                data: {
                    messageId: result.key.id,
                    status: result.status,
                    timestamp: result.messageTimestamp,
                },
                message: 'Video sent successfully',
            });
        } catch (error) {
            console.error('Error sending video:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to send video',
            });
        }
    }

    // Send link with custom preview
    async sendLinkPreview(req, res) {
        try {
            const { instanceId, to, text, url, title, description, thumbnailUrl } = req.body;

            if (!instanceId || !to || !text) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId, to, and text are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

            // If custom preview data is provided
            if (url && title) {
                const messageOptions = {
                    text: text,
                    linkPreview: {
                        url: url,
                        title: title,
                        description: description || '',
                        thumbnailUrl: thumbnailUrl || null,
                    },
                };

                const result = await instance.socket.sendMessage(jid, messageOptions);

                res.json({
                    success: true,
                    data: {
                        messageId: result.key.id,
                        status: result.status,
                        timestamp: result.messageTimestamp,
                    },
                    message: 'Link with preview sent successfully',
                });
            } else {
                // Auto-generate preview
                const result = await instance.socket.sendMessage(jid, { text: text });

                res.json({
                    success: true,
                    data: {
                        messageId: result.key.id,
                        status: result.status,
                        timestamp: result.messageTimestamp,
                    },
                    message: 'Link sent successfully',
                });
            }
        } catch (error) {
            console.error('Error sending link preview:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to send link preview',
            });
        }
    }

    // ============= INTERACTIVE MESSAGES =============

    // Send poll
    async sendPoll(req, res) {
        try {
            const { instanceId, to, question, options, multipleAnswers = false, toAnnouncementGroup = false } = req.body;

            if (!instanceId || !to || !question || !options || !Array.isArray(options)) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId, to, question, and options array are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

            const pollMessage = {
                poll: {
                    name: question,
                    values: options,
                    selectableCount: multipleAnswers ? options.length : 1,
                    toAnnouncementGroup: toAnnouncementGroup ? true : false,
                },
            };

            const result = await instance.socket.sendMessage(jid, pollMessage);

            res.json({
                success: true,
                message: 'Poll sent successfully',
                data: result,
            });
        } catch (error) {
            console.error('Error sending poll:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to send poll',
            });
        }
    }

    // ============= LOCATION & CONTACT =============

    // Send location
    async sendLocation(req, res) {
        try {
            const { instanceId, to, latitude, longitude, name, address } = req.body;

            if (!instanceId || !to || latitude === undefined || longitude === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId, to, latitude, and longitude are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

            const locationMessage = {
                location: {
                    degreesLatitude: latitude,
                    degreesLongitude: longitude,
                    name: name || '',
                    address: address || '',
                },
            };

            const result = await instance.socket.sendMessage(jid, locationMessage);

            res.json({
                success: true,
                data: {
                    messageId: result.key.id,
                    status: result.status,
                    timestamp: result.messageTimestamp,
                },
                message: 'Location sent successfully',
            });
        } catch (error) {
            console.error('Error sending location:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to send location',
            });
        }
    }

    // Send contact vCard
    async sendContact(req, res) {
        try {
            const { instanceId, to, contactName, contactNumber, organization } = req.body;

            if (!instanceId || !to || !contactName || !contactNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId, to, contactName, and contactNumber are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

            const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${contactName}
TEL;type=CELL;type=VOICE;waid=${contactNumber.replace(/[^0-9]/g, '')}:${contactNumber}
${organization ? `ORG:${organization}` : ''}
END:VCARD`;

            const contactMessage = {
                contacts: {
                    displayName: contactName,
                    contacts: [{ vcard }],
                },
            };

            const result = await instance.socket.sendMessage(jid, contactMessage);

            res.json({
                success: true,
                data: {
                    messageId: result.key.id,
                    status: result.status,
                    timestamp: result.messageTimestamp,
                },
                message: 'Contact sent successfully',
            });
        } catch (error) {
            console.error('Error sending contact:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to send contact',
            });
        }
    }

    // ============= MESSAGE ACTIONS =============

    // Forward message
    async forwardMessage(req, res) {
        try {
            const { instanceId, to, messageId, fromChatId } = req.body;

            if (!instanceId || !to || !messageId) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId, to, and messageId are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const toJid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
            const prisma = database.getInstance();

            const message = await prisma.message.findMany({
                where: { messageId },
            });

            const result = await instance.socket.sendMessage(toJid, { forward: message });

            res.json({
                success: true,
                data: {
                    messageId: result.key.id,
                    status: result.status,
                    timestamp: result.messageTimestamp,
                },
                message: 'Message forwarded successfully',
            });
        } catch (error) {
            console.error('Error forwarding message:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to forward message',
            });
        }
    }

    // Send seen/read receipt
    async sendSeen(req, res) {
        try {
            const { instanceId, chatId } = req.body;

            if (!instanceId || !chatId) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId and chatId are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            if (!instance.socket || !instance.socket.user) {
                return res.status(400).json({
                    success: false,
                    error: 'Whatsapp not connected',
                });
            }

            const jid = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
            await instance.socket.chatModify({ markRead: true }, jid);

            res.json({
                success: true,
                message: 'Messages marked as seen',
            });
        } catch (error) {
            console.error('Error sending seen receipt:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to send seen receipt',
            });
        }
    }

    // Start typing indicator
    async startTyping(req, res) {
        try {
            const { instanceId, to } = req.body;

            if (!instanceId || !to) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId and to are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
            await instance.socket.sendPresenceUpdate('composing', jid);

            res.json({
                success: true,
                message: 'Typing indicator started',
            });
        } catch (error) {
            console.error('Error starting typing:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to start typing',
            });
        }
    }

    // Stop typing indicator
    async stopTyping(req, res) {
        try {
            const { instanceId, to } = req.body;

            if (!instanceId || !to) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId and to are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
            await instance.socket.sendPresenceUpdate('paused', jid);

            res.json({
                success: true,
                message: 'Typing indicator stopped',
            });
        } catch (error) {
            console.error('Error stopping typing:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to stop typing',
            });
        }
    }

    // Add reaction to message
    async addReaction(req, res) {
        try {
            const { instanceId, chatId, messageId, reaction } = req.body;

            if (!instanceId || !chatId || !messageId || !reaction) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId, chatId, messageId, and reaction are required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const jid = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;

            const reactionMessage = {
                react: {
                    text: reaction, // Emoji reaction
                    key: {
                        remoteJid: jid,
                        id: messageId,
                    },
                },
            };

            await instance.socket.sendMessage(jid, reactionMessage);

            res.json({
                success: true,
                message: 'Reaction added successfully',
            });
        } catch (error) {
            console.error('Error adding reaction:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to add reaction',
            });
        }
    }

    // Star/unstar message
    async starMessage(req, res) {
        try {
            const { instanceId, star = true, messages } = req.body;

            if (!instanceId) {
                return res.status(400).json({
                    success: false,
                    error: 'instanceId are required',
                });
            }

            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'messages array is required',
                });
            }

            const instance = whatsappService.getInstance(instanceId);
            if (!instance || !instance.socket) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found or not connected',
                });
            }

            const { socket } = instance;

            // Check if app state is ready
            if (!instance.appStateReady) {
                console.log(`app state not ready`);
                return res.status(503).json({
                    success: false,
                    error: 'not available yet',
                    details: 'App state is not fully synchronized. Please wait a moment and try again.',
                    hint: 'Make sure the instance has completed initial synchronization (usually takes 10-30 seconds after connection)',
                });
            }

            // Try to update profile name with retry logic
            let retries = 3;
            let lastError = null;

            while (retries > 0) {
                try {
                    await socket.chatModify({
                        star: {
                            messages,
                            star: star,
                        },
                    });

                    return res.json({
                        success: true,
                        message: star ? 'Message starred successfully' : 'Message unstarred successfully',
                    });
                } catch (updateError) {
                    lastError = updateError;

                    // Check if it's an app state key error
                    if (updateError.message && updateError.message.includes('App state key')) {
                        console.warn(`App state key not present (attempt ${4 - retries}/3), retrying in 2 seconds...`);
                        retries--;

                        if (retries > 0) {
                            // Wait 2 seconds before retrying
                            await new Promise((resolve) => setTimeout(resolve, 2000));
                        }
                    } else {
                        // Different error, don't retry
                        throw updateError;
                    }
                }
            }

            // All retries failed
            console.error('Profile name update failed after 3 retries:', lastError);
            return res.status(503).json({
                success: false,
                error: 'Profile name update failed',
                details: 'App state is not fully synchronized. Please wait a moment and try again.',
                hint: 'Make sure the instance has completed initial synchronization (usually takes 10-30 seconds after connection)',
            });
        } catch (error) {
            console.error('Error starring message:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to star message',
            });
        }
    }
}

module.exports = new AdvancedMessageController();
