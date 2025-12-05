// pages/me/my-goods/my-goods.js
Page({
  data: {
    type: '', // published, inProgress, completed, favorites
    goodsList: [],
    searchValue: '',
    isLoading: true,
    noData: false,
    noDataMessage: ''
  },

  onLoad(options) {
    const { type } = options;
    this.setData({ type });
    wx.setNavigationBarTitle({
      title: this.getPageTitle(type)
    });
    this.loadGoodsList();
  },

  onShow() {
    this.loadGoodsList();
  },

  // 获取页面标题
  getPageTitle(type) {
    const titleMap = {
      published: '已发布',
      inProgress: '进行中',
      completed: '已成交',
      favorites: '我的收藏'
    };
    return titleMap[type] || '我的商品';
  },

  // 加载商品列表
// 加载商品列表
async loadGoodsList() {
  try {
    this.setData({ 
      isLoading: true,
      noData: false,
      noDataMessage: '' 
    });
    
    // 先获取当前用户的openid
    const userInfo = wx.getStorageSync('userInfo');
    const openid = userInfo ? userInfo.openid : null;
    
    if (!openid) {
      console.error('未找到openid，用户未登录');
      this.setData({ 
        goodsList: [],
        isLoading: false,
        noData: true,
        noDataMessage: '请先登录查看'
      });
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1500
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }
    
    console.log('当前用户openid:', openid, '类型:', this.data.type);
    
    const db = wx.cloud.database();
    let goodsList = [];
    
    // 根据类型设置查询条件
    if (this.data.type === 'favorites') {
      console.log('=== 开始加载收藏商品列表 ===');
      
      try {
        // 第一步：查询用户的收藏记录
        // 尝试多种可能的字段名，确保能查询到数据
        let favoritesRes;
        
        // 方法1：使用userId字段查询（根据你提供的字段名）
        try {
          favoritesRes = await db.collection('favorites')
            .where({
              userId: openid
            })
            .orderBy('createTime', 'desc')
            .get();
          console.log('使用userId字段查询成功');
        } catch (err1) {
          console.log('userId字段查询失败，尝试_openid字段:', err1.message);
          
          // 方法2：使用_openid字段查询（系统自动添加的字段）
          try {
            favoritesRes = await db.collection('favorites')
              .where({
                _openid: openid
              })
              .orderBy('createTime', 'desc')
              .get();
            console.log('使用_openid字段查询成功');
          } catch (err2) {
            console.log('_openid字段查询也失败:', err2.message);
            throw new Error('无法查询收藏记录');
          }
        }
        
        console.log('收藏记录数量:', favoritesRes.data.length);
        console.log('收藏记录数据结构:', favoritesRes.data.length > 0 ? favoritesRes.data[0] : '无数据');
        
        // 如果没有收藏记录
        if (favoritesRes.data.length === 0) {
          this.setData({
            goodsList: [],
            isLoading: false,
            noData: true,
            noDataMessage: '暂无收藏的商品'
          });
          return;
        }
        
        // 第二步：直接将收藏记录转换为商品列表
        // 因为收藏记录中已经包含了商品的基本信息
        goodsList = favoritesRes.data.map(favorite => {
          // 处理商品图片
          let imageUrl = '/images/default.jpg';
          if (favorite.postImage) {
            imageUrl = favorite.postImage;
          }
          
          // 处理交易类型显示
          let transactionTypeText = '现金';
          if (favorite.transactionType === 'swap') {
            transactionTypeText = '换物';
          } else if (favorite.transactionType === 'both') {
            transactionTypeText = '均可';
          }
          
          return {
            // 商品ID（使用postId）
            id: favorite.postId,
            // 收藏记录ID（用于取消收藏时使用）
            favoriteId: favorite._id,
            // 商品标题
            title: favorite.postTitle || '未命名商品',
            // 商品描述
            description: favorite.postDescription || '暂无描述',
            // 商品价格
            price: parseFloat(favorite.postPrice) || 0,
            // 商品图片
            image: imageUrl,
            // 交易类型显示文本
            transactionType: transactionTypeText,
            // 原始交易类型
            transactionTypeRaw: favorite.transactionType || 'cash',
            // 商品分类（收藏记录中可能没有，如果需要可以从POST集合补充）
            tag: [],
            tags: [],
            // 商品创建时间（收藏记录中没有，使用收藏时间替代）
            createTime: this.formatTime(favorite.createTime),
            // 收藏时间
            favoriteTime: this.formatTime(favorite.createTime),
            // 商品状态（收藏记录中可能没有，默认设为selling）
            status: 'selling',
            // 完整的收藏记录（用于跳转详情页时传递数据）
            favoriteRecord: favorite
          };
        });
        
        console.log('转换后的商品列表:', goodsList);
        
        // 如果需要更完整的商品信息，可以额外查询POST集合
        if (goodsList.length > 0) {
          try {
            // 提取所有postId
            const postIds = favoritesRes.data
              .filter(item => item.postId)
              .map(item => item.postId);
            
            if (postIds.length > 0) {
              console.log('开始查询POST集合获取完整商品信息...');
              
              // 批量查询商品信息（最多20个）
              const postsRes = await db.collection('POST')
                .where({
                  _id: db.command.in(postIds.slice(0, 20)), // 限制数量避免超时
                  deleted: db.command.neq(true)
                })
                .get();
              
              console.log('查询到的完整商品数量:', postsRes.data.length);
              
              // 将POST集合中的完整信息合并到商品列表中
              const postMap = {};
              postsRes.data.forEach(post => {
                postMap[post._id] = post;
              });
              
              goodsList = goodsList.map(goods => {
                const fullPostInfo = postMap[goods.id];
                if (fullPostInfo) {
                  // 如果有完整商品信息，更新相关字段
                  return {
                    ...goods,
                    // 更新图片（如果有多个图片）
                    image: (fullPostInfo.images && fullPostInfo.images.length > 0) 
                      ? fullPostInfo.images[0] 
                      : goods.image,
                    // 更新分类
                    tag: fullPostInfo.categories || [],
                    tags: fullPostInfo.categories || [],
                    // 更新状态
                    status: fullPostInfo.status || 'selling',
                    // 更新交易类型
                    transactionTypeRaw: fullPostInfo.transactionType || goods.transactionTypeRaw,
                    // 更新交易类型显示文本
                    transactionType: this.getTransactionTypeText(fullPostInfo.transactionType) || goods.transactionType
                  };
                }
                return goods;
              });
              
              console.log('合并后的商品列表:', goodsList);
            }
          } catch (postError) {
            console.log('查询POST集合失败，使用收藏记录中的基本信息:', postError);
            // 如果查询POST失败，仍然显示收藏记录中的基本信息
          }
        }
        
      } catch (error) {
        console.error('加载收藏失败:', error);
        console.error('错误详情:', error.message);
        console.error('错误码:', error.errCode);
        
        // 错误处理
        if (error.errCode === -502005) {
          this.setData({
            goodsList: [],
            isLoading: false,
            noData: true,
            noDataMessage: '收藏功能暂未启用'
          });
        } else {
          wx.showToast({
            title: '加载收藏失败',
            icon: 'none'
          });
          this.setData({
            goodsList: [],
            isLoading: false,
            noData: true,
            noDataMessage: '加载失败，请重试'
          });
        }
        return;
      }
    } else {
      // 其他类型逻辑（已发布、进行中、已成交）保持不变
      let query = db.collection('POST');
      
      switch(this.data.type) {
        case 'published':
          query = query.where({
            _openid: openid,
            status: 'selling',
            deleted: db.command.neq(true)
          });
          break;
        case 'inProgress':
          query = query.where({
            _openid: openid,
            status: 'in_progress',
            deleted: db.command.neq(true)
          });
          break;
        case 'completed':
          query = query.where({
            _openid: openid,
            status: 'completed',
            deleted: db.command.neq(true)
          });
          break;
        default:
          query = query.where({
            _openid: openid,
            deleted: db.command.neq(true)
          });
      }
      
      const result = await query.orderBy('createTime', 'desc').get();
      console.log(`加载${this.data.type}商品数量:`, result.data.length);
      goodsList = this.processGoodsData(result.data);
    }
    
    this.setData({ 
      goodsList,
      isLoading: false,
      noData: goodsList.length === 0
    });
    
    if (goodsList.length === 0) {
      this.setData({
        noDataMessage: this.getNoDataMessage(this.data.type)
      });
    }
    
  } catch (error) {
    console.error('加载商品列表失败:', error);
    this.setData({ 
      goodsList: [],
      isLoading: false,
      noData: true,
      noDataMessage: '加载失败，请重试'
    });
    wx.showToast({
      title: '加载失败',
      icon: 'none'
    });
  }
},

  onCancelFavorite(e) {
    const index = e.currentTarget.dataset.index;
    const goods = this.data.goodsList[index];
    const that = this;
    
    wx.showModal({
      title: '确认取消收藏',
      content: '确定要取消收藏这个商品吗？',
      confirmColor: '#ff6b6b',
      success: async function (res) {
        if (res.confirm) {
          try {
            // 获取当前用户openid
            const userInfo = wx.getStorageSync('userInfo');
            const openid = userInfo ? userInfo.openid : null;
            
            if (!openid) {
              wx.showToast({
                title: '请先登录',
                icon: 'none'
              });
              return;
            }
            
            const db = wx.cloud.database();
            
            // 从favorites集合中删除收藏记录
            const result = await db.collection('favorites')
              .where({
                userId: openid,
                postId: goods.id
              })
              .remove();
            
            console.log('取消收藏结果:', result);
            
            if (result.stats.removed > 0) {
              wx.showToast({
                title: '已取消收藏',
                icon: 'success'
              });
              
              // 从列表中移除
              const goodsList = that.data.goodsList;
              goodsList.splice(index, 1);
              that.setData({ 
                goodsList,
                noData: goodsList.length === 0
              });
              
              // 更新本地存储（如果用了的话）
              const localFavorites = wx.getStorageSync('favorites') || [];
              const newLocalFavorites = localFavorites.filter(id => id !== goods.id);
              wx.setStorageSync('favorites', newLocalFavorites);
              
            } else {
              wx.showToast({
                title: '未找到收藏记录',
                icon: 'none'
              });
            }
            
          } catch (error) {
            console.error('取消收藏失败:', error);
            wx.showToast({
              title: '取消收藏失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },
  
  // 获取空数据提示信息
  getNoDataMessage(type) {
    const messageMap = {
      published: '您还没有发布过商品',
      inProgress: '没有进行中的交易',
      completed: '暂无已成交的商品',
      favorites: '暂无收藏的商品',
      default: '暂无数据'
    };
    return messageMap[type] || messageMap.default;
  },

// 处理商品数据 - 根据你提供的实际数据结构修改
processGoodsData(goodsList) {
  return goodsList.map(item => {
    console.log('处理商品数据，原始item:', item); // 调试信息
    
    // 处理商品图片
    let imageUrl = '/images/default.jpg';
    if (item.images && item.images.length > 0 && item.images[0]) {
      imageUrl = item.images[0]; // 直接使用云存储路径
    }
    
    // 处理交易类型显示
    let transactionTypeText = '现金';
    if (item.transactionType === 'swap') {
      transactionTypeText = '换物';
    } else if (item.transactionType === 'both') {
      transactionTypeText = '均可';
    }
    
    // 处理分类标签
    const categories = item.categories || [];
    
    // 处理用户信息 - 根据你提供的数据结构
    let userInfo = {
      nickname: '上财同学',
      avatar: '/images/avatar.png',
      college: '未知学院',
      isVerified: false
    };
    
    // 从publisherInfo中获取用户信息
    if (item.publisherInfo) {
      userInfo = {
        nickname: item.publisherInfo.nickname || '上财同学',
        avatar: item.publisherInfo.avatar || '/images/avatar.png',
        college: item.publisherInfo.college || '未知学院',
        isVerified: item.publisherInfo.isVerified || false
      };
    }
    
    // 构建商品对象
    const goodsObj = {
      id: item._id,
      title: item.title || '无标题',
      description: item.description || '无描述',
      price: parseFloat(item.price) || 0,
      image: imageUrl,
      transactionType: transactionTypeText, // 中文显示
      transactionTypeRaw: item.transactionType || 'cash', // 原始值
      tag: categories,
      tags: categories, // 兼容两个字段
      createTime: this.formatTime(item.createTime),
      status: item.status || 'selling',
      user: userInfo, // 添加用户信息
      expectedSwap: item.expectedSwap || '', // 期望交换的物品
      switch: item.switch || 'object', // 商品类型
      // 其他可能需要的数据
      publisherId: item.publisherId,
      publisherOpenid: item.publisherOpenid,
      favoriteCount: item.favoriteCount || 0,
      viewCount: item.viewCount || 0,
      // 保持原有字段
      favoriteTime: item.favoriteTime || null
    };
    
    console.log('处理后的商品对象:', goodsObj); // 调试信息
    return goodsObj;
  });
},

// 获取交易类型文本（确保有这个函数）
getTransactionTypeText(transactionType) {
  if (transactionType === 'swap') {
    return '换物';
  } else if (transactionType === 'both') {
    return '均可';
  }
  return '现金';
},

  // 格式化时间
  formatTime(time) {
    if (!time) return '刚刚';
    try {
      if (time && time.$date) {
        const dateStr = time.$date;
        return dateStr.replace('T', ' ').substring(0, 16);
      }
      const date = new Date(time);
      if (isNaN(date.getTime())) {
        return String(time).substring(4, 21);
      }
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
    } catch (error) {
      console.error('时间处理错误:', error);
      return String(time).substring(4, 21);
    }
  },

  // 点击商品 - 跳转到详情页
  onGoodsTap(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    if (!id) {
      console.error('商品ID为空');
      wx.showToast({
        title: '商品信息错误',
        icon: 'none'
      });
      return;
    }
    
    console.log('点击商品，ID:', id, '索引:', index);
    
    // 如果是收藏页面，需要传递完整的商品数据
    if (this.data.type === 'favorites') {
      const goods = this.data.goodsList[index];
      const goodsData = encodeURIComponent(JSON.stringify(goods));
      wx.navigateTo({
        url: `/pages/detail/detail?id=${id}&goodsData=${goodsData}`,
        fail: (err) => {
          console.error('跳转失败:', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    } else {
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
    }
  },

  // 图片加载失败处理
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const key = `goodsList[${index}].image`;
    this.setData({
      [key]: '/images/default.jpg'
    });
  },

  // 搜索点击
  onSearchTap() {
    wx.showToast({
      title: '搜索功能开发中',
      icon: 'none'
    });
  },

  // 编辑商品（收藏页面不显示编辑按钮）
  onEditGoods(e) {
    const index = e.currentTarget.dataset.index;
    const goods = this.data.goodsList[index];
    
    wx.navigateTo({
      url: `/pages/publish/publish?id=${goods.id}&mode=edit`
    });
  },

// 删除商品（收藏页面不显示删除按钮）
onDeleteGoods(e) {
  const index = e.currentTarget.dataset.index;
  const goods = this.data.goodsList[index];
  const that = this;
  
  wx.showModal({
    title: '确认删除',
    content: '确定要删除这个商品吗？删除后不可恢复，并且会清理相关收藏记录。',
    confirmColor: '#ff6b6b',
    success: async function (res) {
      if (res.confirm) {
        wx.showLoading({ title: '删除中...' });
        
        try {
          const db = wx.cloud.database();
          
          // 1. 首先获取该商品的所有收藏记录
          const favoritesRes = await db.collection('favorites')
            .where({ postId: goods.id })
            .get();
          
          const favoriteCount = favoritesRes.data.length;
          
          // 2. 从POST集合中直接删除商品（硬删除）
          await db.collection('POST').doc(goods.id).remove();
          console.log('商品从POST集合中删除成功');
          
          // 3. 如果有收藏记录，批量清理它们
          if (favoriteCount > 0) {
            const deletePromises = favoritesRes.data.map(fav => 
              db.collection('favorites').doc(fav._id).remove()
            );
            
            await Promise.all(deletePromises);
            console.log(`清理了 ${favoriteCount} 条相关收藏记录`);
          }
          
          wx.hideLoading();
          
          // 4. 显示更详细的操作结果
          let successMessage = '删除成功';
          if (favoriteCount > 0) {
            successMessage += `，已清理${favoriteCount}条收藏记录`;
          }
          
          wx.showToast({
            title: successMessage,
            icon: 'success',
            duration: 2000
          });
          
          // 5. 从当前列表中移除
          const goodsList = that.data.goodsList;
          goodsList.splice(index, 1);
          that.setData({ 
            goodsList,
            noData: goodsList.length === 0
          });
          
          // 6. 可选：记录删除日志到数据库（用于审计）
          try {
            // 异步记录，不阻塞主流程
            setTimeout(async () => {
              try {
                await db.collection('deletion_logs').add({
                  data: {
                    postId: goods.id,
                    postTitle: goods.title,
                    favoriteRecordsCleaned: favoriteCount,
                    deleteTime: db.serverDate(),
                    _openid: wx.getStorageSync('openid')
                  }
                });
                console.log('删除日志记录成功');
              } catch (logError) {
                console.log('记录删除日志失败:', logError);
              }
            }, 100);
          } catch (logError) {
            // 日志记录失败不影响主流程
          }
          
          // 7. 刷新主页商品
          setTimeout(() => {
            that.refreshHomePage();
            
            // 同时更新收藏统计
            if (favoriteCount > 0 && that.data.type === 'published') {
              // 如果是在"已发布"页面删除商品，需要更新收藏统计
              that.updateFavoritesCount();
            }
          }, 300);
          
        } catch (error) {
          wx.hideLoading();
          console.error('删除失败:', error);
          
          // 错误处理
          let errorMsg = '删除失败';
          if (error.errCode === -504002) {
            errorMsg = '网络异常，请重试';
          } else if (error.errCode === -504003) {
            errorMsg = '商品不存在或已被删除';
          } else if (error.errCode === -504001) {
            errorMsg = '网络超时，请检查网络连接';
          }
          
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2500
          });
        }
      }
    }
  });
},

// 更新收藏统计（新增函数）
async updateFavoritesCount() {
  try {
    const userInfo = wx.getStorageSync('userInfo');
    const openid = userInfo ? userInfo.openid : null;
    
    if (!openid) return;
    
    const db = wx.cloud.database();
    
    // 查询当前用户的收藏数量
    const favoritesRes = await db.collection('favorites')
      .where({ userId: openid })
      .count();
    
    const favoriteCount = favoritesRes.total || 0;
    
    // 更新本地统计显示（如果有需要）
    const app = getApp();
    if (app && app.globalData) {
      // 可以通过全局事件通知其他页面更新
      app.globalData.eventBus.emit('favoritesCountUpdated', favoriteCount);
    }
    
    return favoriteCount;
    
  } catch (error) {
    console.error('更新收藏统计失败:', error);
    return 0;
  }
},

  // 下拉刷新
  onPullDownRefresh() {
    this.loadGoodsList().finally(() => {
      wx.stopPullDownRefresh();
    });
  },
  // 刷新主页商品
refreshHomePage() {
  try {
    // 方法1：通过全局事件通知主页刷新
    const app = getApp();
    if (app && app.globalData) {
      // 触发全局刷新事件
      if (typeof app.globalData.refreshHomePage === 'function') {
        app.globalData.refreshHomePage();
      }
      
      // 或者使用事件总线
      if (app.globalData.eventBus) {
        app.globalData.eventBus.emit('refreshHomePage');
      }
    }
    
    // 方法2：直接获取主页实例并刷新
    try {
      const pages = getCurrentPages();
      if (pages.length > 0) {
        // 查找主页实例
        const homePage = pages.find(page => page.route === 'pages/index/index');
        if (homePage && typeof homePage.loadGoodsList === 'function') {
          homePage.loadGoodsList();
          console.log('已直接刷新主页商品');
        }
      }
    } catch (pageError) {
      console.log('直接刷新主页失败:', pageError);
    }
    
    // 方法3：使用wx.setStorage触发其他页面监听
    wx.setStorage({
      key: 'needRefreshHome',
      data: Date.now(),
      success: () => {
        console.log('已设置主页刷新标志');
      }
    });
    
  } catch (error) {
    console.error('刷新主页失败:', error);
  }
}
});