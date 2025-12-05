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
          // 尝试从本地存储加载收藏商品ID列表（主方案）
          const localFavorites = wx.getStorageSync('favorites') || [];
          console.log('本地存储的收藏商品ID列表:', localFavorites);
          
          if (localFavorites.length > 0) {
            // 从 POST 集合中查询这些收藏的商品
            const _ = db.command;
            const postIds = localFavorites.filter(id => id && id.length > 0);
            
            if (postIds.length > 0) {
              const query = db.collection('POST')
                .where({
                  _id: _.in(postIds),
                  deleted: _.neq(true)
                })
                .orderBy('createTime', 'desc')
                .get();
              
              const result = await query;
              console.log('从本地存储查询到的收藏商品:', result.data);
              
              if (result.data.length > 0) {
                goodsList = this.processGoodsData(result.data);
                
                // 为每个商品添加收藏标记
                goodsList = goodsList.map(goods => {
                  return {
                    ...goods,
                    isFavorite: true,
                    favoriteId: goods.id, // 本地收藏没有单独的收藏ID，用商品ID替代
                  };
                });
                
                console.log('处理后的收藏商品列表（从本地存储）:', goodsList);
              } else {
                console.log('收藏的商品可能已被删除');
                this.setData({
                  goodsList: [],
                  isLoading: false,
                  noData: true,
                  noDataMessage: '收藏的商品可能已被删除'
                });
                return;
              }
            }
          } else {
            // 本地存储没有收藏，尝试从云数据库加载（备用方案）
            console.log('本地存储无收藏，尝试从云数据库加载');
            
            let favoritesRes;
            
            // 方法1：使用userId字段查询
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
              
              // 方法2：使用_openid字段查询
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
                // 如果云数据库也没有数据，就显示空状态
                this.setData({
                  goodsList: [],
                  isLoading: false,
                  noData: true,
                  noDataMessage: '暂无收藏的商品'
                });
                return;
              }
            }
            
            console.log('收藏记录数量:', favoritesRes.data.length);
            
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
            
            // 将收藏记录转换为商品列表
            goodsList = favoritesRes.data.map(favorite => {
              let imageUrl = '/images/default.jpg';
              if (favorite.postImage) {
                imageUrl = favorite.postImage;
              }
              
              let transactionTypeText = '现金';
              if (favorite.transactionType === 'swap') {
                transactionTypeText = '换物';
              } else if (favorite.transactionType === 'both') {
                transactionTypeText = '均可';
              }
              
              return {
                id: favorite.postId,
                favoriteId: favorite._id,
                title: favorite.postTitle || '未命名商品',
                description: favorite.postDescription || '暂无描述',
                price: parseFloat(favorite.postPrice) || 0,
                image: imageUrl,
                transactionType: transactionTypeText,
                transactionTypeRaw: favorite.transactionType || 'cash',
                tag: [],
                tags: [],
                createTime: this.formatTime(favorite.createTime),
                favoriteTime: this.formatTime(favorite.createTime),
                status: 'selling',
                favoriteRecord: favorite,
                isFavorite: true
              };
            });
            
            // 尝试获取完整的商品信息
            if (goodsList.length > 0) {
              try {
                const postIds = favoritesRes.data
                  .filter(item => item.postId)
                  .map(item => item.postId);
                
                if (postIds.length > 0) {
                  const postsRes = await db.collection('POST')
                    .where({
                      _id: db.command.in(postIds.slice(0, 20)),
                      deleted: db.command.neq(true)
                    })
                    .get();
                  
                  if (postsRes.data.length > 0) {
                    const postMap = {};
                    postsRes.data.forEach(post => {
                      postMap[post._id] = post;
                    });
                    
                    goodsList = goodsList.map(goods => {
                      const fullPostInfo = postMap[goods.id];
                      if (fullPostInfo) {
                        return {
                          ...goods,
                          image: (fullPostInfo.images && fullPostInfo.images.length > 0) 
                            ? fullPostInfo.images[0] 
                            : goods.image,
                          tag: fullPostInfo.categories || [],
                          tags: fullPostInfo.categories || [],
                          status: fullPostInfo.status || 'selling',
                          transactionTypeRaw: fullPostInfo.transactionType || goods.transactionTypeRaw,
                          transactionType: this.getTransactionTypeText(fullPostInfo.transactionType) || goods.transactionType
                        };
                      }
                      return goods;
                    });
                  }
                }
              } catch (postError) {
                console.log('查询完整商品信息失败，使用收藏记录中的基本信息:', postError);
              }
            }
          }
          
        } catch (error) {
          console.error('加载收藏失败:', error);
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
          return;
        }
      } else {
        // 其他类型逻辑（已发布、进行中、已成交）
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
            // 1. 从本地存储中移除（主方案）
            const localFavorites = wx.getStorageSync('favorites') || [];
            const newLocalFavorites = localFavorites.filter(id => id !== goods.id);
            wx.setStorageSync('favorites', newLocalFavorites);
            console.log('从本地存储移除收藏，剩余:', newLocalFavorites.length);
            
            // 2. 尝试从云数据库删除（如果存在）
            try {
              const userInfo = wx.getStorageSync('userInfo');
              const openid = userInfo ? userInfo.openid : null;
              
              if (openid && goods.favoriteId && goods.favoriteId !== goods.id) {
                const db = wx.cloud.database();
                const result = await db.collection('favorites')
                  .doc(goods.favoriteId)
                  .remove();
                console.log('从云数据库删除收藏:', result);
              }
            } catch (dbError) {
              console.log('云数据库删除失败（可能是本地收藏）:', dbError);
            }
            
            // 3. 更新UI
            wx.showToast({
              title: '已取消收藏',
              icon: 'success'
            });
            
            const goodsList = that.data.goodsList;
            goodsList.splice(index, 1);
            that.setData({ 
              goodsList,
              noData: goodsList.length === 0
            });
            
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

  // 处理商品数据
  processGoodsData(goodsList) {
    return goodsList.map(item => {
      // 处理商品图片
      let imageUrl = '/images/default.jpg';
      if (item.images && item.images.length > 0 && item.images[0]) {
        imageUrl = item.images[0];
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
      
      // 处理用户信息
      let userInfo = {
        nickname: '上财同学',
        avatar: '/images/avatar.png',
        college: '未知学院',
        isVerified: false
      };
      
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
        transactionType: transactionTypeText,
        transactionTypeRaw: item.transactionType || 'cash',
        tag: categories,
        tags: categories,
        createTime: this.formatTime(item.createTime),
        status: item.status || 'selling',
        user: userInfo,
        expectedSwap: item.expectedSwap || '',
        switch: item.switch || 'object',
        publisherId: item.publisherId,
        publisherOpenid: item.publisherOpenid,
        favoriteCount: item.favoriteCount || 0,
        viewCount: item.viewCount || 0,
        favoriteTime: item.favoriteTime || null
      };
      
      return goodsObj;
    });
  },

  // 获取交易类型文本
  getTransactionTypeText(transactionType) {
    if (transactionType === 'swap') {
      return '换物';
    } else if (transactionType === 'both') {
      return '均可';
    }
    return '现金';
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
            
            // 4. 显示操作结果
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
            
            // 6. 从本地收藏中移除该商品（如果有）
            const localFavorites = wx.getStorageSync('favorites') || [];
            if (localFavorites.includes(goods.id)) {
              const newLocalFavorites = localFavorites.filter(id => id !== goods.id);
              wx.setStorageSync('favorites', newLocalFavorites);
              console.log('从本地收藏中移除已删除的商品');
            }
            
            // 7. 刷新主页商品
            setTimeout(() => {
              that.refreshHomePage();
            }, 300);
            
          } catch (error) {
            wx.hideLoading();
            console.error('删除失败:', error);
            
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

  // 更新收藏统计
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
      
      // 更新本地存储的收藏数量（如果需要）
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
      // 通过全局事件通知主页刷新
      const app = getApp();
      if (app && app.globalData) {
        if (typeof app.globalData.refreshHomePage === 'function') {
          app.globalData.refreshHomePage();
        }
        
        if (app.globalData.eventBus) {
          app.globalData.eventBus.emit('refreshHomePage');
        }
      }
      
      // 直接获取主页实例并刷新
      try {
        const pages = getCurrentPages();
        if (pages.length > 0) {
          const homePage = pages.find(page => page.route === 'pages/index/index');
          if (homePage && typeof homePage.loadGoodsList === 'function') {
            homePage.loadGoodsList();
            console.log('已直接刷新主页商品');
          }
        }
      } catch (pageError) {
        console.log('直接刷新主页失败:', pageError);
      }
      
      // 使用存储触发刷新
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
  },
  
  // 同步收藏到云数据库（可选功能）
  async syncFavoritesToCloud() {
    try {
      const localFavorites = wx.getStorageSync('favorites') || [];
      if (localFavorites.length === 0) {
        console.log('本地没有收藏需要同步');
        return;
      }
      
      const userInfo = wx.getStorageSync('userInfo');
      const openid = userInfo ? userInfo.openid : null;
      if (!openid) {
        console.log('用户未登录，无法同步收藏');
        return;
      }
      
      const db = wx.cloud.database();
      
      // 查询云数据库中已有的收藏
      const cloudFavorites = await db.collection('favorites')
        .where({ openid: openid })
        .get();
      
      const cloudFavoriteIds = cloudFavorites.data.map(item => item.postId);
      
      // 找出需要新增的收藏
      const newFavorites = localFavorites.filter(id => !cloudFavoriteIds.includes(id));
      
      if (newFavorites.length > 0) {
        console.log('需要同步的收藏数量:', newFavorites.length);
        
        // 批量添加新收藏
        for (const postId of newFavorites) {
          await db.collection('favorites').add({
            data: {
              openid: openid,
              userId: openid,
              postId: postId,
              createTime: db.serverDate()
            }
          });
        }
        
        console.log('收藏同步完成');
        wx.showToast({
          title: '收藏同步成功',
          icon: 'success'
        });
      } else {
        console.log('收藏已是最新，无需同步');
      }
      
    } catch (error) {
      console.error('收藏同步失败:', error);
      wx.showToast({
        title: '收藏同步失败',
        icon: 'none'
      });
    }
  }
});