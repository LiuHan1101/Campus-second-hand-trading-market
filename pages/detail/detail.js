// pages/detail/detail.js
Page({
  data: {
    goods: {},
    isFavorite: false,
    isWish: false,
    showConfirmPopup: false,
    popupProductInfo: {}
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

  processGoodsData(data) {
    console.log('=== 处理商品数据调试开始 ===');
    console.log('原始数据images字段:', data.images);
    console.log('原始数据类型:', typeof data.images);
    
    let images = [];
    
    // 1. 先处理images数组
    if (data.images && Array.isArray(data.images)) {
      images = data.images.filter(img => {
        if (typeof img === 'string') {
          // 只过滤掉完全无效的字符串
          return img !== null && img !== undefined && img.trim() !== '';
        }
        if (typeof img === 'object' && img !== null) {
          // 如果是对象，提取url
          return img.url && img.url.trim() !== '';
        }
        return false;
      }).map(img => {
        // 统一转换为字符串格式
        if (typeof img === 'string') {
          return img;
        }
        if (typeof img === 'object' && img.url) {
          return img.url;
        }
        return img;
      });
      
      console.log('处理后的images数组:', images);
    }
    
    // 2. 如果没有图片，检查单个image字段
    if (images.length === 0 && data.image) {
      if (typeof data.image === 'string' && data.image.trim() !== '') {
        images = [data.image];
      } else if (typeof data.image === 'object' && data.image.url && data.image.url.trim() !== '') {
        images = [data.image.url];
      }
      console.log('从image字段获取的图片:', images);
    }
    
    // 3. 如果没有图片，检查图片链接字段
    if (images.length === 0 && data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.trim() !== '') {
      images = [data.imageUrl];
      console.log('从imageUrl字段获取的图片:', images);
    }
    
    // 4. 如果还是没有图片，检查图片链接数组字段
    if (images.length === 0 && data.imageUrls && Array.isArray(data.imageUrls)) {
      images = data.imageUrls.filter(url => url && typeof url === 'string' && url.trim() !== '');
      console.log('从imageUrls字段获取的图片:', images);
    }
    
    console.log('最终图片数组:', images);
    console.log('图片数量:', images.length);
    console.log('=== 处理商品数据调试结束 ===');
    
    let displayPrice = '';
    if (data.transactionType === 'swap') {
      displayPrice = '';
    } else if (data.transactionType === 'both') {
      displayPrice = parseFloat(data.price) || 0;
    } else {
      displayPrice = parseFloat(data.price) || 0;
    }
    
    // 处理标签
    let tags = [];
    if (data.customTags && Array.isArray(data.customTags)) {
      tags = data.customTags;
    } else if (data.tag) {
      tags = Array.isArray(data.tag) ? data.tag : [data.tag];
    } else if (data.categories) {
      tags = Array.isArray(data.categories) ? data.categories : [data.categories];
    } else if (data.tags && Array.isArray(data.tags)) {
      tags = data.tags;
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
      price: displayPrice, 
      displayPrice: displayPrice, 
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
    } else {
      newFavorites = [...favorites, goods.id];
    }
    
    wx.setStorageSync('favorites', newFavorites);
    this.setData({ isFavorite: !isFavorite });
  },

  // 聊天
  onChat() {
    const { goods } = this.data;
    wx.navigateTo({
      url: `/pages/chatdetail/chatdetail?postId=${goods.id}`
    });
  },

  // 购买/实现愿望 - 统一显示弹窗
  onBuy() {
    const { goods } = this.data;
    this.showConfirmPopup(goods);
  },

  // 换物/以物换物 - 统一显示弹窗
  onSwap() {
    const { goods } = this.data;
    this.showConfirmPopup(goods);
  },

  // 显示确认弹窗 - 统一处理所有交易类型
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
    
    // 统一显示成功提示
    wx.showToast({
      title: '交易申请已提交',
      icon: 'success'
    });
    
    // 提交交易信息到后端（只包含时间和地点）
    this.submitTransaction(transactionInfo);
    
    this.setData({
      showConfirmPopup: false
    });
  },

  // 提交交易信息到后端
  async submitTransaction(transactionInfo) {
    try {
      const { goods } = this.data;
      
      // 只包含时间和地点信息
      const transactionData = {
        goodsId: goods.id,
        goodsTitle: goods.title,
        transactionTime: transactionInfo.time || '', // 交易时间
        transactionLocation: transactionInfo.location || '', // 交易地点
        remark: transactionInfo.remark || '', // 备注
        timestamp: new Date(),
        status: 'pending' // 交易状态：pending待确认
      };
      
      console.log('提交交易数据:', transactionData);
      
      // 调用云函数提交交易
      const result = await wx.cloud.callFunction({
        name: 'createTransaction',
        data: transactionData
      });
      
      console.log('交易提交成功:', result);
      
    } catch (error) {
      console.error('交易提交失败:', error);
      wx.showToast({
        title: '交易提交失败，请重试',
        icon: 'none'
      });
    }
  }
});