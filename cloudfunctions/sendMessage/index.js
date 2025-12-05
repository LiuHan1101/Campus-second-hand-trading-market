const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 统一聊天数据模型:
 * - 会话: chat_sessions { user1Id, user2Id, postId?, lastMessage, lastMessageTime, unread: { [openid]: number }, createdAt }
 * - 消息: chat_messages { chatId, fromUserId, toUserId, type, content, isRead, createTime, postId? }
 */
exports.main = async (event, context) => {
  try {
    const { receiverId, type = 'text', content = '', postId = '', chatId: incomingChatId } = event;
    const { OPENID: senderId } = cloud.getWXContext();

    if (!receiverId) {
      return { success: false, message: 'receiverId required' };
    }

    // 标准化展示用最后消息内容
    const lastMessageText = content || (type === 'image' ? '[图片]' : type === 'file' ? '[文件]' : '');

    // 1) 获取或创建会话 chat_session
    let chatId = incomingChatId || '';
    let sessionDoc = null;
    if (chatId) {
      const sessionRes = await db.collection('chat_sessions').doc(chatId).get().catch(() => null);
      sessionDoc = sessionRes && sessionRes.data ? sessionRes.data : null;
    }
    if (!sessionDoc) {
      // 查找现有会话（双向匹配 + 同一帖子）
      const sessionRes = await db.collection('chat_sessions')
        .where(
          _.and([
            _.or([
              { user1Id: senderId, user2Id: receiverId },
              { user1Id: receiverId, user2Id: senderId }
            ]),
            { postId: postId || '' }
          ])
        )
        .limit(1)
        .get();

      if (sessionRes.data && sessionRes.data.length > 0) {
        sessionDoc = sessionRes.data[0];
        chatId = sessionDoc._id;
      } else {
        // 创建新会话
        const createRes = await db.collection('chat_sessions').add({
          data: {
            user1Id: senderId,
            user2Id: receiverId,
            postId: postId || '',
            lastMessage: lastMessageText,
            lastMessageTime: db.serverDate(),
            unread: { [senderId]: 0, [receiverId]: 1 },
            createdAt: db.serverDate()
          }
        });
        chatId = createRes._id;
        sessionDoc = { _id: chatId, user1Id: senderId, user2Id: receiverId, postId: postId || '' };
      }
    }

    // 2) 写消息到 chat_messages
    const msgRes = await db.collection('chat_messages').add({
      data: {
        chatId,
        fromUserId: senderId,
        toUserId: receiverId,
        type,
        content,
        isRead: false,
        createTime: db.serverDate(),
        postId: postId || ''
      }
    });

    // 3) 更新会话最后消息与未读计数
    await db.collection('chat_sessions').doc(chatId).update({
      data: {
        lastMessage: lastMessageText,
        lastMessageTime: db.serverDate(),
        [`unread.${receiverId}`]: _.inc(1)
      }
    });

    // 4) 发送订阅/模板通知（忽略错误）
    try {
      await cloud.callFunction({
        name: 'sendNotification',
        data: {
          toOpenId: receiverId,
          title: '您有新消息',
          content: lastMessageText || '[新消息]',
          extra: { chatId }
        }
      });
    } catch (e) {
      console.warn('发送通知失败：', e);
    }

    return { success: true, chatId, messageId: msgRes._id };
  } catch (err) {
    console.error('sendMessage error:', err);
    return { success: false, error: err.message };
  }
};
