// pages/detail/detail.js
Page({
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
      wx.showToast({
        title: '购买功能开发中',
        icon: 'none'
      });
    },
  
    // 换物
    onSwap() {
      wx.showToast({
        title: '换物功能开发中',
        icon: 'none'
      });
    }
  });