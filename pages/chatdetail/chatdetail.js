// pages/chatdetail/chatdetail.js
Page({
  data: {
    messages: [],
    inputValue: '',
    scrollTop: 0,
    showConfirmBubble: false,
    showRatingBubble: false,
    comment: '',
    ratingData: { descScore: 0, timeScore: 0, attitudeScore: 0 },
    inputHeight: 44,
    safeAreaBottom: 0,
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
  
  // ==================== 图片处理相关函数 ====================
  
  // 图片URL缓存
  imageUrlCache: {},
  
  // 云函数调用缓存
  cloudFunctionCache: {},
  
  /**
   * 获取可共享的图片URL（使用云函数中转）
   * @param {string} fileID - 云存储文件ID
   * @returns {Promise<string>} - 临时URL
   */
  async getSharedAvatar(fileID) {
    // 检查缓存
    if (this.cloudFunctionCache[fileID]) {
      const cached = this.cloudFunctionCache[fileID];
      // 临时URL有效期2小时，缓存1.5小时
      if (Date.now() - cached.timestamp < 1.5 * 60 * 60 * 1000) {
        return cached.url;
      }
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'getPublicUrl',
        data: { fileID }
      });
      
      if (result.result.success) {
        // 缓存结果
        this.cloudFunctionCache[fileID] = {
          url: result.result.url,
          timestamp: Date.now()
        };
        return result.result.url;
      }
      return null;
    } catch (error) {
      console.error('获取头像失败:', error);
      return null;
    }
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
    return 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png';
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

  // ==================== 图片处理相关函数 ====================
  
  // 图片URL缓存
  imageUrlCache: {},

  // 修复图片URL（带缓存）
  async fixImageUrl(url) {
    if (!url) {
      return 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png';
    }
    
    // 检查缓存
    if (this.imageUrlCache[url]) {
      return this.imageUrlCache[url];
    }
    
    let result = url;
    
    // 如果是云存储路径，确保格式正确
    if (url.startsWith('cloud://')) {
      // 已经是云存储路径，直接返回
      result = url;
    } 
    // 如果是相对路径，转换为云存储路径
    else if (url.startsWith('/')) {
      // 移除开头的斜杠，构建云存储路径
      const path = url.substring(1);
      result = `cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/${path}`;
    }
    // 如果是网络URL，直接返回
    else if (url.startsWith('http')) {
      result = url;
    }
    // 其他情况，使用默认头像
    else {
      result = 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png';
    }
    
    // 如果是云存储路径，需要获取临时URL供image组件使用
    if (result.startsWith('cloud://')) {
      try {
        const tempUrl = await this.getTempFileURL(result);
        // 缓存临时URL
        this.imageUrlCache[url] = tempUrl;
        return tempUrl;
      } catch (error) {
        console.error('获取临时URL失败:', error);
        // 返回默认头像
        return 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png';
      }
    }
    
    // 缓存结果
    this.imageUrlCache[url] = result;
    return result;
  },

  // 批量处理图片URL（性能优化）
  async batchFixImageUrls(urls) {
    if (!urls || !Array.isArray(urls)) return [];
    
    const results = [];
    for (const url of urls) {
      try {
        const fixedUrl = await this.fixImageUrl(url);
        results.push(fixedUrl);
      } catch (error) {
        console.error('处理图片URL失败:', error);
        results.push('cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png');
      }
    }
    
    return results;
  },

  // 获取云存储临时URL
  async getTempFileURL(cloudPath) {
    try {
      const res = await wx.cloud.getTempFileURL({
        fileList: [cloudPath]
      });
      
      if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
        return res.fileList[0].tempFileURL;
      } else {
        throw new Error('获取临时URL失败');
      }
    } catch (error) {
      console.error('获取云存储临时URL失败:', error);
      // 返回默认头像的临时URL
      const defaultRes = await wx.cloud.getTempFileURL({
        fileList: ['cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png']
      });
      return defaultRes.fileList[0]?.tempFileURL || '';
    }
  },

  // ==================== 核心业务函数 ====================

  // 初始化聊天
  async initChat(options) {
    this.setData({ isLoading: true });
    
    try {
      // 1. 获取当前用户信息
      const currentUserInfo = await this.getCurrentUserInfo();
      
      // 2. 获取卖家和商品信息
      let { sellerInfo, postInfo } = await this.getChatData(options, currentUserInfo);
      
      // 3. 批量处理商品图片
      if (postInfo?.images?.length > 0) {
        postInfo.images = await this.batchFixImageUrls(postInfo.images);
      }
      
      // 4. 处理卖家头像
      sellerInfo.avatar = await this.fixImageUrl(sellerInfo.avatar);
      
      // 5. 设置数据
      this.setData({ 
        sellerInfo, 
        currentUserInfo, 
        postInfo, 
        chatId: null
      });
      
      // 6. 设置页面标题
      wx.setNavigationBarTitle({ title: `与${sellerInfo.nickname}聊天` });
      
      // 7. 创建聊天会话（如果有用户ID）
      if (sellerInfo.userId && currentUserInfo.userId) {
        const chatId = await this.getOrCreateChatSession();
        if (chatId) {
          this.setData({ chatId });
        }
      } else {
        console.log('用户信息不完整，使用本地聊天');
      }
      
      // 8. 加载历史消息
      await this.loadChatHistory();
      
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
      let userInfo = wx.getStorageSync('userInfo') || {};
      let userId = wx.getStorageSync('userId');
      
      // 如果本地存储没有用户信息，尝试从云数据库获取
      if (!userId && userInfo._openid) {
        userId = await this.getUserIdByOpenid(userInfo._openid);
        if (userId) {
          wx.setStorageSync('userId', userId);
        }
      }
      
      // 处理头像
      let avatar = userInfo.avatar || userInfo.avatarUrl || '';
      if (avatar) {
        avatar = await this.fixImageUrl(avatar);
      } else {
        avatar = 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png';
      }
      
      return {
        userId: userId || userInfo._id || null,
        nickname: userInfo.nickname || userInfo.nickName || '我',
        avatar: avatar,
        college: userInfo.college || ''
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
    if (options.chatData) {
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
      postInfo: null
    };
  },

  // 从聊天列表进入
  async handleChatListEntry(options) {
    try {
      const chatData = JSON.parse(decodeURIComponent(options.chatData));
      console.log('解析后的聊天数据:', chatData);
      
      // 获取卖家信息
      let sellerInfo;
      if (chatData.sellerId) {
        const sellerDetails = await this.getUserInfo(chatData.sellerId);
        sellerInfo = {
          nickname: sellerDetails?.nickname || chatData.sellerNickname || '商家',
          avatar: sellerDetails?.avatar || chatData.sellerAvatar || 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png',
          userId: chatData.sellerId,
          college: sellerDetails?.college || chatData.sellerCollege || ''
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
        userId: postInfo.sellerId || null
      };
      
      // 如果商品信息中有sellerId但没有详细卖家信息，尝试获取卖家详情
      if (postInfo.sellerId && !postInfo.sellerName) {
        const sellerDetails = await this.getSellerInfo(postInfo.sellerId);
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
      const userRes = await db.collection('users').doc(sellerId).get();
      
      if (userRes.data) {
        return {
          nickname: userRes.data.nickname || userRes.data.nickName || '商家',
          avatar: userRes.data.avatar || userRes.data.avatarUrl || 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png',
          userId: userRes.data._id,
          college: userRes.data.college || ''
        };
      }
    } catch (error) {
      console.error('获取卖家信息失败:', error);
    }
    
    return { 
      nickname: '商家', 
      avatar: 'cloud://cloud1-8gw6xrycfea6d00b.636c-cloud1-8gw6xrycfea6d00b-1321710631/images/default-avatar.png', 
      userId: sellerId, 
      college: '' 
    };
  },

  // 获取用户信息
  async getUserInfo(userId) {
    try {
      const db = wx.cloud.database();
      const userRes = await db.collection('users').doc(userId).get();
      return userRes.data;
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
    
    const avatarUrl = await this.fixImageUrl(this.data.sellerInfo.avatar);
    
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
      
      // 查找现有聊天会话
      const chatSessionRes = await db.collection('chat_sessions')
        .where({
          $or: [
            { user1Id: currentUserInfo.userId, user2Id: sellerInfo.userId, postId: postInfo?.id || '' },
            { user1Id: sellerInfo.userId, user2Id: currentUserInfo.userId, postId: postInfo?.id || '' }
          ]
        })
        .get();
      
      if (chatSessionRes.data.length > 0) {
        console.log('找到现有聊天会话:', chatSessionRes.data[0]._id);
        return chatSessionRes.data[0]._id;
      } else {
        // 创建新会话
        const newSession = {
          user1Id: currentUserInfo.userId,
          user1Name: currentUserInfo.nickname,
          user1Avatar: currentUserInfo.avatar,
          user2Id: sellerInfo.userId,
          user2Name: sellerInfo.nickname,
          user2Avatar: sellerInfo.avatar,
          postId: postInfo?.id || '',
          postTitle: postInfo?.title || '',
          lastMessage: '',
          lastMessageTime: new Date(),
          unreadCount: 0,
          createTime: new Date()
        };
        
        const addRes = await db.collection('chat_sessions').add({ data: newSession });
        console.log('创建新聊天会话成功:', addRes._id);
        return addRes._id;
      }
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
        
        const avatarUrl = await this.fixImageUrl(avatarPath);
        
        messages.push({
          id: msg._id,
          text: msg.content,
          sender: isSent ? 'sent' : 'received',
          time: this.formatTime(msg.createTime),
          avatar: avatarUrl,
          type: msg.type || 'text',
          createTime: msg.createTime
        });
      }
      
      this.setData({ messages });
    } catch (error) {
      console.error('加载聊天记录失败:', error);
    }
  },

  // 添加欢迎消息
  async addWelcomeMessage() {
    const now = new Date();
    const avatarUrl = await this.fixImageUrl(this.data.sellerInfo.avatar);
    
    const welcomeMessage = {
      text: `你好！我是${this.data.sellerInfo.nickname}，有什么可以帮你的吗？`,
      sender: 'received',
      time: this.formatTime(now),
      avatar: avatarUrl
    };
    
    this.setData({ messages: [...this.data.messages, welcomeMessage] });
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
      createTime: now
    };
    
    this.setData({
      messages: [...this.data.messages, newMessage],
      inputValue: '',
      inputHeight: 44
    });
    
    this.scrollToBottom();
    
    try {
      // 2. 保存消息到数据库
      await this.saveMessageToDatabase(messageText);
      
      // 3. 模拟商家回复
      setTimeout(() => this.simulateSellerReply(), 1000);
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

  // 模拟商家回复
  async simulateSellerReply() {
    const { sellerInfo } = this.data;
    if (!sellerInfo.userId) return;
    
    const now = new Date();
    const lastMessage = this.data.messages[this.data.messages.length - 1];
    const replies = this.generateSellerReplies(lastMessage.text);
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    
    const avatarUrl = await this.fixImageUrl(sellerInfo.avatar);
    
    const replyMessage = {
      id: `temp_${Date.now()}`,
      text: randomReply,
      sender: 'received',
      time: this.formatTime(now),
      avatar: avatarUrl,
      type: 'text',
      createTime: now
    };
    
    this.setData({ messages: [...this.data.messages, replyMessage] });
    this.scrollToBottom();
    
    // 保存商家回复
    try {
      const db = wx.cloud.database();
      const messageData = {
        content: randomReply,
        fromUserId: sellerInfo.userId,
        fromUserName: sellerInfo.nickname,
        fromUserAvatar: sellerInfo.avatar,
        toUserId: this.data.currentUserInfo.userId,
        toUserName: this.data.currentUserInfo.nickname,
        toUserAvatar: this.data.currentUserInfo.avatar,
        chatId: this.data.chatId || '',
        postId: this.data.postInfo?.id || '',
        postTitle: this.data.postInfo?.title || '',
        type: 'text',
        isRead: false,
        createTime: now
      };
      
      await db.collection('chat_messages').add({ data: messageData });
      
      if (this.data.chatId) {
        await db.collection('chat_sessions').doc(this.data.chatId).update({
          data: {
            lastMessage: randomReply,
            lastMessageTime: now,
            unreadCount: db.command.inc(1)
          }
        });
      }
    } catch (error) {
      console.error('保存商家回复失败:', error);
    }
  },

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

  // ==================== UI交互函数 ====================

  // 格式化时间
  formatTime(time) {
    if (!time) return '';
    const date = typeof time === 'string' ? new Date(time) : time;
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
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
    
    const avatarUrl = await this.fixImageUrl(this.data.currentUserInfo.avatar);
    
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
      const sellerAvatarUrl = await this.fixImageUrl(this.data.sellerInfo.avatar);
      
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