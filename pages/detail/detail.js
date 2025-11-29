// pages/detail/detail.js
Page({
<<<<<<< HEAD
  data: {
    goods: {},
    isFavorite: false,
    isWish: false
  },

  onLoad(options) {
    console.log('详情页参数:', options);
    
    const id = options.id;
    const type = options.type;
    const goodsData = options.goodsData;
    
    // 设置是否为愿望
    this.setData({
      isWish: type === 'wish'
    });
    
    if (goodsData) {
      // 如果有传递的完整数据，直接使用
      this.loadGoodsFromData(goodsData);
    } else if (id) {
      // 如果有ID，从数据库加载
      this.loadGoodsFromDatabase(id);
    } else {
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
      wx.navigateBack();
    }
  },

  // 从传递的数据加载商品
  loadGoodsFromData(goodsData) {
    try {
      const data = JSON.parse(decodeURIComponent(goodsData));
      const goods = this.processGoodsData(data);
      
      this.setData({ 
        goods
      });
      
      this.checkFavoriteStatus(goods.id);
      
    } catch (error) {
      console.error('解析商品数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
    }
  },

  // 从数据库加载商品
  async loadGoodsFromDatabase(id) {
    try {
      const db = wx.cloud.database();
      const result = await db.collection('POST').doc(id).get();
      
      const goods = this.processGoodsData(result.data);
      
      this.setData({ 
        goods
      });
      
      this.checkFavoriteStatus(id);
      
    } catch (error) {
      console.error('加载商品详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 处理商品数据 - 增强兼容性
  processGoodsData(data) {
    // 处理图片
    let images = [];
    if (data.images && data.images.length > 0) {
      images = data.images;
    } else if (data.image) {
      images = [data.image];
    } else {
      images = ['/images/default.jpg'];
    }
    
    // 处理标签
    let tags = [];
    if (data.customTags && Array.isArray(data.customTags)) {
      tags = data.customTags;
    } else if (data.tag) {
      tags = Array.isArray(data.tag) ? data.tag : [data.tag];
    } else if (data.categories) {
      tags = Array.isArray(data.categories) ? data.categories : [data.categories];
    }
    
    // 处理用户信息
    let userInfo = {
      nickname: '匿名用户',
      avatar: '/images/avatar.png',
      college: ''
    };
    
    if (data.user && typeof data.user === 'object') {
      userInfo = {
        nickname: data.user.nickname || userInfo.nickname,
        avatar: data.user.avatar || userInfo.avatar,
        college: data.user.college || userInfo.college
      };
    } else if (data.nickname) {
      userInfo.nickname = data.nickname;
    }
    
    return {
      id: data._id || data.id || Date.now().toString(),
      title: data.title || '未知商品',
      description: data.description || '暂无描述',
      price: parseFloat(data.price) || 0,
      priceRange: data.priceRange || '',
      images: images,
      transactionType: data.transactionType || 'cash',
      tags: tags,
      expectedSwap: data.expectedSwap || '',
      viewCount: data.viewCount || 0,
      createTime: data.createTime || '',
      switch: data.switch || 'object',
      user: userInfo
    };
  },

  // 检查收藏状态
  checkFavoriteStatus(goodsId) {
    const favorites = wx.getStorageSync('favorites') || [];
    const isFavorite = favorites.includes(goodsId);
    this.setData({ isFavorite });
  },

  // 切换收藏状态
  onToggleFavorite() {
    const { goods, isFavorite } = this.data;
    const favorites = wx.getStorageSync('favorites') || [];
    
    let newFavorites;
    if (isFavorite) {
      newFavorites = favorites.filter(id => id !== goods.id);
      wx.showToast({ title: '取消收藏', icon: 'success' });
    } else {
      newFavorites = [...favorites, goods.id];
      wx.showToast({ title: '收藏成功', icon: 'success' });
    }
    
    wx.setStorageSync('favorites', newFavorites);
    this.setData({ isFavorite: !isFavorite });
  },

  // 聊天
  onChat() {
    wx.showToast({
      title: '聊天功能开发中',
      icon: 'none'
    });
  },

  // 购买/出售
  onBuy() {
    const { isWish, goods } = this.data;
    if (isWish) {
      // 许愿商品：立即出售（我有这个物品，卖给他）
      wx.showToast({
        title: '出售功能开发中',
        icon: 'none'
      });
    } else {
      // 出物商品：立即购买
=======
    data: {
      goods: {},
      isFavorite: false
    },
  
    onLoad(options) {
      const id = options.id;
      console.log('商品ID:', id);
      this.loadGoodsDetail(id);
    },
  
    // 加载商品详情
    async loadGoodsDetail(id) {
      try {
        // 这里可以从数据库加载商品详情
        const db = wx.cloud.database();
        const result = await db.collection('POST').doc(id).get();
        
        const goods = this.processGoodsData(result.data);
        this.setData({ goods });
        
        // 检查收藏状态
        this.checkFavoriteStatus(id);
        
      } catch (error) {
        console.error('加载商品详情失败:', error);
        // 如果加载失败，使用模拟数据
        this.loadMockData(id);
      }
    },
  
    // 处理商品数据
    processGoodsData(data) {
      return {
        id: data._id,
        title: data.title,
        description: data.description,
        price: parseFloat(data.price) || 0,
        images: data.images || ['/images/default.jpg'],
        transactionType: data.transactionType || 'cash',
        tag: data.categories || [],
        expectedSwap: data.expectedSwap || '',
        viewCount: data.viewCount || 0,
        user: {
          nickname: data.userInfo?.nickname || data.nickname || '匿名用户',
          avatar: data.userInfo?.avatar || data.avatar || '/images/avatar.png',
          college: data.college || ''
        }
      };
    },
  
    // 加载模拟数据（备用）
    loadMockData(id) {
      const mockData = {
        id: id,
        title: '九成新AirPods耳机',
        description: '音质很好，几乎没用过，包装齐全，有购买凭证。因换新耳机所以出售。',
        price: 299,
        images: ['/images/demo1.jpg', '/images/demo2.jpg'],
        transactionType: 'both',
        tag: ['电子产品', '耳机', '苹果'],
        expectedSwap: '可换同等价值的键盘或鼠标',
        viewCount: 156,
        user: {
          nickname: '学长A',
          avatar: '/images/avatar.png',
          college: '计算机学院'
        }
      };
      this.setData({ goods: mockData });
    },
  
    // 检查收藏状态
    checkFavoriteStatus(goodsId) {
      const favorites = wx.getStorageSync('favorites') || [];
      const isFavorite = favorites.includes(goodsId);
      this.setData({ isFavorite });
    },
  
    // 切换收藏状态
    onToggleFavorite() {
      const { goods, isFavorite } = this.data;
      const favorites = wx.getStorageSync('favorites') || [];
      
      let newFavorites;
      if (isFavorite) {
        // 取消收藏
        newFavorites = favorites.filter(id => id !== goods.id);
        wx.showToast({ title: '取消收藏', icon: 'success' });
      } else {
        // 添加收藏
        newFavorites = [...favorites, goods.id];
        wx.showToast({ title: '收藏成功', icon: 'success' });
      }
      
      wx.setStorageSync('favorites', newFavorites);
      this.setData({ isFavorite: !isFavorite });
    },
  
    // 聊天
    onChat() {
      wx.showToast({
        title: '聊天功能开发中',
        icon: 'none'
      });
    },
  
    // 购买
    onBuy() {
>>>>>>> wishpool
      wx.showToast({
        title: '购买功能开发中',
        icon: 'none'
      });
<<<<<<< HEAD
    }
  },

  // 换物
  onSwap() {
    const { isWish, goods } = this.data;
    if (isWish) {
      // 许愿商品：以物换物（我有物品可以和他交换）
      wx.showToast({
        title: '换物功能开发中',
        icon: 'none'
      });
    } else {
      // 出物商品：发起换物
=======
    },
  
    // 换物
    onSwap() {
>>>>>>> wishpool
      wx.showToast({
        title: '换物功能开发中',
        icon: 'none'
      });
    }
<<<<<<< HEAD
  }
});
=======
  });
>>>>>>> wishpool
