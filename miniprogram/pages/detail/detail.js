// pages/detail/detail.js
<<<<<<< HEAD
=======
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

>>>>>>> develop2.0-ZRT
Page({
  data: {
    goods: {},
    isFavorite: false,
<<<<<<< HEAD
    isWish: false,
    showConfirmPopup: false,
    popupProductInfo: null,
    isLoading: true,
    publisherInfo: null // 添加发布者信息字段
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
        goods,
        isLoading: false
      });
      
      this.checkFavoriteStatus(goods.id);
      
      // 加载发布者信息
      this.loadPublisherInfo(goods);
      
    } catch (error) {
      console.error('解析商品数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    }
  },

  // 从数据库加载商品
  async loadGoodsFromDatabase(id) {
    try {
      this.setData({ isLoading: true });
      
      const db = wx.cloud.database();
      const result = await db.collection('POST').doc(id).get();
      
      const goods = this.processGoodsData(result.data);
      
      this.setData({ 
        goods,
        isLoading: false
      });
      
      this.checkFavoriteStatus(id);
      
      // 加载发布者信息
      await this.loadPublisherInfo(goods);
      
    } catch (error) {
      console.error('加载商品详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    }
  },

  // 加载发布者信息
  async loadPublisherInfo(goods) {
    try {
      // 如果商品数据中已经有完整的publisherInfo，直接使用
      if (goods.publisherInfo && goods.publisherInfo.nickname) {
        console.log('使用商品中的发布者信息:', goods.publisherInfo);
        this.setData({
          publisherInfo: {
            ...goods.publisherInfo,
            // 确保有默认值
            nickname: goods.publisherInfo.nickname || '上财同学',
            avatar: goods.publisherInfo.avatar || goods.publisherInfo.avatarUrl || '/images/avatar.png',
            college: goods.publisherInfo.college || '未知学院',
            isVerified: goods.publisherInfo.isVerified || false
          }
        });
        return;
      }
      
      // 如果商品有publisherOpenid或userOpenid，从users数据库查询最新信息
      const publisherOpenid = goods.publisherOpenid || goods.userOpenid;
      if (publisherOpenid) {
        console.log('从users数据库查询发布者信息，openid:', publisherOpenid);
        
        const db = wx.cloud.database();
        const userRes = await db.collection('users')
          .where({ openid: publisherOpenid })
          .get();
        
        if (userRes.data.length > 0) {
          const userData = userRes.data[0];
          console.log('从数据库获取的发布者信息:', userData);
          
          const publisherInfo = {
            nickname: userData.nickname || userData.nickName || '上财同学',
            avatar: userData.avatar || userData.avatarUrl || '/images/avatar.png',
            college: userData.college || '未知学院',
            isVerified: userData.isVerified || false,
            openid: publisherOpenid,
            userId: userData._id,
            // 其他可选信息
            studentId: userData.studentId || '',
            phone: userData.phone || '',
            gender: userData.gender || 0,
            bio: userData.bio || ''
          };
          
          this.setData({ publisherInfo });
          
          // 可选：更新商品中的发布者信息（异步）
          this.updateGoodsPublisherInfo(goods.id, publisherInfo);
          
        } else {
          // 如果没有找到用户，使用默认信息
          this.setDefaultPublisherInfo();
        }
      } else if (goods._openid) {
        // 如果有_openid，尝试查询
        console.log('使用_openid查询发布者:', goods._openid);
        await this.loadUserByOpenid(goods._openid);
      } else {
        // 都没有，使用默认信息
        this.setDefaultPublisherInfo();
      }
      
    } catch (error) {
      console.error('加载发布者信息失败:', error);
      this.setDefaultPublisherInfo();
    }
  },

  // 通过openid查询用户
  async loadUserByOpenid(openid) {
    try {
      const db = wx.cloud.database();
      const userRes = await db.collection('users')
        .where({ openid: openid })
        .get();
      
      if (userRes.data.length > 0) {
        const userData = userRes.data[0];
        const publisherInfo = {
          nickname: userData.nickname || userData.nickName || '上财同学',
          avatar: userData.avatar || userData.avatarUrl || '/images/avatar.png',
          college: userData.college || '未知学院',
          isVerified: userData.isVerified || false,
          openid: openid,
          userId: userData._id
        };
        
        this.setData({ publisherInfo });
      } else {
        this.setDefaultPublisherInfo();
      }
    } catch (error) {
      console.error('通过openid查询用户失败:', error);
      this.setDefaultPublisherInfo();
    }
  },

  // 设置默认发布者信息
  setDefaultPublisherInfo() {
    this.setData({
      publisherInfo: {
        nickname: '上财同学',
        avatar: '/images/avatar.png',
        college: '未知学院',
        isVerified: false
      }
    });
  },

  // 更新商品中的发布者信息（异步）
  async updateGoodsPublisherInfo(goodsId, publisherInfo) {
    try {
      const db = wx.cloud.database();
      await db.collection('POST').doc(goodsId).update({
        data: {
          'publisherInfo.nickname': publisherInfo.nickname,
          'publisherInfo.avatar': publisherInfo.avatar,
          'publisherInfo.college': publisherInfo.college,
          'publisherInfo.isVerified': publisherInfo.isVerified,
          updateTime: db.serverDate()
        }
      });
      console.log('商品发布者信息已更新');
    } catch (error) {
      console.error('更新商品发布者信息失败:', error);
      // 不显示错误，不影响主要功能
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
    
    // 处理用户信息（保留原有逻辑，用于兼容）
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
    
    // 提取发布者信息
    const publisherInfo = data.publisherInfo || {
      nickname: userInfo.nickname,
      avatar: userInfo.avatar,
      college: userInfo.college
    };
    
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
      user: userInfo,
      // 添加发布者相关字段
      publisherOpenid: data.publisherOpenid || data._openid,
      publisherInfo: publisherInfo,
      _openid: data._openid
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

  // 查看发布者详情
  onViewPublisherDetail() {
    const { publisherInfo, goods } = this.data;
    
    if (!publisherInfo || !publisherInfo.userId) {
      wx.showToast({
        title: '用户信息不完整',
=======
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
>>>>>>> develop2.0-ZRT
        icon: 'none'
      });
      return;
    }
    
<<<<<<< HEAD
    // 跳转到发布者个人主页
    wx.navigateTo({
      url: `/pages/me/user-profile/user-profile?userId=${publisherInfo.userId}&openid=${publisherInfo.openid || ''}`
    });
  },

  // 聊天 - 使用 postId
  onChat() {
    const { goods, publisherInfo } = this.data;
    
    // 可以传递发布者信息给聊天页面
    const chatData = {
      postId: goods.id,
      postTitle: goods.title,
      publisherId: publisherInfo?.userId || '',
      publisherName: publisherInfo?.nickname || '发布者'
    };
    
    wx.navigateTo({
      url: `/pages/chatdetail/chatdetail?chatData=${encodeURIComponent(JSON.stringify(chatData))}`
    });
            // 在商品详情页或用户信息页跳转时
        const goToChat = async (sellerId, postId) => {
          try {
            // 获取卖家详细信息
            const db = wx.cloud.database();
            const sellerRes = await db.collection('users').doc(sellerId).get();
            const postRes = await db.collection('POST').doc(postId).get();
            
            const sellerInfo = sellerRes.data;
            const postInfo = postRes.data;
            
            // 准备聊天数据
            const chatData = {
              sellerId: sellerId,
              sellerNickname: sellerInfo.nickname || '商家',
              sellerAvatar: sellerInfo.avatar || sellerInfo.avatarUrl || '/images/avatar.png',
              sellerCollege: sellerInfo.college || '',
              postId: postId,
              postTitle: postInfo.title || '相关商品',
              postPrice: postInfo.price,
              postImage: postInfo.images?.[0] || ''
            };
            
            // 编码数据并跳转
            const encodedData = encodeURIComponent(JSON.stringify(chatData));
            wx.navigateTo({
              url: `/pages/chatdetail/chatdetail?chatData=${encodedData}`
            });
            
          } catch (error) {
            console.error('跳转聊天失败:', error);
            // 简化版本，只传递必要参数
            wx.navigateTo({
              url: `/pages/chatdetail/chatdetail?sellerId=${sellerId}&postId=${postId}`
            });
          }
        };
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
=======
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
>>>>>>> develop2.0-ZRT
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
      
<<<<<<< HEAD
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
=======
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
>>>>>>> develop2.0-ZRT
      wx.showToast({
        title: '未设置手机号',
        icon: 'none'
      });
<<<<<<< HEAD
    }
  },

  // 预览图片
  onPreviewImage(e) {
    const index = e.currentTarget.dataset.index;
    const { goods } = this.data;
    
    if (goods.images && goods.images.length > 0) {
      wx.previewImage({
        current: goods.images[index],
        urls: goods.images
      });
    }
  },

  // 分享功能
  onShareAppMessage() {
    const { goods, publisherInfo } = this.data;
    return {
      title: `${publisherInfo?.nickname || '上财同学'}发布的：${goods.title}`,
      path: `/pages/detail/detail?id=${goods.id}`,
      imageUrl: goods.images && goods.images.length > 0 ? goods.images[0] : '/images/share-logo.png'
    };
=======
    });
>>>>>>> develop2.0-ZRT
  }
});