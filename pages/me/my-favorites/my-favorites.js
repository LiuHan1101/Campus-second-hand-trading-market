Page({
    data: {
      favoritesList: [],
      loading: false
    },
  
    onLoad() {
      this.loadFavorites();
    },
  
    async loadFavorites() {
      this.setData({ loading: true });
      
      try {
        const db = wx.cloud.database();
        const _ = db.command;
        
        // 假设有一个收藏集合
        const res = await db.collection('favorites')
          .where({
            openid: _.eq(wx.getStorageSync('openid'))
          })
          .orderBy('createTime', 'desc')
          .get();
          
        this.setData({
          favoritesList: res.data,
          loading: false
        });
        
      } catch (error) {
        console.error('加载收藏失败:', error);
        this.setData({ loading: false });
      }
    },
  
    onFavoriteTap(e) {
      const goodsId = e.currentTarget.dataset.id;
      wx.navigateTo({
        url: `/pages/goods-detail/goods-detail?id=${goodsId}`
      });
    },
  
    onRemoveFavorite(e) {
      const favoriteId = e.currentTarget.dataset.id;
      // 移除收藏逻辑
    }
  })