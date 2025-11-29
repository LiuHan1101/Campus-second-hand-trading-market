// pages/search/search.js
Page({
    data: {
      searchValue: '',
      searchHistory: [],
      hotSearchList: ['耳机', '教材', '篮球', '键盘', '台灯', '自行车'],
      searchResults: [],
      allGoodsList: [] // 存储所有商品数据用于搜索
    },
  
    onLoad(options) {
      this.loadSearchHistory();
      this.loadAllGoodsData();
    },
  
    // 加载搜索历史
    loadSearchHistory() {
      const history = wx.getStorageSync('searchHistory') || [];
      this.setData({ searchHistory: history });
    },
  
    // 保存搜索历史
    saveSearchHistory() {
      wx.setStorageSync('searchHistory', this.data.searchHistory);
    },
  
    // 加载所有商品数据
    async loadAllGoodsData() {
      try {
        const db = wx.cloud.database();
        const result = await db.collection('POST').get();
        
        // 处理商品数据格式（使用您之前的 processGoodsData 方法）
        const processedData = this.processGoodsData(result.data);
        
        this.setData({ allGoodsList: processedData });
      } catch (error) {
        console.error('加载商品数据失败:', error);
      }
    },
  
    // 处理商品数据（复用您之前的方法）
    processGoodsData(goodsList) {
      return goodsList.map(item => {
        let imageUrl = '/images/default.jpg';
        if (item.images && item.images.length > 0) {
          if (item.images[0].startsWith('cloud://') || item.images[0].startsWith('http')) {
            imageUrl = item.images[0];
          } else {
            imageUrl = item.images[0];
          }
        }
        
        return {
          id: item._id || item.id,
          title: item.title,
          description: item.description,
          price: parseFloat(item.price) || 0,
          image: imageUrl,
          transactionType: item.transactionType || 'cash',
          tag: item.categories || [],
          user: {
            nickname: item.userInfo?.nickname || item.nickname || '匿名用户',
            avatar: item.userInfo?.avatar || item.avatar || '/images/avatar.png'
          },
          expectedSwap: item.expectedSwap || '',
          createTime: item.createTime
        };
      });
    },
  
    // 搜索输入
    onSearchInput(e) {
      const value = e.detail.value;
      this.setData({ searchValue: value });
      
      if (value.trim()) {
        this.performSearch(value.trim());
      } else {
        this.setData({ searchResults: [] });
      }
    },
  
    // 执行搜索
    performSearch(keyword) {
      const { allGoodsList } = this.data;
      
      const results = allGoodsList.filter(item =>
        item.title.includes(keyword) ||
        (item.description && item.description.includes(keyword)) ||
        (item.user.nickname && item.user.nickname.includes(keyword)) ||
        (item.tag && item.tag.some(tag => tag.includes(keyword))) ||
        (item.expectedSwap && item.expectedSwap.includes(keyword))
      );
      
      this.setData({ searchResults: results });
    },
  
    // 搜索确认
    onSearchConfirm(e) {
      const keyword = e.detail.value.trim();
      if (!keyword) return;
      
      this.addToSearchHistory(keyword);
      this.performSearch(keyword);
    },
  
    // 添加到搜索历史
    addToSearchHistory(keyword) {
      let history = [...this.data.searchHistory];
      
      // 移除已存在的相同关键词
      history = history.filter(item => item !== keyword);
      
      // 添加到开头
      history.unshift(keyword);
      
      // 限制历史记录数量
      if (history.length > 10) {
        history = history.slice(0, 10);
      }
      
      this.setData({ searchHistory: history });
      this.saveSearchHistory();
    },
  
    // 点击历史记录
    onHistoryItemTap(e) {
      const keyword = e.currentTarget.dataset.keyword;
      this.setData({ searchValue: keyword });
      this.performSearch(keyword);
    },
  
    // 点击热门标签
    onHotTagTap(e) {
      const keyword = e.currentTarget.dataset.keyword;
      this.setData({ searchValue: keyword });
      this.addToSearchHistory(keyword);
      this.performSearch(keyword);
    },
// 删除单个历史记录
onDeleteHistory(e) {
    const index = e.currentTarget.dataset.index;
    console.log('要删除的索引:', index);
    
    let history = [...this.data.searchHistory];
    history.splice(index, 1);
    
    this.setData({ 
      searchHistory: history 
    });
    
    this.saveSearchHistory();
    
    wx.showToast({
      title: '已删除',
      icon: 'success',
      duration: 1000
    });
  },
  
    // 一键清除历史记录
    onClearAllHistory() {
      wx.showModal({
        title: '提示',
        content: '确定要清除所有搜索历史吗？',
        success: (res) => {
          if (res.confirm) {
            this.setData({ searchHistory: [] });
            this.saveSearchHistory();
          }
        }
      });
    },

    
  
    // 点击搜索结果项
    onResultItemTap(e) {
      const item = e.currentTarget.dataset.item;
      wx.navigateTo({
        url: `/pages/detail/detail?id=${item.id}`
      });
    },

  // 删除单个历史记录
onDeleteHistory(e) {
    // 注意：这里没有 e.stopPropagation()！
    const index = e.currentTarget.dataset.index;
    console.log('要删除的索引:', index);
    
    let history = [...this.data.searchHistory];
    history.splice(index, 1);
    
    this.setData({ 
      searchHistory: history 
    });
    
    this.saveSearchHistory();
    
    wx.showToast({
      title: '已删除',
      icon: 'success',
      duration: 1000
    });
  },
  
    // 取消搜索
    onCancel() {
      wx.navigateBack();
    }
  });