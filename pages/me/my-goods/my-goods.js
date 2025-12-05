// pages/me/my-goods/my-goods.js
Page({
    data: {
      type: '', // published, inProgress, completed, favorites
      goodsList: [],
      searchValue: '',
      isLoading: true
      // 移除了滑动相关的数据
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
      // 页面显示时重新加载数据，确保编辑后的数据更新
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
        this.setData({ isLoading: true });
        
        // 先获取当前用户的openid
        const openid = wx.getStorageSync('openid');
        if (!openid) {
          console.error('未找到openid，用户未登录');
          this.setData({ 
            goodsList: [],
            isLoading: false 
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
        
        console.log('当前用户openid:', openid);
        
        const db = wx.cloud.database();
        
        let query = db.collection('POST');
        
        // 根据类型设置查询条件
        switch(this.data.type) {
          case 'published':
            query = query.where({
              _openid: openid,  // 只查询当前用户的商品
              status: 'selling',
              deleted: db.command.neq(true)
            });
            break;
          case 'inProgress':
            query = query.where({
              _openid: openid,  // 只查询当前用户的商品
              status: 'in_progress',
              deleted: db.command.neq(true)
            });
            break;
          case 'completed':
            query = query.where({
              _openid: openid,  // 只查询当前用户的商品
              status: 'completed',
              deleted: db.command.neq(true)
            });
            break;
          case 'favorites':
            // 收藏功能需要单独实现，这里先使用selling状态
            query = query.where({
              _openid: openid,  // 只查询当前用户的商品
              status: 'selling',
              deleted: db.command.neq(true)
            });
            break;
        }
  
        const result = await query.orderBy('createTime', 'desc').get();
        console.log('加载商品列表:', result.data);
  
        const goodsList = this.processGoodsData(result.data);
        this.setData({ 
          goodsList,
          isLoading: false 
        });
  
      } catch (error) {
        console.error('加载商品列表失败:', error);
        this.setData({ 
          goodsList: [],
          isLoading: false 
        });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    },
  
    // 处理商品数据 - 移除了moveX字段
    processGoodsData(goodsList) {
      if (!goodsList || !Array.isArray(goodsList)) {
        return [];
      }
      
      console.log('原始商品数据:', goodsList);
      
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
        } else if (item.keywords && Array.isArray(item.keywords)) {
          // 尝试其他可能的字段名
          tags = item.keywords;
        }
        
        console.log('商品ID:', item._id, '标签数据:', tags);
        
        return {
          id: item._id || item.id,
          title: item.title || '未命名商品',
          description: item.description || '',
          price: parseFloat(item.price) || 0,
          image: image,
          transactionType: item.transactionType || 'cash',
          tags: tags, // 确保tags字段被正确添加
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
        
        // 获取愿望标签，支持多种可能的字段名
        let tags = [];
        if (item.tags && Array.isArray(item.tags)) {
          tags = item.tags;
        } else if (item.categories && Array.isArray(item.categories)) {
          tags = item.categories;
        } else if (item.tag) {
          // 如果是单个标签字符串，转为数组
          tags = [item.tag];
        } else if (item.keywords && Array.isArray(item.keywords)) {
          // 尝试其他可能的字段名
          tags = item.keywords;
        }
        
        console.log('愿望ID:', item._id, '标签数据:', tags);
        
        return {
          id: item._id || item.id,
          title: item.title || '未命名愿望',
          shortDescription: item.description ? (item.description.length > 50 ? item.description.substring(0, 50) + '...' : item.description) : '',
          expectedswap: item.expectedswap || '任意物品',
          displayText: item.transactionType === 'swap' ? 
            `期望交换：${item.expectedswap || '任意物品'}` : 
            `价格：${parseFloat(item.price) || 0}元`,
          image: image,
          transactionType: item.transactionType || 'swap',
          transactionTypeText: item.transactionType === 'cash' ? '现金' : 
                              item.transactionType === 'swap' ? '换物' : '均可',
          tags: tags, // 确保tags字段被正确添加
          createTime: this.formatTime(item.createTime),
          status: item.status || 'selling',
          switch: 'wish'
        };
      });
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
  
    // 编辑商品
    onEditGoods(e) {
      const index = e.currentTarget.dataset.index;
      const goods = this.data.goodsList[index];
      
      wx.navigateTo({
        url: `/pages/publish/publish?id=${goods.id}&mode=edit`
      });
    },
  
    // 删除商品
    onDeleteGoods(e) {
      const index = e.currentTarget.dataset.index;
      const goods = this.data.goodsList[index];
      const that = this;
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个商品吗？',
        confirmColor: '#ff6b6b',
        success: async function (res) {
          if (res.confirm) {
            try {
              const db = wx.cloud.database();
              
              // 标记为已删除，而不是真正删除数据
              await db.collection('POST').doc(goods.id).update({
                data: {
                  deleted: true,
                  deleteTime: db.serverDate()
                }
              });
              
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              // 从列表中移除
              const goodsList = that.data.goodsList;
              goodsList.splice(index, 1);
              that.setData({ goodsList });
              
            } catch (error) {
              console.error('删除失败:', error);
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          }
        }
      });
    },
  
    // 下拉刷新
    onPullDownRefresh() {
      this.loadGoodsList().finally(() => {
        wx.stopPullDownRefresh();
      });
    }
  });