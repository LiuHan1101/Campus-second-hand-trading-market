// pages/detail/detail.js
const db = wx.cloud.database();

// 收藏管理工具类（放在文件顶部）
const favoriteManager = {
  // 获取收藏列表
  getFavorites() {
    const data = wx.getStorageSync('favorites') || '{}';
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  },
  
  // 保存收藏列表
  saveFavorites(favorites) {
    wx.setStorageSync('favorites', JSON.stringify(favorites));
  },
  
  // 检查是否收藏
  isFavorite(goodsId) {
    const favorites = this.getFavorites();
    return !!favorites[String(goodsId)];
  },
  
  // 添加收藏
  addFavorite(goods) {
    const favorites = this.getFavorites();
    favorites[String(goods.id)] = {
      id: goods.id,
      title: goods.title, // 注意：你的商品数据中是 title，不是 name
      price: goods.price,
      image: goods.images?.[0] || '/images/default.jpg',
      addTime: Date.now()
    };
    this.saveFavorites(favorites);
    return true;
  },
  
  // 取消收藏
  removeFavorite(goodsId) {
    const favorites = this.getFavorites();
    delete favorites[String(goodsId)];
    this.saveFavorites(favorites);
    return false;
  },
  
  // 切换收藏状态
  toggleFavorite(goods) {
    const goodsId = String(goods.id);
    if (this.isFavorite(goodsId)) {
      return this.removeFavorite(goodsId);
    } else {
      return this.addFavorite(goods);
    }
  }
};

// 获取用户信息（辅助函数）
async function getUserInfo() {
  return new Promise((resolve) => {
    // 先检查本地存储
    const localUserInfo = wx.getStorageSync('userInfo');
    if (localUserInfo) {
      resolve(localUserInfo);
      return;
    }
    
    // 如果需要，可以调用云函数获取
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: (userRes) => {
              wx.setStorageSync('userInfo', userRes.userInfo);
              resolve(userRes.userInfo);
            },
            fail: () => resolve(null)
          });
        } else {
          resolve(null);
        }
      },
      fail: () => resolve(null)
    });
  });
}

Page({
  data: {
    goods: {},
    isFavorite: false,
    loading: false,
    userInfo: null // 添加用户信息
  },

  onLoad(options) {
    const id = options.id;
    console.log('商品ID:', id);
    
    // 加载商品详情
    this.loadGoodsDetail(id);
    
    // 获取用户信息
    this.getUserInfo();
  },

  // 获取用户信息
  async getUserInfo() {
    try {
      const userInfo = await getUserInfo();
      this.setData({ userInfo });
      
      // 如果有用户信息，重新检查收藏状态
      if (userInfo && this.data.goods.id) {
        this.checkFavoriteStatus(this.data.goods.id);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  },

  // 加载商品详情
  async loadGoodsDetail(id) {
    try {
      wx.showLoading({ title: '加载中...' });
      
      const result = await db.collection('POST').doc(id).get();
      const goods = this.processGoodsData(result.data);
      
      this.setData({ goods });
      wx.hideLoading();
      
      // 检查收藏状态
      this.checkFavoriteStatus(id);
      
    } catch (error) {
      console.error('加载商品详情失败:', error);
      wx.hideLoading();
      
      // 如果加载失败，使用模拟数据
      this.loadMockData(id);
    }
  },

  // 处理商品数据
  processGoodsData(data) {
    // 确保数据完整性
    return {
      id: data._id,
      title: data.title || '未命名商品',
      description: data.description || '暂无描述',
      price: parseFloat(data.price) || 0,
      images: data.images || ['/images/default.jpg'],
      transactionType: data.transactionType || 'cash',
      tag: data.categories || data.tag || [],
      expectedSwap: data.expectedSwap || '',
      viewCount: data.viewCount || 0,
      user: {
        nickname: data.userInfo?.nickname || data.nickname || 
                 data.user?.nickname || '匿名用户',
        avatar: data.userInfo?.avatar || data.avatar || 
                data.user?.avatar || '/images/avatar.png',
        college: data.college || data.user?.college || ''
      }
    };
  },

  // 加载模拟数据（备用）
  loadMockData(id) {
    wx.showToast({
      title: '加载失败，使用演示数据',
      icon: 'none'
    });
    
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
  async checkFavoriteStatus(goodsId) {
    if (!goodsId) return;
    
    // 1. 先检查本地缓存
    const localFavorite = favoriteManager.isFavorite(goodsId);
    this.setData({ isFavorite: localFavorite });
    
    // 2. 异步检查云端（如果用户已登录）
    if (this.data.userInfo) {
      try {
        const favoritesCollection = db.collection('favorites');
        const res = await favoritesCollection
          .where({
            goodsId: goodsId,
            _openid: this.data.userInfo._openid || '' // 确保 openid 存在
          })
          .count();
        
        const cloudFavorite = res.total > 0;
        
        // 如果云端和本地不一致，以云端为准
        if (cloudFavorite !== localFavorite) {
          this.setData({ isFavorite: cloudFavorite });
          
          // 同步到本地
          if (cloudFavorite && this.data.goods) {
            favoriteManager.addFavorite(this.data.goods);
          } else {
            favoriteManager.removeFavorite(goodsId);
          }
        }
      } catch (error) {
        console.error('检查云端收藏失败:', error);
      }
    }
  },

  // 切换收藏状态
  async onToggleFavorite() {
    if (this.data.loading) return;
    
    const { goods, isFavorite, userInfo } = this.data;
    if (!goods || !goods.id) {
      wx.showToast({
        title: '商品信息不完整',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ loading: true });
    
    try {
      let newStatus = !isFavorite;
      const goodsId = String(goods.id);
      
      if (userInfo && userInfo._openid) {
        // 已登录：操作云端
        const favoritesCollection = db.collection('favorites');
        
        if (isFavorite) {
          // 取消收藏：先查询再删除
          const queryResult = await favoritesCollection
            .where({
              goodsId: goodsId,
              _openid: userInfo._openid
            })
            .get();
            
          if (queryResult.data.length > 0) {
            await favoritesCollection.doc(queryResult.data[0]._id).remove();
          }
          
          // 同步到本地
          favoriteManager.removeFavorite(goodsId);
          
        } else {
          // 添加收藏到云端
          await favoritesCollection.add({
            data: {
              goodsId: goodsId,
              goodsName: goods.title, // 修正字段名
              goodsImage: goods.images?.[0] || '/images/default.jpg',
              price: goods.price,
              addTime: db.serverDate(),
              _openid: userInfo._openid
            }
          });
          
          // 同步到本地
          favoriteManager.addFavorite(goods);
        }
      } else {
        // 未登录：仅本地操作
        newStatus = favoriteManager.toggleFavorite(goods);
      }
      
      // 更新UI
      this.setData({ 
        isFavorite: newStatus,
        loading: false 
      });
      
      // 添加动画效果
      this.animateFavoriteIcon();
      
      wx.showToast({
        title: newStatus ? '收藏成功' : '取消收藏',
        icon: 'success',
        duration: 1500
      });
      
    } catch (error) {
      console.error('操作收藏失败:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 收藏图标动画
  animateFavoriteIcon() {
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-in-out'
    });
    
    animation.scale(1.2).step();
    animation.scale(1).step();
    
    this.setData({
      favoriteAnimation: animation.export()
    });
  },

  // 聊天
  onChat() {
    const { goods, userInfo } = this.data;
    
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '需要登录后才能聊天',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            // 跳转到登录页
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    // 跳转到聊天页面
    wx.navigateTo({
      url: `/pages/chat/chat?goodsId=${goods.id}&sellerId=${goods.userId || ''}`
    });
  },

  // 购买/交易按钮
  onTransaction() {
    const { goods } = this.data;
    
    wx.showActionSheet({
      itemList: goods.transactionType === 'both' 
        ? ['立即购买', '我想要交换'] 
        : goods.transactionType === 'cash' 
          ? ['立即购买'] 
          : ['我想要交换'],
      success: (res) => {
        const index = res.tapIndex;
        
        if (goods.transactionType === 'both') {
          if (index === 0) {
            this.onBuy();
          } else {
            this.onSwap();
          }
        } else if (goods.transactionType === 'cash') {
          this.onBuy();
        } else {
          this.onSwap();
        }
      }
    });
  },

  // 购买功能
  onBuy() {
    const { goods } = this.data;
    
    wx.showModal({
      title: '确认购买',
      content: `确定要购买"${goods.title}"吗？价格：¥${goods.price}`,
      success: (res) => {
        if (res.confirm) {
          // 跳转到订单确认页面
          wx.navigateTo({
            url: `/pages/order/confirm?goodsId=${goods.id}&type=buy`
          });
        }
      }
    });
  },

  // 换物功能
  onSwap() {
    const { goods } = this.data;
    
    wx.showModal({
      title: '发起交换',
      content: `确定要和卖家交换"${goods.title}"吗？${goods.expectedSwap ? '\n卖家期望交换：' + goods.expectedSwap : ''}`,
      success: (res) => {
        if (res.confirm) {
          // 跳转到换物页面
          wx.navigateTo({
            url: `/pages/swap/apply?goodsId=${goods.id}`
          });
        }
      }
    });
  },

  // 分享功能
  onShareAppMessage() {
    const { goods } = this.data;
    return {
      title: goods.title,
      path: `/pages/detail/detail?id=${goods.id}`,
      imageUrl: goods.images?.[0] || ''
    };
  },

  // 图片预览
  onPreviewImage(e) {
    const { index } = e.currentTarget.dataset;
    const { goods } = this.data;
    
    wx.previewImage({
      current: goods.images[index],
      urls: goods.images
    });
  },

  // 联系卖家
  onContactSeller() {
    const { goods } = this.data;
    
    wx.makePhoneCall({
      phoneNumber: goods.user?.phone || '请通过聊天联系'
    }).catch(() => {
      wx.showToast({
        title: '未设置手机号',
        icon: 'none'
      });
    });
  }
});