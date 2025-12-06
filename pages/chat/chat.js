// pages/chat/chat.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    colors: app.globalData?.colors || {},
    chatList: [],
    me: null, // { openid, _id, nickname, avatar }
    isLoading: false
  },

  onLoad() {
    this.init();
  },

  onShow() {
    // 列表页实时监听在 init 中建立
  },

  onUnload() {
    this.sessionWatcher && this.sessionWatcher.close();
  },

  onPullDownRefresh() {
    this.loadChatList().finally(() => wx.stopPullDownRefresh());
  },

  async init() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getUserInfo' });
      if (!result || !result.success || !result.data || !result.data.openid) {
        throw new Error('获取用户信息失败');
      }
      const me = {
        openid: result.data.openid,
        _id: result.data._id || result.data.openid,
        nickname: result.data.nickname || '我',
        avatar: result.data.avatar || result.data.avatarUrl || '/miniprogram/images/avatar.png'
      };
      this.setData({ me });
      await this.loadChatList();
      this.startWatch();
    } catch (e) {
      console.error('初始化失败:', e);
      wx.showToast({ title: '登录失败', icon: 'none' });
    }
  },

  // 加载聊天会话列表（使用 chat_sessions 模型）
  async loadChatList() {
    if (this.data.isLoading || !this.data.me) return;
    this.setData({ isLoading: true });
    try {
      const me = this.data.me.openid;
      const sessRes = await db.collection('chat_sessions')
        .where(_.or([{ user1Id: me }, { user2Id: me }]))
        .orderBy('lastMessageTime', 'desc')
        .get();

      const sessions = sessRes.data || [];
      // 计算对端用户ID集合
      const otherIds = Array.from(new Set(sessions.map(s => (s.user1Id === me ? s.user2Id : s.user1Id)).filter(Boolean)));

      // 批量查询用户资料
      let usersMap = {};
      if (otherIds.length) {
        // 优先用 _id 命中；若有缺失则用 openid 补充，兼容历史数据
        const usersRes = await db.collection('users').where({ _id: _.in(otherIds) }).get();
        (usersRes.data || []).forEach(u => { usersMap[u._id] = u; });
        const hitIds = new Set((usersRes.data || []).map(u => u._id));
        const missing = otherIds.filter(id => !hitIds.has(id));
        if (missing.length) {
          const byOpenid = await db.collection('users').where({ openid: _.in(missing) }).get();
          (byOpenid.data || []).forEach(u => { usersMap[u.openid] = u; });
        }
      }

      const chatList = sessions.map(s => {
        const otherId = s.user1Id === me ? s.user2Id : s.user1Id;
        const u = usersMap[otherId] || {};
        const unread = (s.unread && (s.unread[me] || 0)) || 0;
        return {
          id: s._id,
          userId: otherId,
          username: u.nickname || u.nickName || '用户',
          // 暂时统一使用默认头像，保留入口便于后续恢复
          avatar: '/miniprogram/images/avatar.png',
          lastMessage: s.lastMessage || '暂无消息',
          lastTime: this.formatTime(s.lastMessageTime || s.createdAt),
          unreadCount: unread
        };
      });

      this.setData({ chatList, isLoading: false });
    } catch (e) {
      console.error('加载聊天列表失败:', e);
      this.setData({ isLoading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
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

  // 实时监听会话变更
  startWatch() {
    if (!this.data.me) return;
    const me = this.data.me.openid;
    this.sessionWatcher && this.sessionWatcher.close();
    this.sessionWatcher = db.collection('chat_sessions')
      .where(_.or([{ user1Id: me }, { user2Id: me }]))
      .orderBy('lastMessageTime', 'desc')
      .watch({
        onChange: () => this.loadChatList(),
        onError: err => console.error('会话监听失败:', err)
      });
  },

  // 跳转到聊天详情页
  goToChatDetail(e) {
    const { chatid, userid, index } = e.currentTarget.dataset;
    
    if (!chatid || !userid) {
      wx.showToast({
        title: '聊天信息错误',
        icon: 'none'
      });
      return;
    }

    // 进入会话前，先本地清零未读，改善视觉反馈
    if (typeof index === 'number') {
      const key = `chatList[${index}].unreadCount`;
      this.setData({ [key]: 0 });
    }

    // 同步清零会话未读计数到数据库（冗余保护，聊天页也会处理）
    this.clearUnread(chatid).catch(err => console.warn('清零未读失败(可忽略):', err));
    
    wx.navigateTo({
      url: `/pages/chatdetail/chatdetail?chatId=${chatid}&userId=${userid}`
    });
  },

  // 清零指定会话对当前用户的未读数
  async clearUnread(chatId) {
    if (!this.data.me || !chatId) return;
    const me = this.data.me.openid;
    try {
      await db.collection('chat_sessions').doc(chatId)
        .update({ data: { [`unread.${me}`]: 0 } });
    } catch (e) {
      throw e;
    }
  },

  // 长按删除会话
  async onLongPressChatItem(e) {
    const { chatid, index } = e.currentTarget.dataset;
    if (!chatid) return;

    try {
      const act = await wx.showActionSheet({ itemList: ['删除会话'] }).catch(() => null);
      if (!act || act.tapIndex !== 0) return;

      const confirm = await new Promise((resolve) => {
        wx.showModal({
          title: '确认删除',
          content: '将删除该会话及相关消息，且不可恢复。',
          confirmColor: '#E64340',
          success: (res) => resolve(res.confirm === true)
        });
      });
      if (!confirm) return;

      wx.showLoading({ title: '删除中', mask: true });

      // 1) 删除会话文档
      await db.collection('chat_sessions').doc(chatid).remove();

      // 2) 删除关联消息
      await db.collection('chat_messages').where({ chatId: chatid }).remove();

      wx.hideLoading();
      wx.showToast({ title: '已删除', icon: 'success' });

      // 3) 本地移除项（watcher也会刷新，先优化视觉反馈）
      if (typeof index === 'number') {
        const list = [...this.data.chatList];
        list.splice(index, 1);
        this.setData({ chatList: list });
      } else {
        // 兜底刷新
        this.loadChatList();
      }
    } catch (err) {
      console.error('删除会话失败:', err);
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  // 跳转到搜索页面（保留注释逻辑）
  // goToChatDetail() {
  //   wx.navigateTo({ url: '/pages/chatdetail/chatdetail' });
  // },

  // 图片加载失败处理
  onAvatarError(e) {
    const index = e.currentTarget.dataset.index;
    const key = `chatList[${index}].avatar`;
    this.setData({
      [key]: '/miniprogram/images/avatar.png'
    });
  }
});
