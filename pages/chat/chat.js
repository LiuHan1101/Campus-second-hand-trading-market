// pages/chat/chat.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    colors: app.globalData.colors,
    chatList: [],
    userInfo: null,
    isLoading: false,
    hasMore: true
  },

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    this.loadChatList();
  },

  onPullDownRefresh() {
    this.loadChatList().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 检查用户登录状态
  async checkLogin() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });
      
      if (result && result.userInfo) {
        this.setData({
          userInfo: result.userInfo
        });
        await this.saveUserInfo(result.userInfo);
      } else {
        throw new Error('用户信息获取失败');
      }
    } catch (error) {
      console.error('登录检查失败:', error);
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      });
    }
  },

  // 保存用户信息到云数据库
  async saveUserInfo(userInfo) {
    try {
      const res = await db.collection('users').where({
        openId: userInfo.openId
      }).get();
      
      if (res.data.length === 0) {
        await db.collection('users').add({
          data: {
            openId: userInfo.openId,
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate(),
            lastActive: db.serverDate()
          }
        });
      } else {
        await db.collection('users').where({
          openId: userInfo.openId
        }).update({
          data: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            updatedAt: db.serverDate(),
            lastActive: db.serverDate()
          }
        });
      }
    } catch (error) {
      console.error('保存用户信息失败:', error);
    }
  },

  // 从云数据库加载聊天列表
  async loadChatList() {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    
    try {
      // 获取当前用户ID
      const { result } = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });
      
      if (!result || !result.openId) {
        throw new Error('用户ID获取失败');
      }

      // 查询聊天会话
      const chatsRes = await db.collection('chats')
        .where({
          participants: db.command.in([result.openId]),
          isActive: true // 只查询活跃的聊天
        })
        .orderBy('lastMessageTime', 'desc')
        .get();
      
      const chatList = [];
      
      for (let chat of chatsRes.data) {
        const otherUserId = chat.participants.find(id => id !== result.openId);
        
        if (otherUserId) {
          try {
            const userRes = await db.collection('users').doc(otherUserId).get();
            
            if (userRes.data) {
              chatList.push({
                id: chat._id,
                userId: otherUserId,
                username: userRes.data.nickName || '未知用户',
                avatar: userRes.data.avatarUrl || '/images/default-avatar.png',
                lastMessage: chat.lastMessage || '暂无消息',
                lastTime: this.formatTime(chat.lastMessageTime || chat.updatedAt),
                unreadCount: chat.unreadCount || 0
              });
            }
          } catch (userError) {
            console.error('获取用户信息失败:', userError);
            // 跳过此聊天记录
            continue;
          }
        }
      }
      
      this.setData({
        chatList: chatList,
        isLoading: false
      });
      
    } catch (error) {
      console.error('加载聊天列表失败:', error);
      this.setData({ isLoading: false });
      
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      
      // 使用模拟数据作为降级方案
      this.loadMockData();
    }
  },

  // 格式化时间显示
  formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60 * 1000) {
      return '刚刚';
    } else if (diff < 60 * 60 * 1000) {
      return Math.floor(diff / (60 * 1000)) + '分钟前';
    } else if (diff < 24 * 60 * 60 * 1000) {
      return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前';
    } else {
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
  },

  // 模拟数据（降级方案）
  loadMockData() {
    const mockChatList = [
      {
        id: 'mock-1',
        userId: 'mock-user-1',
        username: "张三",
        avatar: "/images/default-avatar.png",
        lastMessage: "你好，这个物品还在吗？",
        lastTime: "10:30",
        unreadCount: 2
      },
      {
        id: 'mock-2',
        userId: 'mock-user-2',
        username: "李四",
        avatar: "/images/default-avatar.png",
        lastMessage: "请问什么时候可以交易？",
        lastTime: "昨天",
        unreadCount: 0
      }
    ];
    
    this.setData({
      chatList: mockChatList
    });
  },

  // 跳转到聊天详情页
  goToChatDetail(e) {
    const { chatid, userid } = e.currentTarget.dataset;
    
    if (!chatid || !userid) {
      wx.showToast({
        title: '聊天信息错误',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/chatdetail/chatdetail?chatId=${chatid}&userId=${userid}`
    });
  },

  // 跳转到搜索页面
  //goToChatDetail() {
    //wx.navigateTo({
     // url: '/pages/chatdetail/chatdetail'
   // });
  //},

  // 图片加载失败处理
  onAvatarError(e) {
    const index = e.currentTarget.dataset.index;
    const key = `chatList[${index}].avatar`;
    this.setData({
      [key]: '/images/default-avatar.png'
    });
  }
});
