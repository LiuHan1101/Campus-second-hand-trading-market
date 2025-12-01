// pages/me/my-goods/my-goods.js
Page({
    data: {
      type: '', // published, inProgress, completed, favorites
      goodsList: [],
      searchValue: '',
      isLoading: true,
      currentSwipeIndex: -1 // 当前滑动的项目索引
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
        const db = wx.cloud.database();
        
        let query = db.collection('POST');
        
        // 根据类型设置查询条件
        switch(this.data.type) {
          case 'published':
            query = query.where({
              status: 'selling',
              deleted: db.command.neq(true) // 不包含已删除的
            });
            break;
          case 'inProgress':
            query = query.where({
              status: 'in_progress',
              deleted: db.command.neq(true)
            });
            break;
          case 'completed':
            query = query.where({
              status: 'completed',
              deleted: db.command.neq(true)
            });
            break;
          case 'favorites':
            // 收藏功能需要单独实现，这里先使用selling状态
            query = query.where({
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
        this.setData({ isLoading: false });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    },
  
    // 处理商品数据
    processGoodsData(goodsList) {
      return goodsList.map(item => {
        let imageUrl = '/images/default.jpg';
        if (item.images && item.images.length > 0) {
          imageUrl = item.images[0];
        }
        
        return {
          id: item._id,
          title: item.title,
          description: item.description,
          price: parseFloat(item.price) || 0,
          image: imageUrl,
          transactionType: item.transactionType || 'cash',
          tag: item.categories || [],
          createTime: this.formatTime(item.createTime),
          moveX: 0 // 滑动位置
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
  
    // 滑动变化
    onMovableChange(e) {
      const { x } = e.detail;
      const index = e.currentTarget.dataset.index;
      
      // 限制最大滑动距离
      const maxSwipeDistance = 20; // 最大滑动距离
      const actualX = Math.min(Math.max(x, -maxSwipeDistance), 0);
      
      const key = `goodsList[${index}].moveX`;
      this.setData({
        [key]: actualX
      });
    },
  
    // 滑动结束
    onMovableEnd(e) {
      const { x } = e.detail;
      const index = e.currentTarget.dataset.index;
      
      // 如果滑动距离超过阈值，保持打开状态，否则收回
      const threshold = -100;
      const finalX = x < threshold ? -200 : 0;
      
      const key = `goodsList[${index}].moveX`;
      this.setData({
        [key]: finalX
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