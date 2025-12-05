// pages/me/profile/profile.js
Page({
  data: {
    // 加载状态
    isLoading: true,
    isLoadingGoods: false,
    isLoadingWishes: false,
    showEmptyGoods: false,
    showEmptyWishes: false,
    
    // 用户身份标识
    isViewOtherUser: false,
    targetOpenId: null,
    targetUserId: null,
    
    // 用户信息
    userInfo: {
      nickname: '加载中...',
      avatar: '/images/avatar.png',
      college: '',
      bio: '',
      joinDays: 0,
      creditScore: 4.7,
      tags: ['加载中...']
    },
    
    // 商品数据
    activeGoodsTab: 'published',
    publishedGoods: [],
    wishGoods: [],
    
    // 评价数据
    ratingScore: 4.7,
    commentCount: 0,
    comments: []
  },

  onLoad(options) {
    console.log('个人主页加载，参数:', options);
    
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1500
      });
    }

    if (options.userId) {
      console.log('查看其他用户:', options.userId);
      this.setData({ 
        isViewOtherUser: true, 
        targetUserId: options.userId,
        isLoading: true 
      });
      this.loadOtherUserData(options.userId);
    } else {
      console.log('查看自己的主页，openid:', openid);
      this.setData({ 
        isViewOtherUser: false, 
        targetOpenId: openid,
        isLoading: true 
      });
      this.loadUserData();
      this.loadUserGoods();
      this.loadUserWishes();
    }
  },

  async loadUserData() {
    try {
      const openid = this.data.targetOpenId || wx.getStorageSync('openid');
      if (!openid) {
        console.log('未找到openid');
        this.setData({ isLoading: false });
        return;
      }

      console.log('加载用户数据，openid:', openid);

      const cachedUserInfo = wx.getStorageSync('userInfo');
      const db = wx.cloud.database();
      const _ = db.command;
      
      const userResult = await db.collection('users')
        .where(_.or([
          { _openid: openid },
          { openid: openid }
        ]))
        .get();

      console.log('用户查询结果:', userResult);

      if (userResult.data.length > 0) {
        const userData = userResult.data[0];
        
        const newUserInfo = {
          nickname: userData.nickname || userData.nickName || cachedUserInfo?.nickname || '上财同学',
          avatar: userData.avatar || userData.avatarUrl || cachedUserInfo?.avatar || '/images/avatar.png',
          college: userData.college || cachedUserInfo?.college || '未知学院',
          bio: userData.bio || cachedUserInfo?.bio || '',
          joinDays: this.calculateJoinDays(userData.createTime || cachedUserInfo?.createTime || userData.joinTime) || 1,
          creditScore: userData.creditScore || 4.7,
          tags: userData.tags || cachedUserInfo?.tags || ['新用户'],
          _id: userData._id,
          openid: userData.openid || userData._openid
        };

        console.log('处理后的用户信息:', newUserInfo);

        this.setData({ 
          userInfo: newUserInfo,
          isLoading: false 
        });

        if (!this.data.isViewOtherUser) {
          const cacheData = {
            ...userData,
            ...newUserInfo
          };
          wx.setStorageSync('userInfo', cacheData);
          
          const app = getApp();
          if (app && app.globalData) {
            app.globalData.userInfo = cacheData;
          }
        }
      } else {
        console.log('未找到用户数据');
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            nickname: '用户不存在',
            college: '',
            bio: '',
            tags: ['未找到用户']
          },
          isLoading: false
        });
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  async loadOtherUserData(userId) {
    try {
      console.log('加载其他用户数据，userId:', userId);
      
      const db = wx.cloud.database();
      
      const userResult = await db.collection('users').doc(userId).get();
      
      console.log('其他用户查询结果:', userResult);
      
      if (userResult.data) {
        const userData = userResult.data;
        
        const newUserInfo = {
          nickname: userData.nickname || userData.nickName || '上财同学',
          avatar: userData.avatar || userData.avatarUrl || '/images/avatar.png',
          college: userData.college || '未知学院',
          bio: userData.bio || '',
          joinDays: this.calculateJoinDays(userData.createTime || userData.joinTime) || 1,
          creditScore: userData.creditScore || 4.7,
          tags: userData.tags || ['该用户暂无标签'],
          _id: userData._id,
          openid: userData.openid || userData._openid
        };
        
        this.setData({ 
          userInfo: newUserInfo,
          targetOpenId: userData.openid || userData._openid,
          isLoading: false 
        });
        
        this.loadUserGoods();
        this.loadUserWishes();
      } else {
        console.log('未找到其他用户数据');
        this.setData({ 
          userInfo: {
            ...this.data.userInfo,
            nickname: '用户不存在',
            bio: '无法加载用户信息'
          },
          isLoading: false 
        });
      }
    } catch (error) {
      console.error('加载其他用户数据失败:', error);
      this.setData({ 
        userInfo: {
          ...this.data.userInfo,
          nickname: '加载失败',
          bio: '无法加载用户信息'
        },
        isLoading: false 
      });
      wx.showToast({
        title: '加载用户信息失败',
        icon: 'none'
      });
    }
  },

  async loadUserGoods() {
    try {
      const openid = this.data.targetOpenId || wx.getStorageSync('openid');
      if (!openid) {
        console.log('未找到openid，跳过加载商品');
        this.setData({ 
          publishedGoods: [],
          showEmptyGoods: true,
          isLoadingGoods: false 
        });
        return;
      }

      console.log('加载用户商品，openid:', openid);
      
      this.setData({ isLoadingGoods: true });
      
      const db = wx.cloud.database();
      const _ = db.command;
      
      const result = await db.collection('POST')
        .where(_.and([
          _.or([
            { _openid: openid },
            { openid: openid }
          ]),
          { status: 'selling' },
          _.or([
            { switch: _.neq('wish') },
            { switch: _.exists(false) }
          ])
        ]))
        .orderBy('createTime', 'desc')
        .limit(20)
        .get();

      console.log('商品查询结果:', result);

      if (result.data.length === 0) {
        console.log('用户没有发布的商品');
        this.setData({ 
          publishedGoods: [],
          showEmptyGoods: true,
          isLoadingGoods: false 
        });
      } else {
        const processedGoods = this.processGoodsData(result.data);
        console.log('处理后的商品数据:', processedGoods);
        this.setData({ 
          publishedGoods: processedGoods,
          showEmptyGoods: false,
          isLoadingGoods: false 
        });
      }
    } catch (error) {
      console.error('加载用户商品失败:', error);
      this.setData({ 
        publishedGoods: [],
        showEmptyGoods: true,
        isLoadingGoods: false 
      });
      
      wx.showToast({
        title: '加载商品失败',
        icon: 'none'
      });
    }
  },

  async loadUserWishes() {
    try {
      const openid = this.data.targetOpenId || wx.getStorageSync('openid');
      if (!openid) {
        console.log('未找到openid，跳过加载愿望');
        this.setData({ 
          wishGoods: [],
          showEmptyWishes: true,
          isLoadingWishes: false 
        });
        return;
      }

      console.log('加载用户愿望，openid:', openid);
      
      this.setData({ isLoadingWishes: true });
      
      const db = wx.cloud.database();
      
      // 主要修复：简化查询条件
      console.log('尝试查询用户愿望数据');
      
      // 方案1：直接使用_openid和switch字段查询
      let result;
      try {
        result = await db.collection('POST')
          .where({
            _openid: openid,  // 直接使用_openid
            switch: 'wish'    // 只要求是愿望类型
            // 不指定status，因为愿望可能没有status字段或状态不同
          })
          .orderBy('createTime', 'desc')
          .limit(20)
          .get();
        
        console.log('愿望查询结果:', result);
      } catch (queryError) {
        console.log('方案1查询失败:', queryError);
        
        // 方案2：尝试不指定_openid，只查询switch为wish的记录
        try {
          result = await db.collection('POST')
            .where({
              switch: 'wish'
            })
            .orderBy('createTime', 'desc')
            .limit(20)
            .get();
          
          console.log('方案2查询结果（所有愿望）:', result);
          
          // 在本地过滤出当前用户的数据
          if (result.data.length > 0) {
            console.log('找到愿望记录，需要过滤出当前用户的');
            const filteredData = result.data.filter(item => {
              const itemOpenId = item._openid || item.openid;
              return itemOpenId === openid;
            });
            
            result.data = filteredData;
            console.log('过滤后的愿望数据:', filteredData);
          }
        } catch (error2) {
          console.log('方案2查询失败:', error2);
        }
      }

      if (result && result.data.length > 0) {
        const processedWishes = this.processWishesData(result.data);
        console.log('处理后的愿望数据:', processedWishes);
        this.setData({ 
          wishGoods: processedWishes,
          showEmptyWishes: false,
          isLoadingWishes: false 
        });
      } else {
        console.log('用户没有愿望');
        
        // 测试：检查数据库中是否有任何愿望记录
        try {
          const testResult = await db.collection('POST')
            .where({
              switch: 'wish'
            })
            .limit(1)
            .get();
          
          console.log('测试查询数据库中的愿望记录:', testResult);
          if (testResult.data.length > 0) {
            console.log('数据库中存在愿望记录，第一条记录:', testResult.data[0]);
            console.log('第一条记录的_openid:', testResult.data[0]._openid);
            console.log('当前用户的openid:', openid);
          }
        } catch (testError) {
          console.log('测试查询失败:', testError);
        }
        
        this.setData({ 
          wishGoods: [],
          showEmptyWishes: true,
          isLoadingWishes: false 
        });
      }
    } catch (error) {
      console.error('加载用户愿望失败:', error);
      this.setData({ 
        wishGoods: [],
        showEmptyWishes: true,
        isLoadingWishes: false 
      });
      
      wx.showToast({
        title: '加载愿望失败',
        icon: 'none'
      });
    }
  },

  processGoodsData(goodsList) {
    if (!goodsList || !Array.isArray(goodsList)) {
      return [];
    }
    
    return goodsList.map(item => {
      let image = '/images/default.jpg';
      if (item.images && item.images.length > 0) {
        image = item.images[0];
      } else if (item.image) {
        image = item.image;
      }
      
      // 获取商品标签，支持多种可能的字段名
      let tags = [];
      if (item.tags && Array.isArray(item.tags)) {
        tags = item.tags;
      } else if (item.categories && Array.isArray(item.categories)) {
        tags = item.categories;
      } else if (item.tag) {
        // 如果是单个标签字符串，转为数组
        tags = [item.tag];
      }
      
      return {
        id: item._id || item.id,
        title: item.title || '未命名商品',
        description: item.description || '',
        price: parseFloat(item.price) || 0,
        image: image,
        transactionType: item.transactionType || 'cash',
        tags: tags, // 添加商品标签
        createTime: this.formatTime(item.createTime),
        status: item.status || 'selling',
        switch: item.switch || 'publish'
      };
    });
  },
  
  processWishesData(wishesList) {
    if (!wishesList || !Array.isArray(wishesList)) {
      return [];
    }
    
    console.log('原始愿望数据:', wishesList);
    
    return wishesList.map(item => {
      let image = '/images/default.jpg';
      if (item.images && item.images.length > 0) {
        image = item.images[0];
      } else if (item.image) {
        image = item.image;
      }
      
      // 获取愿望标签
      let tags = [];
      if (item.tags && Array.isArray(item.tags)) {
        tags = item.tags;
      } else if (item.categories && Array.isArray(item.categories)) {
        tags = item.categories;
      } else if (item.tag) {
        tags = [item.tag];
      } else if (item.keywords && Array.isArray(item.keywords)) {
        tags = item.keywords;
      }
      
      
      // 确保价格字段被正确提取
      const price = parseFloat(item.price) || 0;
      
      console.log('愿望ID:', item._id, '价格:', price, '交易类型:', item.transactionType);
      
      return {
        id: item._id || item.id,
        title: item.title || '未命名愿望',
        shortDescription: item.description ? (item.description.length > 50 ? item.description.substring(0, 50) + '...' : item.description) : '',
        expectedswap: item.expectedswap || '任意物品',
        price: price, // 确保价格字段被正确传递
        image: image,
        transactionType: item.transactionType || 'swap',
        transactionTypeText: item.transactionType === 'cash' ? '现金' : 
                            item.transactionType === 'swap' ? '换物' : '均可',
        tags: tags,
        createTime: this.formatTime(item.createTime),
        status: item.status || 'selling',
        switch: 'wish'
      };
    });
  },

  // 格式化时间函数
  formatTime(createTime) {
    if (!createTime) return '';
    
    let date;
    
    try {
      if (typeof createTime === 'object') {
        if (createTime.getTime && typeof createTime.getTime === 'function') {
          date = createTime;
        } else if (createTime.$date) {
          date = new Date(createTime.$date);
        }
      } else if (typeof createTime === 'string') {
        date = new Date(createTime);
      } else if (typeof createTime === 'number') {
        date = new Date(createTime);
      }
      
      if (!date || isNaN(date.getTime())) {
        return '';
      }
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // 今天
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      } else if (diffDays === 1) {
        return '昨天';
      } else if (diffDays < 7) {
        return `${diffDays}天前`;
      } else {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}-${day}`;
      }
    } catch (error) {
      console.error('格式化时间出错:', error);
      return '';
    }
  },

  calculateJoinDays(createTime) {
    if (!createTime) {
      console.log('没有创建时间，使用默认值');
      return 1;
    }
    
    console.log('计算加入天数，原始数据:', createTime);
    
    let createDate;
    
    try {
      if (typeof createTime === 'object') {
        if (createTime.getTime && typeof createTime.getTime === 'function') {
          createDate = createTime;
        } else if (createTime.$date) {
          createDate = new Date(createTime.$date);
        } else if (createTime.get) {
          console.log('云函数serverDate对象，使用当前日期计算');
          createDate = new Date();
        }
      } else if (typeof createTime === 'string') {
        createDate = new Date(createTime);
      } else if (typeof createTime === 'number') {
        createDate = new Date(createTime);
      }
      
      if (!createDate || isNaN(createDate.getTime())) {
        console.warn('无效的日期格式，使用当前日期:', createTime);
        createDate = new Date();
      }
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const result = Math.max(1, diffDays);
      console.log('计算出的天数:', result);
      return result;
      
    } catch (error) {
      console.error('计算加入天数出错:', error, createTime);
      return 1;
    }
  },

  switchGoodsTab(e) {
    const tab = e.currentTarget.dataset.tab;
    console.log('切换标签:', tab);
    this.setData({ activeGoodsTab: tab });
  },

  onGoodsTap(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type || 'goods';
    
    if (!id) {
      console.error('商品ID为空');
      wx.showToast({
        title: '商品信息错误',
        icon: 'none'
      });
      return;
    }
    
    console.log('点击商品，ID:', id, '索引:', index, '类型:', type);
    
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`,
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  onWishTap(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    console.log('点击愿望，ID:', id, '索引:', index);
    
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`,
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  onSendMessage() {
    if (this.data.isViewOtherUser && this.data.userInfo._id) {
      wx.navigateTo({
        url: `/pages/chatdetail/chatdetail?targetUserId=${this.data.userInfo._id}&targetNickname=${encodeURIComponent(this.data.userInfo.nickname)}`
      });
    } else {
      wx.navigateTo({
        url: '/pages/chat/chat'
      });
    }
  },

  onEditProfile() {
    if (this.data.isViewOtherUser) {
      wx.showToast({
        title: '不能编辑他人资料',
        icon: 'none'
      });
      return;
    }
    
    console.log('跳转到编辑页面');
    wx.navigateTo({
      url: '/pages/me/edit-profile/edit-profile',
      success: (res) => {
        console.log('跳转成功:', res);
      },
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showModal({
          title: '跳转失败',
          content: `错误: ${err.errMsg}`,
          showCancel: false
        });
      }
    });
  },

  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type;
    
    console.log('图片加载失败，索引:', index, '类型:', type);
    
    if (type === 'avatar') {
      this.setData({
        'userInfo.avatar': '/images/avatar.png'
      });
    } else if (type === 'goods') {
      const key = `publishedGoods[${index}].image`;
      this.setData({
        [key]: '/images/default.jpg'
      });
    } else if (type === 'wish') {
      const key = `wishGoods[${index}].image`;
      this.setData({
        [key]: '/images/default.jpg'
      });
    }
  },

  onShow() {
    console.log('个人主页显示');
    
    if (!this.data.isViewOtherUser) {
      const openid = wx.getStorageSync('openid');
      if (openid) {
        this.setData({ 
          targetOpenId: openid,
          isLoading: true 
        });
        this.loadUserData();
        this.loadUserGoods();
        this.loadUserWishes();
      }
    }
  },

  onPullDownRefresh() {
    console.log('下拉刷新');
    
    if (this.data.isViewOtherUser) {
      this.loadOtherUserData(this.data.targetUserId);
    } else {
      this.loadUserData();
      this.loadUserGoods();
      this.loadUserWishes();
    }
    
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  onShareAppMessage() {
    let title = `${this.data.userInfo.nickname}的个人主页`;
    let path = `/pages/me/profile/profile`;
    
    if (this.data.isViewOtherUser && this.data.userInfo._id) {
      path += `?userId=${this.data.userInfo._id}`;
    }
    
    return {
      title: title,
      path: path,
      imageUrl: this.data.userInfo.avatar
    };
  }
});