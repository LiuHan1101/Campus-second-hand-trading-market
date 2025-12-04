// pages/detail/detail.js
Page({
    data: {
      goods: {},
      isFavorite: false,
      isWish: false,
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
  
    // 聊天 - 修复：使用 postId
    onChat() {
      const { goods } = this.data;
      wx.navigateTo({
        url: `/pages/chatdetail/chatdetail?postId=${goods.id}`
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
        wx.showToast({
          title: '购买功能开发中',
          icon: 'none'
        });
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
        wx.showToast({
          title: '换物功能开发中',
          icon: 'none'
        });
      }
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
    // 出物商品：立即购买 - 显示确认弹窗
    this.showConfirmPopup(goods);
  }
},

// 显示确认弹窗
showConfirmPopup(goods) {
  this.setData({
    showConfirmPopup: true,
    popupProductInfo: {
      image: goods.images && goods.images.length > 0 ? goods.images[0] : '/images/default.jpg',
      title: goods.title,
      price: goods.price
    }
  });
},

// 弹窗关闭事件
onPopupClose() {
  this.setData({
    showConfirmPopup: false
  });
},

// 弹窗取消事件
onPopupCancel() {
  console.log('用户取消交易');
  this.setData({
    showConfirmPopup: false
  });
},

// 弹窗确认事件
onPopupConfirm(e) {
  const transactionInfo = e.detail;
  console.log('交易信息:', transactionInfo);
  
  // 这里处理交易确认逻辑
  wx.showToast({
    title: '交易确认成功',
    icon: 'success'
  });
  
  // 可以在这里调用云函数或API提交交易信息
  this.submitTransaction(transactionInfo);
  
  this.setData({
    showConfirmPopup: false
  });
},

// 提交交易信息到后端
async submitTransaction(transactionInfo) {
  try {
    // 示例：调用云函数提交交易信息
    const result = await wx.cloud.callFunction({
      name: 'createTransaction',
      data: {
        goodsId: this.data.goods.id,
        ...transactionInfo,
        timestamp: new Date()
      }
    });
    
    console.log('交易提交成功:', result);
  } catch (error) {
    console.error('交易提交失败:', error);
    wx.showToast({
      title: '交易提交失败',
      icon: 'none'
    });
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
      wx.showToast({
        title: '换物功能开发中',
        icon: 'none'
      });
    }
  }

});
