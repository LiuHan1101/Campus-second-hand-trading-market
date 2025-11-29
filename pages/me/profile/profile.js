// pages/me/profile/profile.js
Page({
    data: {
      userInfo: {
        nickname: '加载中...',
        avatar: '/images/avatar.png',
        college: '',
        bio: '',
        joinDays: 0,
        creditScore: 4.7,
        tags: ['靠谱卖家', '交易爽快', '描述相符'],
        activeGoodsTab: 'published',
        publishedGoods: [],  // 发布商品
        wishGoods: []        // 许愿商品
      },
      // 评价数据
      ratingScore: 4.7,
      commentCount: 23,
      comments: [
        { id: 1, user: '小明同学', content: '卖家很靠谱，物品描述准确！' },
        { id: 2, user: '小红学姐', content: '交易很愉快，包装很用心～' },
        { id: 3, user: '学弟小张', content: '价格实惠，物超所值！' },
        { id: 4, user: '李同学', content: '沟通很顺畅，推荐！' },
        { id: 5, user: '王学长', content: '物品保存得很好，很满意！' }
      ],
      // 商品数据
      activeGoodsTab: 'published',
      publishedGoods: [],
      wishGoods: []
    },
  
    onLoad() {
      this.loadUserData();
      this.loadUserGoods();
      this.loadUserWishes();
    },
  
    // 加载用户数据
    async loadUserData() {
      try {
        // 从缓存或全局数据获取用户信息
        const cachedUserInfo = wx.getStorageSync('userInfo');
        if (cachedUserInfo) {
          this.setData({
            userInfo: {
              ...this.data.userInfo,
              ...cachedUserInfo
            }
          });
        }
  
        // 从云数据库加载最新用户信息
        const db = wx.cloud.database();
        const userResult = await db.collection('users')
          .orderBy('createTime', 'desc')
          .limit(1)
          .get();
  
        if (userResult.data.length > 0) {
          const userData = userResult.data[0];
          const newUserInfo = {
            nickname: userData.nickname || '上财同学',
            avatar: userData.avatarUrl || userData.avatar || '/images/avatar.png',
            college: userData.college || '未知学院',
            bio: userData.bio || '',
            joinDays: this.calculateJoinDays(userData.createTime) || 0,
            creditScore: userData.creditScore || 4.7,
            tags: userData.tags || ['新用户']
          };
  
          this.setData({ userInfo: newUserInfo });
          wx.setStorageSync('userInfo', newUserInfo);
        }
      } catch (error) {
        console.error('加载用户数据失败:', error);
      }
    },
  
    // 加载用户发布的商品
    async loadUserGoods() {
      try {
        const db = wx.cloud.database();
        const result = await db.collection('POST')
          .where({
            status: 'selling'
          })
          .orderBy('createTime', 'desc')
          .get();
  
        const processedGoods = this.processGoodsData(result.data);
        this.setData({ publishedGoods: processedGoods });
      } catch (error) {
        console.error('加载用户商品失败:', error);
        // 使用模拟数据
        this.setData({
        publishedGoods: [
            {
              id: 1,
              title: '九成新AirPods耳机',
              price: 299,
              image: '/images/demo1.jpg',
              transactionType: 'cash',
              description: '音质很好，几乎没用过'
            },
            {
              id: 2,
              title: 'Java编程思想教材',
              price: 25,
              image: '/images/demo2.jpg',
              transactionType: 'both',
              description: '大二课本，有详细笔记'
            }
          ]
        });
      }
    },
  
    // 加载用户愿望
    async loadUserWishes() {
      try {
        const db = wx.cloud.database();
        const result = await db.collection('wishes')
          .where({
            status: 'pending'
          })
          .orderBy('createTime', 'desc')
          .get();
  
        this.setData({ wishGoods: result.data });
      } catch (error) {
        console.error('加载用户愿望失败:', error);
        // 使用模拟数据
        this.setData({
          wishGoods: [
            {
              id: 1,
              title: '求线性代数课本',
              description: '需要一本线性代数教材，最好是新版',
              maxPrice: 20,
              expectedItem: '高等数学课本或其他数学教材'
            },
            {
              id: 2,
              title: '想要一个台灯',
              description: '宿舍用，希望光线柔和',
              maxPrice: 0,
              expectedItem: '闲置书籍或小物件'
            }
          ]
        });
      }
    },
  
    // 处理商品数据格式
    processGoodsData(goodsList) {
      return goodsList.map(item => ({
        id: item._id || item.id,
        title: item.title,
        description: item.description,
        price: parseFloat(item.price) || 0,
        image: item.images && item.images.length > 0 ? item.images[0] : '/images/default.jpg',
        transactionType: item.transactionType || 'cash'
      }));
    },
  
    // 计算加入天数
    calculateJoinDays(createTime) {
      if (!createTime) return 0;
      const createDate = new Date(createTime);
      const now = new Date();
      const diffTime = now - createDate;
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    },
  
    // 切换商品标签
    switchGoodsTab(e) {
      const tab = e.currentTarget.dataset.tab;
      this.setData({ activeGoodsTab: tab });
    },
  
    // 点击商品
    onGoodsTap(e) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({
        url: `/pages/detail/detail?id=${id}`
      });
    },
  
    // 点击愿望
    onWishTap(e) {
      const id = e.currentTarget.dataset.id;
      wx.showToast({
        title: '查看愿望详情',
        icon: 'none'
      });
    },
  
    // 发送私信
    onSendMessage() {
      wx.navigateTo({
        url: '/pages/chat/chat'
      });
    },
  
    // 添加标签
    onAddTag() {
      wx.showToast({
        title: '添加标签功能开发中',
        icon: 'none'
      });
    },
  
    // 图片加载失败处理
    onImageError(e) {
      const index = e.currentTarget.dataset.index;
      const key = `publishedGoods[${index}].image`;
      this.setData({
        [key]: '/images/default.jpg'
      });
    }
  });