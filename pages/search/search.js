// pages/search/search.js
Page({
  data: {
    searchValue: '',
    searchHistory: [],
    hotSearchList: ['耳机', '教材', '篮球', '键盘', '台灯', '自行车'],
    searchResults: [],
    allGoodsList: [], // 存储所有商品数据用于搜索
    showClearBtn: false,
    searchType: 'goods', // 搜索类型：goods商品 / wish愿望
    placeholderText: '搜索商品', // 搜索框提示文本
    source: null // 记录来源页面
  },

  onLoad(options) {
    // 获取来源参数，判断是从主页还是许愿池进入
    const source = options.source || 'home';
    console.log('搜索页面来源:', source);
    
    this.setData({ 
      source: source,
      searchType: source === 'wishpool' ? 'wish' : 'goods',
      placeholderText: source === 'wishpool' ? '搜索愿望' : '搜索商品'
    });
    
    this.loadSearchHistory();
    
    // 异步加载数据，不显示加载弹窗
    setTimeout(() => {
      this.loadAllData();
    }, 0);
  },

  // 添加下拉刷新
  onPullDownRefresh() {
    console.log('下拉刷新');
    this.loadAllData().then(() => {
      wx.stopPullDownRefresh();
    }).catch(err => {
      wx.stopPullDownRefresh();
    });
  },

  // 页面显示时刷新数据
  onShow() {
    // 只在首次加载时获取数据，从详情页返回时不重新加载
    if (!this.data.allGoodsList || this.data.allGoodsList.length === 0) {
      console.log('首次加载商品数据');
      this.loadAllData(false);
    } else {
      console.log('已有商品数据，保留搜索结果');
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

  // 加载所有商品数据
async loadAllData() {
  try {
    const db = wx.cloud.database();
    const { searchType } = this.data;
    
    console.log('当前搜索类型:', searchType, '来源:', this.data.source);
    
    if (searchType === 'goods') {
      // 搜索商品：从POST表获取，排除愿望
      const result = await db.collection('POST')
        .where({
          switch: db.command.neq('wish') // 排除愿望
        })
        .orderBy('createTime', 'desc')
        .limit(100)
        .get();
      
      console.log('商品数据加载成功，数量:', result.data.length);
      const processedData = this.processGoodsData(result.data);
      this.setData({ 
        allGoodsList: processedData,
        searchResults: [] // 清空搜索结果
      });
    } else {
      // 搜索愿望：从POST表中筛选愿望
      try {
        const result = await db.collection('POST')
          .where({
            switch: 'wish'
          })
          .orderBy('createTime', 'desc')
          .limit(100)
          .get();
        
        console.log('愿望数据加载成功，数量:', result.data.length);
        const processedData = this.processGoodsData(result.data); // 使用相同的处理函数
        this.setData({ 
          allGoodsList: processedData,
          searchResults: [] // 清空搜索结果
        });
      } catch (error) {
        console.error('愿望数据加载失败:', error);
        // 如果愿望数据加载失败，使用空数组
        this.setData({ 
          allGoodsList: [],
          searchResults: [] // 清空搜索结果
        });
      }
    }
    
  } catch (error) {
    console.error('加载商品数据失败:', error);
    this.setData({ 
      allGoodsList: [],
      searchResults: []
    });
  }
},

  // 处理商品数据
  processGoodsData(goodsList) {
    return goodsList.map(item => {
      // 统一处理用户信息
      let nickname = '匿名用户';
      let avatar = '/images/avatar.png';
      let publisherId = '';
      
      if (item.publisherInfo && item.publisherInfo.nickname) {
        nickname = item.publisherInfo.nickname || '匿名用户';
        avatar = item.publisherInfo.avatar || '/images/avatar.png';
        publisherId = item.publisherId || '';
      } else if (item.userInfo && item.userInfo.nickname) {
        nickname = item.userInfo.nickname || '匿名用户';
        avatar = item.userInfo.avatar || '/images/avatar.png';
      } else if (item.nickname) {
        nickname = item.nickname || '匿名用户';
        avatar = item.avatar || '/images/avatar.png';
      }
      
      // 处理图片URL
      let imageUrl = '/images/default.jpg';
      if (item.images && item.images.length > 0 && item.images[0]) {
        imageUrl = item.images[0];
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
      
      // 处理显示时间
      let displayTime = '';
      if (item.createTime) {
        const createDate = new Date(item.createTime);
        const now = new Date();
        const diffMinutes = Math.floor((now - createDate) / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMinutes < 60) {
          displayTime = `${diffMinutes}分钟前`;
        } else if (diffHours < 24) {
          displayTime = `${diffHours}小时前`;
        } else if (diffDays < 7) {
          displayTime = `${diffDays}天前`;
        } else {
          displayTime = createDate.toLocaleDateString();
        }
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
        switch: item.switch || 'goods',
        createTime: item.createTime || new Date().toISOString(),
        displayTime: displayTime,
        status: item.status || 'selling'
      };
    });
  },

  // 搜索输入
  onSearchInput(e) {
    const value = e.detail.value;
    this.setData({ 
      searchValue: value,
      showClearBtn: value.trim().length > 0 // 有文字时显示清除按钮
    });
    
    if (value.trim()) {
      this.performSearch(value.trim());
    } else {
      this.setData({ searchResults: [] });
    }
  },

  // 清除输入内容
  onClearInput() {
    console.log('清除输入内容');
    this.setData({ 
      searchValue: '',
      searchResults: [],
      showClearBtn: false // 隐藏清除按钮
    });
    
    // 获取焦点回到输入框
    wx.nextTick(() => {
      const query = wx.createSelectorQuery();
      query.select('.search-input').fields({
        properties: ['context']
      }).exec((res) => {
        if (res[0] && res[0].context) {
          res[0].context.focus();
        }
      });
    });
  },

  // 搜索确认
  onSearchConfirm(e) {
    const keyword = e.detail.value.trim();
    if (!keyword) {
      return;
    }
    
    this.addToSearchHistory(keyword);
    this.performSearch(keyword);
  },

  // 搜索函数 - 移除无结果弹窗
  performSearch(keyword) {
    console.log('=== 执行搜索 ===');
    console.log('关键词:', keyword);
    console.log('商品总数:', this.data.allGoodsList.length);
    
    const { allGoodsList, searchType } = this.data;
    const searchKey = keyword.toLowerCase().trim();
    
    const results = allGoodsList.filter(item => {
      // 标题搜索
      const titleMatch = item.title && 
                        item.title.toLowerCase().includes(searchKey);
      
      // 描述搜索
      const descMatch = item.description && 
                       item.description.toLowerCase().includes(searchKey);
      
      // 用户昵称搜索
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
      
      return match;
    });
    
    console.log('搜索结果数量:', results.length);
    
    this.setData({ searchResults: results });
    
    // 移除无结果弹窗提示
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
    
    if (!keyword || keyword.trim() === '') {
      return;
    }
    
    // 更新搜索框的值并显示清除按钮
    this.setData({ 
      searchValue: keyword,
      searchResults: [],
      showClearBtn: true // 显示清除按钮
    });
    
    // 执行搜索
    this.performSearch(keyword);
    
    // 滚动到顶部
    wx.pageScrollTo({ 
      scrollTop: 0, 
      duration: 300 
    });
  },

  // 删除单个历史记录
  onDeleteHistory(e) {
    const index = e.currentTarget.dataset.index;
    
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
    
    this.setData({ 
      searchValue: keyword,
      showClearBtn: true // 显示清除按钮
    });
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

  // 点击搜索结果项
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
    
    // 如果当前输入框有内容，将其添加到搜索历史
    const currentSearchValue = this.data.searchValue.trim();
    if (currentSearchValue) {
      this.addToSearchHistory(currentSearchValue);
    }
    
    wx.navigateTo({
      url: `/pages/detail/detail?id=${item.id}`
    });
  },

  // 修改：原来的取消函数更名为清空输入
  onCancel() {
    this.onClearInput();
  },

  // 手动刷新按钮
  onRefreshTap() {
    this.loadAllData().then(() => {
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      });
    });
  }
});