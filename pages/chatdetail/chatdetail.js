// pages/chatdetail/chatdetail.js
Page({
  data: {
    messages: [],
    inputValue: '',
    canSend: false,
    scrollTop: 0,
    showConfirmBubble: false,
    showRatingBubble: false,
    comment: '',
    ratingData: { descScore: 0, timeScore: 0, attitudeScore: 0 },
    inputHeight: 44,
    safeAreaBottom: 0,
    // 时间显示策略
    timeSeparatorThresholdMinutes: 5,
    useCenteredTimeSeparator: true,
    sellerInfo: { 
      nickname: '商家', 
      avatar: 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png', 
      userId: null, 
      college: '' 
    },
    currentUserInfo: { 
      nickname: '我', 
      avatar: 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png', 
      userId: null 
    },
    postInfo: null,
    isLoading: true,
    chatId: null
  },
  onUnload() {
    this.msgWatcher && this.msgWatcher.close();
  },
  
  // ==================== 图片处理相关函数 ====================
  
  // 图片URL缓存
  imageUrlCache: {},
  
  // 云函数调用缓存（暂不使用头像云函数）
  cloudFunctionCache: {},

  /**
   * 将可能的 users._id 映射为 openid，统一系统内使用 openid 作为用户ID
   * @param {string} id - 可能是 openid 或 users 表的 _id
   * @returns {Promise<string|null>} - 返回 openid 或 null
   */
  async resolveToOpenid(id) {
    if (!id || typeof id !== 'string') return null;
    // 简单判断：openid 通常为 28 位，且由小写字母和数字组成（此处不做严格校验）
    if (id.length >= 24 && id.length <= 32 && !id.includes('-')) {
      // 假设已是 openid（兼容历史数据）
      return id;
    }
    // 若传入可能是 users._id，尝试读取并返回其 openid 字段
    try {
      const db = wx.cloud.database();
      const res = await db.collection('users').doc(id).get();
      const u = res && res.data ? res.data : null;
      return u && (u.openid || u._openid) ? (u.openid || u._openid) : null;
    } catch (e) {
      console.warn('resolveToOpenid 映射失败:', e);
      return null;
    }
  },
  
  /**
   * 获取可共享的图片URL（使用云函数中转）
   * @param {string} fileID - 云存储文件ID
   * @returns {Promise<string>} - 临时URL
   */
  async getSharedAvatar(fileID) {
    // 暂时不使用远程头像，统一使用本地默认头像，保留接口以便未来启用
    return this.getDefaultAvatar();
  },
  
  /**
   * 修复图片URL（智能处理各种格式）
   * @param {string} url - 原始URL
   * @returns {Promise<string>} - 处理后的URL
   */
  async fixImageUrl(url) {
    if (!url || typeof url !== 'string') {
      return this.getDefaultAvatar();
    }
    
    // 检查缓存
    const cacheKey = url.trim();
    if (this.imageUrlCache[cacheKey]) {
      return this.imageUrlCache[cacheKey];
    }
    
    let finalUrl = url.trim();
    
    // 1. 如果是完整的云存储路径
    if (finalUrl.startsWith('cloud://')) {
      try {
        const tempUrl = await this.getSharedAvatar(finalUrl);
        if (tempUrl) {
          this.imageUrlCache[cacheKey] = tempUrl;
          return tempUrl;
        }
      } catch (error) {
        console.warn('云存储路径处理失败:', error);
      }
    }
    
    // 2. 如果是相对路径
    else if (finalUrl.startsWith('/')) {
      const cloudPath = `cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/${finalUrl.substring(1)}`;
      try {
        const tempUrl = await this.getSharedAvatar(cloudPath);
        if (tempUrl) {
          this.imageUrlCache[cacheKey] = tempUrl;
          return tempUrl;
        }
      } catch (error) {
        console.warn('相对路径处理失败:', error);
      }
    }
    
    // 3. 如果是网络URL，直接返回
    else if (finalUrl.startsWith('http')) {
      this.imageUrlCache[cacheKey] = finalUrl;
      return finalUrl;
    }
    
    // 4. 其他情况返回默认头像
    return this.getDefaultAvatar();
  },
  
  /**
   * 获取默认头像URL
   */
  getDefaultAvatar() {
    return '/miniprogram/images/avatar.png';
  },
  
  /**
   * 批量处理图片URL（性能优化）
   */
  async batchFixImageUrls(urls) {
    if (!Array.isArray(urls) || urls.length === 0) {
      return [];
    }
    
    const results = [];
    const promises = urls.map(async (url, index) => {
      try {
        const fixedUrl = await this.fixImageUrl(url);
        results[index] = fixedUrl;
      } catch (error) {
        console.error('处理图片URL失败:', error, url);
        results[index] = this.getDefaultAvatar();
      }
    });
    
    await Promise.all(promises);
    return results;
  },
  
  onLoad(options) {
    console.log('聊天参数:', options);
    
    // 初始化云开发
    wx.cloud.init({
      env: 'cloud1-8gw6xrycfea6d00b',
      traceUser: true
    });
    
    // 获取系统信息
    wx.getWindowInfo({
      success: (res) => {
        this.setData({ safeAreaBottom: res.screenHeight - res.safeArea.bottom });
      }
    });
    
    this.initChat(options);
  },

  // ==================== 核心业务函数 ====================

  // 初始化聊天
  async initChat(options) {
    this.setData({ isLoading: true });
    
    try {
      // 1. 获取当前用户信息
      const currentUserInfo = await this.getCurrentUserInfo();
      
      // 2. 获取卖家和商品信息
      let { sellerInfo, postInfo, presetChatId } = await this.getChatData(options, currentUserInfo);
      
      // 3. 批量处理商品图片
      if (postInfo?.images?.length > 0) {
        postInfo.images = await this.batchFixImageUrls(postInfo.images);
      }
      
      // 4. 处理卖家头像（暂用默认头像，占位保留）
      sellerInfo.avatar = this.getDefaultAvatar();
      
      // 5. 设置数据
      this.setData({ 
        sellerInfo, 
        currentUserInfo, 
        postInfo, 
        chatId: presetChatId || null
      });
      
      // 6. 设置页面标题
      wx.setNavigationBarTitle({ title: `与${sellerInfo.nickname}聊天` });
      
      // 7. 创建聊天会话（如果有用户ID）
      if (sellerInfo.userId && currentUserInfo.userId && !this.data.chatId) {
        const chatId = await this.getOrCreateChatSession();
        if (chatId) {
          this.setData({ chatId });
        }
      } else if (!sellerInfo.userId || !currentUserInfo.userId) {
        console.log('用户信息不完整，使用本地聊天');
      }
      
      // 8. 加载历史消息
      await this.loadChatHistory();
      // 开启实时监听并做已读回执
      this.startMessageWatch();
      this.markRead();
      
      // 9. 添加欢迎消息
      if (this.data.messages.length === 0) {
        await this.addWelcomeMessage();
      }
      
    } catch (error) {
      console.error('初始化失败:', error);
      this.handleInitError();
    } finally {
      this.setData({ isLoading: false });
      this.scrollToBottom();
    }
  },

  // 获取当前用户信息
  async getCurrentUserInfo() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getUserInfo' });
      if (!result || !result.success || !result.data) throw new Error('getUserInfo 失败');
      const u = result.data;
      const avatar = await this.fixImageUrl(u.avatar || u.avatarUrl || '');
      return {
        userId: u.openid,
        nickname: u.nickname || '我',
        avatar: avatar || 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png',
        college: u.college || ''
      };
    } catch (error) {
      console.error('获取当前用户信息失败:', error);
      return {
        nickname: '我',
        avatar: 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png',
        userId: null,
        college: ''
      };
    }
  },

  // 通过openid获取用户ID
  async getUserIdByOpenid(openid) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('users')
        .where({ _openid: openid })
        .limit(1)
        .get();
      
      if (res.data.length > 0) {
        return res.data[0]._id;
      }
    } catch (error) {
      console.error('通过openid获取用户ID失败:', error);
    }
    return null;
  },

  // 获取聊天数据
  async getChatData(options, currentUserInfo) {
    if (options.chatId && options.userId) {
      // 从会话列表跳转（简化参数）
      const sellerDetails = await this.getUserInfo(options.userId);
      const sellerInfo = {
        nickname: sellerDetails?.nickname || sellerDetails?.nickName || '商家',
        avatar: sellerDetails?.avatar || sellerDetails?.avatarUrl || 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png',
        userId: options.userId,
        college: sellerDetails?.college || ''
      };
      return { sellerInfo, postInfo: null, presetChatId: options.chatId };
    } else if (options.targetUserId) {
      // 从个人主页等入口跳转，可能同时带有 targetNickname
      const targetOpenid = await this.resolveToOpenid(options.targetUserId) || options.targetUserId;
      const nicknameFromOptions = options.targetNickname ? decodeURIComponent(options.targetNickname) : '';
      const sellerDetails = await this.getUserInfo(options.targetUserId);
      const sellerInfo = {
        nickname: sellerDetails?.nickname || sellerDetails?.nickName || nicknameFromOptions || '用户',
        avatar: sellerDetails?.avatar || sellerDetails?.avatarUrl || this.getDefaultAvatar(),
        userId: targetOpenid,
        college: sellerDetails?.college || ''
      };
      return { sellerInfo, postInfo: null, presetChatId: null };
    } else if (options.chatData) {
      return await this.handleChatListEntry(options);
    } else if (options.postId) {
      return await this.handleProductDetailEntry(options);
    }
    return {
      sellerInfo: { 
        nickname: '商家', 
        avatar: 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png', 
        userId: null, 
        college: '' 
      },
      postInfo: null,
      presetChatId: null
    };
  },

  // 从聊天列表进入
  async handleChatListEntry(options) {
    try {
      const chatData = JSON.parse(decodeURIComponent(options.chatData));
      console.log('解析后的聊天数据:', chatData);
      
      // 获取卖家信息（兼容 sellerId 与 publisherId 两种来源），并统一为 openid
      let sellerInfo;
      if (chatData.sellerId) {
        const sellerOpenid = await this.resolveToOpenid(chatData.sellerId) || chatData.sellerId;
        const sellerDetails = await this.getUserInfo(chatData.sellerId);
        sellerInfo = {
          nickname: sellerDetails?.nickname || chatData.sellerNickname || '商家',
          avatar: sellerDetails?.avatar || chatData.sellerAvatar || 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png',
          userId: sellerOpenid,
          college: sellerDetails?.college || chatData.sellerCollege || ''
        };
      } else if (chatData.publisherId) {
        // 详情页 onChat 传入的是 publisherId/publisherName，可能为 users._id；做 openid 映射
        const sellerOpenid = await this.resolveToOpenid(chatData.publisherId) || chatData.publisherId;
        sellerInfo = {
          nickname: chatData.publisherName || '商家',
          avatar: chatData.sellerAvatar || 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png',
          userId: sellerOpenid,
          college: chatData.sellerCollege || ''
        };
      } else {
        sellerInfo = {
          nickname: chatData.sellerNickname || '商家',
          avatar: chatData.sellerAvatar || 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png',
          userId: null,
          college: chatData.sellerCollege || ''
        };
      }
      
      // 获取商品信息
      let postInfo = null;
      if (chatData.postId) {
        postInfo = await this.getPostInfo(chatData.postId);
        if (!postInfo) {
          postInfo = {
            id: chatData.postId,
            title: chatData.postTitle || '相关商品',
            price: chatData.postPrice,
            images: chatData.postImage ? [await this.fixImageUrl(chatData.postImage)] : []
          };
        }
      }

      
      return { sellerInfo, postInfo };
    } catch (error) {
      console.error('处理聊天列表数据失败:', error);
      throw error;
    }
  },

  // 从商品详情页进入
  async handleProductDetailEntry(options) {
    // 获取商品信息
    const postInfo = await this.getPostInfo(options.postId);
    
    // 获取卖家信息
    let sellerInfo;
    if (postInfo) {
      sellerInfo = {
        nickname: postInfo.sellerName || '商家',
        avatar: postInfo.sellerAvatar || 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png',
        college: postInfo.sellerCollege || '',
        // 统一使用 openid：优先使用 publisherOpenid，其次将 sellerId(可能为 users._id) 映射为 openid
        userId: postInfo.publisherOpenid || null
      };
      if (!sellerInfo.userId && postInfo.sellerId) {
        sellerInfo.userId = await this.resolveToOpenid(postInfo.sellerId);
      }
      
      // 如果商品信息中有sellerId但没有详细卖家信息，尝试获取卖家详情
      if ((postInfo.publisherOpenid || postInfo.sellerId) && !postInfo.sellerName) {
        const preferId = postInfo.publisherOpenid || postInfo.sellerId;
        const sellerDetails = await this.getSellerInfo(preferId);
        if (sellerDetails) {
          sellerInfo = {
            ...sellerInfo,
            nickname: sellerDetails.nickname || sellerInfo.nickname,
            avatar: sellerDetails.avatar || sellerInfo.avatar,
            college: sellerDetails.college || sellerInfo.college,
            userId: sellerDetails.userId || sellerInfo.userId
          };
        }
      }
    } else {
      sellerInfo = { 
        nickname: '商家', 
        avatar: 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png', 
        userId: null, 
        college: '' 
      };
    }
    
    return { sellerInfo, postInfo };
  },

  // 获取卖家信息
  async getSellerInfo(sellerId) {
    try {
      const db = wx.cloud.database();
      // sellerId 可能是 users._id 或 openid；优先用 doc(id) 取，不行则按 openid 查
      let userDoc = null;
      try {
        const byDoc = await db.collection('users').doc(sellerId).get();
        userDoc = byDoc.data;
      } catch (_) {}
      if (!userDoc) {
        const byOpenid = await db.collection('users').where({ openid: sellerId }).limit(1).get();
        userDoc = (byOpenid.data && byOpenid.data[0]) || null;
      }

      if (userDoc) {
        return {
          nickname: userDoc.nickname || userDoc.nickName || '商家',
          avatar: userDoc.avatar || userDoc.avatarUrl || 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png',
          // 统一返回 openid
          userId: userDoc.openid || userDoc._openid || null,
          college: userDoc.college || ''
        };
      }
    } catch (error) {
      console.error('获取卖家信息失败:', error);
    }
    
    return { 
      nickname: '商家', 
      avatar: 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png', 
      userId: await this.resolveToOpenid(sellerId) || sellerId, 
      college: '' 
    };
  },

  // 获取用户信息
  async getUserInfo(userId) {
    try {
      const db = wx.cloud.database();
      // 兼容传入的是 users._id 或 openid
      let userDoc = null;
      try {
        const byDoc = await db.collection('users').doc(userId).get();
        userDoc = byDoc.data;
      } catch (_) {}
      if (!userDoc) {
        const byOpenid = await db.collection('users').where({ openid: userId }).limit(1).get();
        userDoc = (byOpenid.data && byOpenid.data[0]) || null;
      }
      return userDoc;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  },

  // 获取商品信息
  async getPostInfo(postId) {
    try {
      const db = wx.cloud.database();
      const postRes = await db.collection('POST').doc(postId).get();
      return this.formatPostInfo(postRes.data);
    } catch (error) {
      console.error('获取商品信息失败:', error);
      return null;
    }
  },

  // 格式化商品信息
  formatPostInfo(postData) {
    if (!postData) return null;
    
    const publisherInfo = postData.publisherInfo || {};
    
    return {
      id: postData._id,
      title: postData.title || '相关商品',
      price: postData.price || 0,
      images: postData.images || [],
      sellerId: postData.publisherId,
      sellerName: publisherInfo.nickname || '商家',
      sellerAvatar: publisherInfo.avatar || 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png',
      sellerCollege: publisherInfo.college || '',
      publisherOpenid: postData.publisherOpenid
    };
  },

  // 初始化错误处理
  async handleInitError() {
    wx.showToast({ title: '聊天初始化失败', icon: 'none' });
    
    const avatarUrl = this.getDefaultAvatar();
    
    this.setData({
      messages: [{ 
        text: '你好！有什么可以帮你的吗？', 
        sender: 'received', 
        time: this.formatTime(new Date()),
        avatar: avatarUrl
      }]
    });
  },

  // 获取或创建聊天会话
  async getOrCreateChatSession() {
    const { sellerInfo, currentUserInfo, postInfo } = this.data;
    
    if (!sellerInfo.userId || !currentUserInfo.userId) {
      console.log('用户信息不完整，跳过创建会话');
      return null;
    }
    
    try {
      const db = wx.cloud.database();
      
      const _ = db.command;
      // 查找现有聊天会话
      const chatSessionRes = await db.collection('chat_sessions')
        .where(
          _.and([
            _.or([
              { user1Id: currentUserInfo.userId, user2Id: sellerInfo.userId },
              { user1Id: sellerInfo.userId, user2Id: currentUserInfo.userId }
            ]),
            { postId: postInfo?.id || '' }
          ])
        )
        .limit(1)
        .get();
      
      if (chatSessionRes.data.length > 0) {
        console.log('找到现有聊天会话:', chatSessionRes.data[0]._id);
        return chatSessionRes.data[0]._id;
      }
      // 不在前端创建新会话，交由云函数 sendMessage 负责创建
      return null;
    } catch (error) {
      console.error('创建聊天会话失败:', error);
      return null;
    }
  },

  // 加载聊天历史
  async loadChatHistory() {
    const { sellerInfo, currentUserInfo, chatId } = this.data;
    
    if (!sellerInfo.userId || !currentUserInfo.userId) {
      console.log('用户信息不完整，跳过加载历史');
      return;
    }
    
    try {
      const db = wx.cloud.database();
      let chatRes;
      
      if (chatId) {
        chatRes = await db.collection('chat_messages')
          .where({ chatId })
          .orderBy('createTime', 'asc')
          .get();
      } else {
        chatRes = await db.collection('chat_messages')
          .where({
            $or: [
              { fromUserId: currentUserInfo.userId, toUserId: sellerInfo.userId },
              { fromUserId: sellerInfo.userId, toUserId: currentUserInfo.userId }
            ]
          })
          .orderBy('createTime', 'asc')
          .get();
      }
      
      // 处理消息数据
      const messages = [];
      for (const msg of chatRes.data) {
        const isSent = msg.fromUserId === currentUserInfo.userId;
        const avatarPath = isSent ? 
          (msg.fromUserAvatar || currentUserInfo.avatar) : 
          (msg.fromUserAvatar || sellerInfo.avatar);
        
        const avatarUrl = this.getDefaultAvatar();
        
        messages.push({
          id: msg._id,
          text: msg.content,
          sender: isSent ? 'sent' : 'received',
          time: this.formatTime(msg.createTime),
          avatar: avatarUrl,
          type: msg.type || 'text',
          createTime: msg.createTime,
          showTime: false
        });
      }
      // 插入时间分隔
      const decorated = this.decorateMessagesWithTime(messages);
      this.setData({ messages: decorated });
    } catch (error) {
      console.error('加载聊天记录失败:', error);
    }
  },

  // 添加欢迎消息
  async addWelcomeMessage() {
    const now = new Date();
    const avatarUrl = this.getDefaultAvatar();
    
    const welcomeMessage = {
      text: `你好！我是${this.data.sellerInfo.nickname}，有什么可以帮你的吗？`,
      sender: 'received',
      time: this.formatTime(now),
      avatar: avatarUrl
    };
    
    const updated = this.decorateAppend([...this.data.messages], welcomeMessage);
    this.setData({ messages: updated });
  },

  // 发送消息
  async sendMessage() {
    const messageText = this.data.inputValue.trim();
    if (!messageText) return;
    
    const now = new Date();
    const timeString = this.formatTime(now);
    
    // 1. 创建本地消息
    const newMessage = {
      id: `temp_${Date.now()}`,
      text: messageText,
      sender: 'sent',
      time: timeString,
      avatar: this.data.currentUserInfo.avatar,
      type: 'text',
      createTime: now,
      showTime: false
    };
    
    const updated = this.decorateAppend([...this.data.messages], newMessage);
    this.setData({
      messages: updated,
      inputValue: '',
      inputHeight: 44
    });
    
    this.scrollToBottom();
    
    try {
      // 2. 通过云函数发送消息，统一更新会话/未读
      const res = await wx.cloud.callFunction({
        name: 'sendMessage',
        data: {
          receiverId: this.data.sellerInfo.userId,
          type: 'text',
          content: messageText,
          postId: this.data.postInfo?.id || '',
          chatId: this.data.chatId || ''
        }
      });
      const { result } = res || {};
      if (result && result.success && result.chatId && !this.data.chatId) {
        this.setData({ chatId: result.chatId });
        this.startMessageWatch();
      }
    } catch (error) {
      console.error('发送失败:', error);
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  },

  // 保存消息到数据库
  async saveMessageToDatabase(content) {
    const { sellerInfo, currentUserInfo, chatId, postInfo } = this.data;
    
    if (!currentUserInfo.userId || !sellerInfo.userId) return;
    
    try {
      const db = wx.cloud.database();
      const now = new Date();
      
      const messageData = {
        content: content,
        fromUserId: currentUserInfo.userId,
        fromUserName: currentUserInfo.nickname,
        fromUserAvatar: currentUserInfo.avatar,
        toUserId: sellerInfo.userId,
        toUserName: sellerInfo.nickname,
        toUserAvatar: sellerInfo.avatar,
        chatId: chatId || '',
        postId: postInfo?.id || '',
        postTitle: postInfo?.title || '',
        type: 'text',
        isRead: false,
        createTime: now
      };
      
      const result = await db.collection('chat_messages').add({ data: messageData });
      
      // 更新会话
      if (chatId) {
        await db.collection('chat_sessions').doc(chatId).update({
          data: {
            lastMessage: content,
            lastMessageTime: now,
            unreadCount: db.command.inc(1)
          }
        });
      }
      
      return result._id;
    } catch (error) {
      console.error('保存消息失败:', error);
      throw error;
    }
  },

  // 已移除模拟商家回复，改为依赖实时监听

  // 生成商家回复
  generateSellerReplies(userMessage) {
    const lowerMsg = userMessage.toLowerCase();
    
    if (lowerMsg.includes('价格') || lowerMsg.includes('多少钱')) {
      return ['价格已经是最优惠了哦~', '诚心要的话可以小刀', '价格可以商量'];
    } else if (lowerMsg.includes('什么时候') || lowerMsg.includes('时间')) {
      return ['我一般下午和晚上都有时间', '看你方便，我时间比较灵活'];
    } else if (lowerMsg.includes('在哪') || lowerMsg.includes('地点')) {
      return ['可以在学校见面交易', '支持校内面交'];
    } else if (lowerMsg.includes('照片') || lowerMsg.includes('图片')) {
      return ['商品详情里有照片的', '需要的话我可以再拍一些细节图'];
    }
    
    return ['收到你的消息了！', '这个问题我需要查一下。', '好的，明白了。', '还有什么其他问题吗？'];
  },

  // ======== 实时与已读回执 ========
  startMessageWatch() {
    if (!this.data.chatId) return;
    const db = wx.cloud.database();
    this.msgWatcher && this.msgWatcher.close();
    this.msgWatcher = db.collection('chat_messages')
      .where({ chatId: this.data.chatId })
      .orderBy('createTime', 'asc')
      .watch({
        onChange: async snapshot => {
          // 全量刷新最简单稳妥
          await this.loadChatHistory();
          this.scrollToBottom();
          // 将发给我的未读标记为已读
          this.markRead();
        },
        onError: err => console.error('消息监听失败:', err)
      });
  },

  async markRead() {
    if (!this.data.chatId || !this.data.currentUserInfo.userId) return;
    const db = wx.cloud.database();
    const _ = db.command;
    try {
      await db.collection('chat_messages')
        .where({ chatId: this.data.chatId, toUserId: this.data.currentUserInfo.userId, isRead: false })
        .update({ data: { isRead: true } });
      await db.collection('chat_sessions').doc(this.data.chatId)
        .update({ data: { [`unread.${this.data.currentUserInfo.userId}`]: 0 } });
    } catch (e) {
      console.warn('更新已读失败:', e);
    }
  },

  // ==================== UI交互函数 ====================

  // 格式化时间
  formatTime(time) {
    if (!time) return '';
    const date = typeof time === 'string' ? new Date(time) : time;
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  onInput(e) {
    const v = e.detail.value || '';
    this.setData({ inputValue: v, canSend: v.trim().length > 0 });
  },

  // 点击头像进入个人主页
  onAvatarTap(e) {
    const userId = e.currentTarget.dataset.userid;
    if (!userId) {
      wx.showToast({ title: '用户信息缺失', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/me/profile/profile?userId=${encodeURIComponent(userId)}` });
  },

  // ==================== 时间分隔处理 ====================
  decorateMessagesWithTime(list) {
    const { timeSeparatorThresholdMinutes, useCenteredTimeSeparator } = this.data;
    if (!Array.isArray(list) || list.length === 0) return [];
    const result = [];
    let lastTime = null;
    for (const item of list) {
      if (item.type === 'time-separator') {
        result.push(item);
        continue;
      }
      const ts = new Date(item.createTime);
      if (!lastTime || (ts - lastTime) >= timeSeparatorThresholdMinutes * 60 * 1000) {
        if (useCenteredTimeSeparator) {
          result.push({
            id: `sep_${ts.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
            type: 'time-separator',
            text: this.formatTime(ts),
            createTime: ts
          });
        } else {
          item.showTime = true;
        }
      }
      result.push(item);
      if (item.type !== 'time-separator') {
        lastTime = ts;
      }
    }
    return result;
  },

  decorateAppend(current, newMsg) {
    const { timeSeparatorThresholdMinutes, useCenteredTimeSeparator } = this.data;
    const res = Array.isArray(current) ? [...current] : [];
    // 找到最后一个非分隔消息的时间
    let i = res.length - 1;
    let lastNonSepTime = null;
    while (i >= 0) {
      const it = res[i];
      if (it && it.type !== 'time-separator') {
        lastNonSepTime = new Date(it.createTime);
        break;
      }
      i--;
    }
    const ts = new Date(newMsg.createTime);
    if (!lastNonSepTime || (ts - lastNonSepTime) >= timeSeparatorThresholdMinutes * 60 * 1000) {
      if (useCenteredTimeSeparator) {
        res.push({
          id: `sep_${ts.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'time-separator',
          text: this.formatTime(ts),
          createTime: ts
        });
      } else {
        newMsg.showTime = true;
      }
    }
    res.push(newMsg);
    return res;
  },
  
  onInputLineChange(e) {
    const newHeight = Math.min(Math.max(e.detail.lineCount * 20 + 24, 44), 120);
    this.setData({ inputHeight: newHeight });
  },

  scrollToBottom() {
    setTimeout(() => this.setData({ scrollTop: 999999 }), 100);
  },
  
  // 卖家触发确认收货
  async triggerConfirmBubble() {
    const avatarUrl = await this.fixImageUrl(this.data.sellerInfo.avatar);
    
    const sellerMessage = {
      text: '请确认收货',
      sender: 'received',
      time: this.formatTime(new Date()),
      avatar: avatarUrl,
      isBubble: true,
      bubbleType: 'confirm'
    };
    
    this.setData({ 
      messages: [...this.data.messages, sellerMessage],
      showConfirmBubble: true 
    });
    this.scrollToBottom();
  },
  
  // 确认收货
  async onConfirmReceipt() {
    this.setData({ showConfirmBubble: false });
    
    const avatarUrl = this.getDefaultAvatar();
    
    const confirmMessage = {
      text: '确认收货成功',
      sender: 'sent',
      time: this.formatTime(new Date()),
      avatar: avatarUrl
    };
    
    this.setData({ messages: [...this.data.messages, confirmMessage] });
    this.scrollToBottom();
    
    // 显示评价气泡
    setTimeout(async () => {
      const sellerAvatarUrl = this.getDefaultAvatar();
      
      const sellerMessage = {
        text: '请评价本次交易',
        sender: 'received',
        time: this.formatTime(new Date()),
        avatar: sellerAvatarUrl,
        isBubble: true,
        bubbleType: 'rating'
      };
      
      this.setData({ 
        messages: [...this.data.messages, sellerMessage],
        showRatingBubble: true 
      });
      this.scrollToBottom();
    }, 500);
  },
  
  // 取消确认收货
  cancelConfirm() {
    this.setData({ showConfirmBubble: false });
  },
  
  // 评价内容输入
  onCommentInput(e) {
    this.setData({ comment: e.detail.value });
  },
  
  // 评价评分处理
  rateDesc(e) {
    this.setData({ 'ratingData.descScore': e.currentTarget.dataset.score });
  },
  rateTime(e) {
    this.setData({ 'ratingData.timeScore': e.currentTarget.dataset.score });
  },
  rateAttitude(e) {
    this.setData({ 'ratingData.attitudeScore': e.currentTarget.dataset.score });
  },

  // 获取默认评价语句
  getDefaultComment() {
    const { ratingData } = this.data;
    const totalScore = (ratingData.descScore + ratingData.timeScore + ratingData.attitudeScore) / 3;
    
    if (totalScore >= 4.5) return '非常满意的购物体验！商品质量很好，卖家服务态度也很棒！';
    if (totalScore >= 4) return '整体还不错，商品符合描述，交易过程顺利。';
    if (totalScore >= 3) return '交易完成，有一些小问题但整体可以接受。';
    return '交易已完成。';
  },

  // 提交评价
  async submitRating() {
    const { ratingData, comment } = this.data;
    
    if (ratingData.descScore === 0 || ratingData.timeScore === 0 || ratingData.attitudeScore === 0) {
      wx.showToast({ title: '请完成所有评价', icon: 'none' });
      return;
    }
    
    const finalComment = comment.trim() || this.getDefaultComment();
    
    const avatarUrl = await this.fixImageUrl(this.data.currentUserInfo.avatar);
    
    const ratingMessage = {
      text: `评价完成：${finalComment}`,
      sender: 'sent',
      time: this.formatTime(new Date()),
      avatar: avatarUrl
    };
    
    this.setData({
      showRatingBubble: false,
      ratingData: { descScore: 0, timeScore: 0, attitudeScore: 0 },
      comment: '',
      messages: [...this.data.messages, ratingMessage]
    });
    
    this.scrollToBottom();
    wx.showToast({ title: '评价成功', icon: 'success' });
  },
  
  // 取消评价
  cancelRating() {
    this.setData({
      showRatingBubble: false,
      ratingData: { descScore: 0, timeScore: 0, attitudeScore: 0 },
      comment: ''
    });
  },

  // 查看商品详情
  onViewProduct() {
    const { postInfo } = this.data;
    if (postInfo?.id) {
      wx.navigateTo({ url: `/pages/detail/detail?id=${postInfo.id}` });
    } else {
      wx.showToast({ title: '商品信息不完整', icon: 'none' });
    }
  },
    // 添加一个测试方法，确保getSharedAvatar能正常工作
    async testGetSharedAvatar() {
      try {
        const testFileID = 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png';
        const url = await this.getSharedAvatar(testFileID);
        console.log('测试获取临时URL:', url);
        return url;
      } catch (error) {
        console.error('测试失败:', error);
        return null;
      }
    }
});