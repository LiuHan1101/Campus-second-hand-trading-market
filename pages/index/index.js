// pages/index/index.js
Page({
  data: {
    activeTab: 'cash',
    cashGoodsList: [],
    swapGoodsList: [],
    searchValue: '',
    isLoading: false,
    // 注意：不要在 data 中放 Map，微信小程序会序列化 data 导致 Map 方法丢失
  },

  // 切换标签
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  },

  // 图片加载失败处理
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const { activeTab } = this.data;

    console.log('图片加载失败，使用默认图片:', e.detail);

    // 根据当前标签更新对应的图片
    if (activeTab === 'cash') {
      const key = `cashGoodsList[${index}].image`;
      this.setData({
        [key]: '/images/default.jpg'
      });
    } else {
      const key = `swapGoodsList[${index}].image`;
      this.setData({
        [key]: '/images/default.jpg'
      });
    }
  },

  onLoad() {
    // 在页面实例上创建非响应性缓存，避免放入 data（会被序列化）
    this.userCache = new Map();
    this.loadGoodsData();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadGoodsData();
  },

  // 切换现金/换物标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 加载商品数据（优先从数据库，失败则用模拟数据）
  async loadGoodsData() {
    // 先尝试从数据库加载
    const success = await this.loadGoodsFromDatabase();

    // 如果数据库加载失败，使用模拟数据
    if (!success) {
      this.loadMockData();
    }
  },

  // 从云数据库加载商品
  async loadGoodsFromDatabase() {
    try {
      this.setData({ isLoading: true });

      // 获取数据库引用
      const db = wx.cloud.database();
      // 查询POST集合，按创建时间倒序排列
      const result = await db.collection('POST').orderBy('createTime', 'desc').get();

      console.log('从云数据库获取的商品:', result.data);

      // 处理数据格式
      const processedData = await this.processGoodsData(result.data);

      // 分离现金和换物商品
      const cashGoods = processedData.filter(item =>
        item.switch === 'object' && (item.rawData.transactionType === 'cash' || item.rawData.transactionType === 'both')
      );

      const swapGoods = processedData.filter(item =>
        item.switch === 'object' && (item.rawData.transactionType === 'swap' || item.rawData.transactionType === 'both')
      );

      console.log('现金商品数量:', cashGoods.length);
      console.log('换物商品数量:', swapGoods.length);

      this.setData({
        cashGoodsList: cashGoods,
        swapGoodsList: swapGoods
      });

      return true;
    } catch (error) {
      console.error('从云数据库加载失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
      return false;
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 处理商品数据格式 - 修改为异步以支持用户信息查询
  async processGoodsData(goodsList) {
    const that = this;
    const processedItems = [];

    for (const item of goodsList) {
      // 处理图片URL
      let imageUrl = '/images/default.jpg';

      if (item.images && item.images.length > 0) {
        // 如果是云文件ID，直接使用
        if (item.images[0].startsWith('cloud://')) {
          imageUrl = item.images[0];
        }
        // 如果是网络URL，直接使用
        else if (item.images[0].startsWith('http')) {
          imageUrl = item.images[0];
        }
        // 如果是本地路径，需要检查文件是否存在
        else {
          imageUrl = item.images[0];
        }
      }

      // 获取用户信息
      const userInfo = await this.getUserInfo(item);

      const processedItem = {
        id: item._id || item.id,
        title: item.title,
        description: item.description,
        price: parseFloat(item.price) || 0,
        image: imageUrl, // 使用处理后的图片URL
        transactionType: that.showTransactionType(item.transactionType),
        tag: item.categories,
        switch: item.switch,
        user: userInfo, // 使用获取到的用户信息
        expectedSwap: item.expectedSwap || '',
        createTime: that.formatTime(item.createTime),
        rawData: item // 保留原始数据用于筛选
      };

      processedItems.push(processedItem);
    }

    return processedItems;
  },

  // 获取用户信息
  async getUserInfo(item) {
    try {
      // 1. 如果商品中有完整的publisherInfo，直接使用
      if (item.publisherInfo && item.publisherInfo.nickname) {
        return {
          nickname: item.publisherInfo.nickname || '上财同学',
          avatar: item.publisherInfo.avatar || item.publisherInfo.avatarUrl || '/images/avatar.png',
          college: item.publisherInfo.college || '未知学院',
          isVerified: item.publisherInfo.isVerified || false,
          userId: item.publisherId
        };
      }

      // 2. 尝试从缓存获取
      const userOpenid = item.publisherOpenid || item._openid;
      if (!userOpenid) {
        return this.getDefaultUserInfo();
      }

      if (this.userCache && this.userCache.has && this.userCache.has(userOpenid)) {
        return this.userCache.get(userOpenid);
      }

      // 3. 从users数据库查询
      const db = wx.cloud.database();
      const userRes = await db.collection('users')
        .where({ openid: userOpenid })
        .get();

      if (userRes.data.length > 0) {
        const userData = userRes.data[0];
        const userInfo = {
          nickname: userData.nickname || userData.nickName || '上财同学',
          avatar: userData.avatar || userData.avatarUrl || '/images/avatar.png',
          college: userData.college || '未知学院',
          isVerified: userData.isVerified || false,
          userId: userData._id
        };

        // 存入缓存（保存在页面实例上）
        if (!this.userCache) this.userCache = new Map();
        this.userCache.set(userOpenid, userInfo);
        return userInfo;
      } else {
        return this.getDefaultUserInfo();
      }

    } catch (error) {
      console.error('获取用户信息失败:', error);
      return this.getDefaultUserInfo();
    }
  },

  // 获取默认用户信息
  getDefaultUserInfo() {
    return {
      nickname: '上财同学',
      avatar: '/images/avatar.png',
      college: '未知学院',
      isVerified: false,
      userId: null
    };
  },

  // 显示交易类型的中文
  showTransactionType(transactionType) {
    if (transactionType === 'cash') {
      return '现金';
    } else if (transactionType === 'swap') {
      return '换物';
    } else {
      return '均可';
    }
  },

  // 加载模拟数据（备用）
  loadMockData() {
    const mockCashData = [{
        id: 1,
        title: '九成新AirPods耳机',
        price: 299,
        image: '/images/demo1.jpg',
        transactionType: '现金',
        user: {
          nickname: '学长A',
          avatar: '/images/avatar.png',
          college: '计算机学院',
          isVerified: true
        },
        description: '音质很好，几乎没用过',
        tag: ['数码产品'],
        switch: 'object',
        createTime: '2024-01-15 10:30',
        rawData: {
          transactionType: 'cash'
        }
      },
      {
        id: 2,
        title: 'Java编程思想教材',
        price: 25,
        image: '/images/demo2.jpg',
        transactionType: '现金',
        user: {
          nickname: '学姐B',
          avatar: '/images/avatar.png',
          college: '软件学院',
          isVerified: false
        },
        description: '大二课本，有详细笔记',
        tag: ['图书教材'],
        switch: 'object',
        createTime: '2024-01-14 14:20',
        rawData: {
          transactionType: 'cash'
        }
      }
    ];

    const mockSwapData = [{
      id: 4,
      title: '高数课本',
      price: 0,
      image: '/images/demo4.jpg',
      transactionType: '换物',
      user: {
        nickname: '同学D',
        avatar: '/images/avatar.png',
        college: '数学学院',
        isVerified: false
      },
      expectedSwap: '换线性代数课本',
      description: '同济版高数教材',
      tag: ['图书教材'],
      switch: 'object',
      createTime: '2024-01-13 16:45',
      rawData: {
        transactionType: 'swap'
      }
    }];

    this.setData({
      cashGoodsList: mockCashData,
      swapGoodsList: mockSwapData
    });
  },

  // 跳转到搜索页面
  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  },

  // 筛选商品
  filterGoods(keyword) {
    const {
      cashGoodsList,
      swapGoodsList
    } = this.data;

    const filteredCash = cashGoodsList.filter(item =>
      item.title.includes(keyword) ||
      (item.description && item.description.includes(keyword)) ||
      (item.user.nickname && item.user.nickname.includes(keyword)) ||
      (item.tag && item.tag.some(tag => tag.includes(keyword))) ||
      (item.createTime && item.createTime.includes(keyword)) ||
      (item.transactionType && item.transactionType.includes(keyword))
    );

    const filteredSwap = swapGoodsList.filter(item =>
      item.title.includes(keyword) ||
      (item.description && item.description.includes(keyword)) ||
      (item.expectedSwap && item.expectedSwap.includes(keyword)) ||
      (item.user.nickname && item.user.nickname.includes(keyword)) ||
      (item.tag && item.tag.some(tag => tag.includes(keyword))) ||
      (item.createTime && item.createTime.includes(keyword)) ||
      (item.transactionType && item.transactionType.includes(keyword))
    );

    this.setData({
      cashGoodsList: filteredCash,
      swapGoodsList: filteredSwap
    });
  },

  // 跳转到详情页
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    const {
      cashGoodsList,
      swapGoodsList
    } = this.data;
    const allGoods = [...cashGoodsList, ...swapGoodsList];
    const goods = allGoods.find(item => item.id === id);

    if (goods) {
      // 传递商品数据，包含完整的用户信息
      const goodsData = encodeURIComponent(JSON.stringify(goods));
      wx.navigateTo({
        url: `/pages/detail/detail?id=${id}&goodsData=${goodsData}`
      });
    }
  },

  formatTime(time) {
    console.log('调试 - 原始时间:', time);

    if (!time) return '刚刚';

    try {
      // 如果是云数据库服务器时间对象
      if (time && time.$date) {
        const dateStr = time.$date;
        return dateStr.replace('T', ' ').substring(0, 16);
      }

      // 统一转换为 Date 对象处理
      const date = new Date(time);

      if (isNaN(date.getTime())) {
        // 如果转换失败，返回简化版本
        return String(time).substring(4, 21);
      }

      // 成功转换，格式化输出
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

  // 下拉刷新
  onPullDownRefresh() {
    this.loadGoodsData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    // 这里可以添加分页加载逻辑
    console.log('触发底部，可以加载更多数据');
  }
});