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

  // 添加下拉刷新
  onPullDownRefresh() {
    console.log('下拉刷新');
    this.loadAllGoodsData().then(() => {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      });
    }).catch(err => {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新失败',
        icon: 'error',
        duration: 1500
      });
    });
  },

// 页面显示时刷新数据 - 最简单修改
onShow() {
  // 只在首次加载时获取数据，从详情页返回时不重新加载
  if (!this.data.allGoodsList || this.data.allGoodsList.length === 0) {
    console.log('首次加载商品数据');
    this.loadAllGoodsData(false);
  } else {
    console.log('已有商品数据，保留搜索结果');
    // 不调用任何加载方法，保留当前状态
  }
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

  // 加载所有商品数据 - 修复版
  async loadAllGoodsData() {
    try {
      wx.showLoading({
        title: '加载中...',
        mask: true
      });
      
      const db = wx.cloud.database();
      
      // 获取所有字段，按时间倒序排列（新商品在前）
      const result = await db.collection('POST')
        .orderBy('createTime', 'desc')  // 按创建时间倒序，新商品在前
        .limit(100)  // 限制100条，可根据需要调整
        .get();
      
      console.log('=== 数据库原始数据 ===');
      console.log('总数:', result.data.length);
      
      if (result.data.length > 0) {
        console.log('最新商品:', {
          标题: result.data[0].title,
          发布时间: result.data[0].createTime,
          发布者信息字段: result.data[0].publisherInfo ? 'publisherInfo' : 
                        result.data[0].userInfo ? 'userInfo' : '无',
          发布者昵称: result.data[0].publisherInfo?.nickname || 
                    result.data[0].userInfo?.nickname || 
                    result.data[0].nickname || '无'
        });
        
        console.log('最旧商品:', {
          标题: result.data[result.data.length - 1].title,
          发布时间: result.data[result.data.length - 1].createTime,
          发布者信息字段: result.data[result.data.length - 1].publisherInfo ? 'publisherInfo' : 
                        result.data[result.data.length - 1].userInfo ? 'userInfo' : '无'
        });
      }
      
      const processedData = this.processGoodsData(result.data);
      this.setData({ 
        allGoodsList: processedData,
        searchResults: [] // 清空搜索结果
      });
      
      wx.hideLoading();
      
    } catch (error) {
      console.error('加载商品数据失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  // 处理商品数据 - 修复版，支持多种用户信息字段
  processGoodsData(goodsList) {
    return goodsList.map(item => {
      console.log('处理商品数据:', {
        title: item.title,
        publisherInfo: item.publisherInfo,
        userInfo: item.userInfo,
        nickname: item.nickname
      });
      
      // 统一处理用户信息 - 支持多种数据格式
      let nickname = '匿名用户';
      let avatar = '/images/avatar.png';
      let publisherId = '';
      
      // 优先级：publisherInfo > userInfo > 直接字段
      if (item.publisherInfo && item.publisherInfo.nickname) {
        // 新版本：使用 publisherInfo
        nickname = item.publisherInfo.nickname || '匿名用户';
        avatar = item.publisherInfo.avatar || '/images/avatar.png';
        publisherId = item.publisherId || '';
      } else if (item.userInfo && item.userInfo.nickname) {
        // 旧版本：使用 userInfo
        nickname = item.userInfo.nickname || '匿名用户';
        avatar = item.userInfo.avatar || '/images/avatar.png';
      } else if (item.nickname) {
        // 更早版本：直接字段
        nickname = item.nickname || '匿名用户';
        avatar = item.avatar || '/images/avatar.png';
      }
      
      // 处理图片URL
      let imageUrl = '/images/default.jpg';
      if (item.images && item.images.length > 0 && item.images[0]) {
        const img = item.images[0];
        // 如果是云存储地址，可以直接使用
        imageUrl = img;
      }
      
      // 处理价格
      let price = 0;
      if (typeof item.price === 'number') {
        price = item.price;
      } else if (item.price) {
        price = parseFloat(item.price) || 0;
      }
      
      // 处理分类标签
      let tags = [];
      if (item.categories && Array.isArray(item.categories)) {
        tags = item.categories;
      } else if (item.tag && Array.isArray(item.tag)) {
        tags = item.tag;
      }
      
      return {
        id: item._id || item.id,
        title: item.title || '未命名商品',
        description: item.description || '暂无描述',
        price: price,
        image: imageUrl,
        transactionType: item.transactionType || 'cash',
        tag: tags,
        user: {
          nickname: nickname,
          avatar: avatar,
          publisherId: publisherId
        },
        expectedSwap: item.expectedSwap || '',
        createTime: item.createTime || new Date().toISOString(),
        status: item.status || 'selling',
        // 保存原始数据用于调试
        _raw: {
          publisherInfo: item.publisherInfo,
          userInfo: item.userInfo,
          hasPublisherInfo: !!item.publisherInfo,
          hasUserInfo: !!item.userInfo
        }
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

  // 搜索函数 - 修复版，支持用户昵称搜索
  performSearch(keyword) {
    console.log('=== 执行搜索 ===');
    console.log('关键词:', keyword);
    console.log('商品总数:', this.data.allGoodsList.length);
    console.log('前3个商品:', this.data.allGoodsList.slice(0, 3).map(item => ({
      标题: item.title,
      用户: item.user.nickname,
      时间: item.createTime
    })));
    
    const { allGoodsList } = this.data;
    const searchKey = keyword.toLowerCase().trim();
    
    const results = allGoodsList.filter(item => {
      // 标题搜索
      const titleMatch = item.title && 
                        item.title.toLowerCase().includes(searchKey);
      
      // 描述搜索
      const descMatch = item.description && 
                       item.description.toLowerCase().includes(searchKey);
      
      // 用户昵称搜索 - 重要修复！
      const userMatch = item.user.nickname && 
                       item.user.nickname.toLowerCase().includes(searchKey);
      
      // 期望交换物搜索
      const swapMatch = item.expectedSwap && 
                       item.expectedSwap.toLowerCase().includes(searchKey);
      
      // 分类标签搜索
      const tagMatch = item.tag && 
                      Array.isArray(item.tag) &&
                      item.tag.some(tag => 
                        tag && tag.toLowerCase().includes(searchKey)
                      );
      
      const match = titleMatch || descMatch || userMatch || swapMatch || tagMatch;
      
      if (match) {
        console.log('匹配商品:', {
          标题: item.title,
          用户昵称: item.user.nickname,
          匹配原因: [
            titleMatch && '标题',
            descMatch && '描述',
            userMatch && '用户',
            swapMatch && '交换物',
            tagMatch && '标签'
          ].filter(Boolean).join(', ')
        });
      }
      
      return match;
    });
    
    console.log('搜索结果数量:', results.length);
    console.log('搜索结果标题:', results.map(item => item.title));
    
    this.setData({ searchResults: results });
    
    // 如果没有结果，显示提示
    if (results.length === 0 && keyword.trim()) {
      wx.showToast({
        title: `未找到"${keyword}"的相关商品`,
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 搜索确认
  onSearchConfirm(e) {
    const keyword = e.detail.value.trim();
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
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
  console.log('=== 点击历史记录点击事件触发 ===');
  
  // 【关键修改】更准确的删除按钮判断
  // 方法1：通过事件类型判断
  if (e.type === 'tap' && e.target && e.target.dataset) {
    console.log('事件类型:', e.type);
    console.log('目标元素dataset:', e.target.dataset);
    
    // 如果点击的是删除按钮（删除按钮应该有 delete="true" 或其他标识）
    if (e.target.dataset.delete === 'true' || 
        e.target.dataset.action === 'delete' ||
        e.target.id === 'deleteBtn' ||
        (e.target.className && e.target.className.indexOf('delete') > -1)) {
      console.log('点击的是删除按钮，不执行搜索');
      return;
    }
  }
  
  // 【关键修改】获取关键词的多种方式
  let keyword = '';
  
  // 优先从currentTarget获取
  if (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.keyword) {
    keyword = e.currentTarget.dataset.keyword;
    console.log('从currentTarget获取关键词:', keyword);
  }
  // 其次从target获取
  else if (e.target && e.target.dataset && e.target.dataset.keyword) {
    keyword = e.target.dataset.keyword;
    console.log('从target获取关键词:', keyword);
  }
  // 最后从dataset对象直接获取
  else if (e.detail && e.detail.value) {
    keyword = e.detail.value;
    console.log('从detail获取关键词:', keyword);
  }
  
  console.log('最终获取到的关键词:', keyword);
  
  if (!keyword || keyword.trim() === '') {
    console.warn('关键词为空或无效！');
    wx.showToast({
      title: '请输入搜索关键词',
      icon: 'none',
      duration: 1500
    });
    return;
  }
  
  // 更新搜索框的值
  this.setData({ 
    searchValue: keyword,
    searchResults: [], // 清空之前的结果
    showResults: true,
    showHistory: false
  });
  
  console.log('开始执行搜索，关键词:', keyword);
  
  // 【关键】确保执行搜索
  // 方法1：直接调用performSearch
  if (typeof this.performSearch === 'function') {
    this.performSearch(keyword);
  } 
  // 方法2：如果有onSearchInput或类似方法
  else if (typeof this.onSearchInput === 'function') {
    this.onSearchInput({ detail: { value: keyword } });
  }
  // 方法3：触发搜索按钮的点击
  else {
    console.error('没有找到搜索方法！');
    wx.showToast({
      title: '搜索功能异常',
      icon: 'error'
    });
  }
  
  // 滚动到顶部
  wx.pageScrollTo({ 
    scrollTop: 0, 
    duration: 300 
  });
},
  // 删除单个历史记录
  onDeleteHistory(e) {
    console.log('=== 删除历史记录 ===');
    
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

  // 点击热门标签
  onHotTagTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    console.log('点击热门标签:', keyword);
    
    this.setData({ searchValue: keyword });
    this.addToSearchHistory(keyword);
    this.performSearch(keyword);
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
          wx.showToast({
            title: '已清除',
            icon: 'success',
            duration: 1500
          });
        }
      }
    });
  },

 // 点击搜索结果项 - 修改版，将当前搜索内容添加到历史记录
onResultItemTap(e) {
  const item = e.currentTarget.dataset.item;
  if (!item || !item.id) {
    wx.showToast({
      title: '商品信息错误',
      icon: 'error',
      duration: 1500
    });
    return;
  }
  
  console.log('点击商品项，当前搜索内容:', this.data.searchValue);
  
  // 如果当前输入框有内容，将其添加到搜索历史
  const currentSearchValue = this.data.searchValue.trim();
  if (currentSearchValue) {
    console.log('将当前搜索内容添加到历史记录:', currentSearchValue);
    this.addToSearchHistory(currentSearchValue);
  }
  
  console.log('跳转到商品详情:', item.id);
  wx.navigateTo({
    url: `/pages/detail/detail?id=${item.id}`
  });
},

  // 取消搜索
  onCancel() {
    console.log('清空搜索');
    this.setData({ 
      searchValue: '',
      searchResults: [] 
    });
  },

  // 手动刷新按钮（可在wxml中添加）
  onRefreshTap() {
    wx.showLoading({ title: '刷新中...' });
    this.loadAllGoodsData().then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      });
    });
  }
});