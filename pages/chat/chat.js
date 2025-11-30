// pages/chat/chat.js
const app = getApp();

Page({
  data: {
    colors: app.globalData.colors,
    chatList: []
  },

  onLoad() {
    this.loadChatList();
  },

  onShow() {
    // 每次显示页面时刷新聊天列表
    this.loadChatList();
  },

  // 加载聊天列表
  async loadChatList() {
    try {
      // 模拟数据 - 实际项目中从服务器获取
      const mockChatList = [
        {
          id: 1,
          username: "张三",
          avatar: "/images/avatar1.jpg",
          lastMessage: "你好，这个物品还在吗？",
          lastTime: "10:30",
          unreadCount: 2
        },
        {
          id: 2,
          username: "李四",
          avatar: "/images/avatar2.jpg",
          lastMessage: "我可以用我的书和你交换",
          lastTime: "昨天",
          unreadCount: 0
        },
        {
          id: 3,
          username: "王五",
          avatar: "/images/avatar3.jpg",
          lastMessage: "什么时候方便交易？",
          lastTime: "09-15",
          unreadCount: 5
        }
      ];

      this.setData({
        chatList: mockChatList
      });

      // 实际调用接口的代码：
      // const res = await app.request({
      //   url: '/chat/list',
      //   method: 'GET'
      // });
      // this.setData({ chatList: res.data });
      
    } catch (error) {
      console.error('加载聊天列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 跳转到聊天详情页
  goToChatDetail(e) {
    const chatId = e.currentTarget.dataset.chatid;
    wx.navigateTo({
      url: `/pages/chatdetail/chatdetail?chatId=${chatId}`
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
