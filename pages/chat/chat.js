// pages/chat/chat.js
<<<<<<< HEAD
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
      url: `/pages/chat-detail/chat-detail?chatId=${chatId}`
    });
  },

  // 图片加载失败处理
  onAvatarError(e) {
    const index = e.currentTarget.dataset.index;
    const key = `chatList[${index}].avatar`;
    this.setData({
      [key]: '/images/default-avatar.png'
    });
  }
});
=======
Page({

  /**
<<<<<<< HEAD
   * 页面的初始数据
=======
<<<<<<< HEAD
   * 页面的初始数据testtest3
=======
   * 页面的初始数据
>>>>>>> wishpool
>>>>>>> 507142d3ec43d0e6e2ca63d076058a95feaa6f79
   */
  data: {

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})
>>>>>>> wishpool
