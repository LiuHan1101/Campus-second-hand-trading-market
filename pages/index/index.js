// pages/index/index.js
Page({
    data: {
      activeTab: 'cash',
      cashGoodsList: [],
      swapGoodsList: [],
      searchValue: '',
      isLoading: false,
      
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
        const processedData = this.processGoodsData(result.data);
        
        // 分离现金和换物商品 - 修复字段名问题
        // 修改后的筛选逻辑
// 现金交易商品：必须是出物，且交易方式为现金或两者皆可
const cashGoods = processedData.filter(item => 
    item.switch === 'object' && (item.transactionType === 'cash' || item.transactionType === 'both')
  );
  
  // 以物换物商品：必须是出物，且交易方式为换物或两者皆可
  const swapGoods = processedData.filter(item => 
    item.switch === 'object' && (item.transactionType === 'swap' || item.transactionType === 'both')
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
  
    // 处理商品数据格式 - 修复字段名问题
   // 处理商品数据格式
processGoodsData(goodsList) {
    return goodsList.map(item => {
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
      
      return {
        id: item._id || item.id,
        title: item.title,
        description: item.description,
        price: parseFloat(item.price) || 0,
        image: imageUrl, // 使用处理后的图片URL
        transactionType: item.transactionType || 'cash',
        tag: item.categories,
        switch:item.switch,
        user: {
          nickname: item.userInfo?.nickname || item.nickname || '匿名用户',
          avatar: item.userInfo?.avatar || item.avatar || '/images/avatar.png',//应该是用户头像
          college: item.college || ''
        },
        expectedSwap: item.expectedSwap || '',
        createTime: this.formatTime(item.createTime), // 在这里格式化时间
        rawData: item
      };
    });
  },

  
    // 加载模拟数据（备用）
    loadMockData() {
      const mockCashData = [
        { 
          id: 1, 
          title: '九成新AirPods耳机', 
          price: 299, 
          image: '/images/demo1.jpg', 
          transactionType: 'cash', 
          user: { nickname: '学长A' },
          description: '音质很好，几乎没用过'
        },
        { 
          id: 2, 
          title: 'Java编程思想教材', 
          price: 25, 
          image: '/images/demo2.jpg', 
          transactionType: 'cash', 
          user: { nickname: '学姐B' },
          description: '大二课本，有详细笔记'
        },
        { 
          id: 3, 
          title: '篮球一个', 
          price: 50, 
          image: '/images/demo3.jpg', 
          transactionType: 'cash', 
          user: { nickname: '学弟C' },
          description: '7成新，气很足'
        }
      ];
  
      const mockSwapData = [
        { 
          id: 4, 
          title: '高数课本', 
          price: 0, 
          image: '/images/demo4.jpg', 
          transactionType: 'swap', 
          user: { nickname: '同学D' }, 
          expectedSwap: '换线性代数课本',
          description: '同济版高数教材'
        },
        { 
          id: 5, 
          title: '蓝牙音箱', 
          price: 0, 
          image: '/images/demo5.jpg', 
          transactionType: 'swap', 
          user: { nickname: '同学E' }, 
          expectedSwap: '换台灯或书籍',
          description: '便携小音箱，音质不错'
        }
      ];
  
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
      const { cashGoodsList, swapGoodsList } = this.data;
      
      const filteredCash = cashGoodsList.filter(item =>
        item.title.includes(keyword) ||
        (item.description && item.description.includes(keyword)) ||
        (item.user.nickname && item.user.nickname.includes(keyword))||//加入类型、tag、时间
        item.categories.includes(keyword)||
        (item.createTime && item.cerateTime.includes(keyword)) ||
        (item.transactionType && item.transactionType.includes(keyword))
      );
      
      const filteredSwap = swapGoodsList.filter(item =>
        item.title.includes(keyword) ||
        (item.description && item.description.includes(keyword)) ||
        (item.expectedSwap && item.expectedSwap.includes(keyword)) ||
        (item.user.nickname && item.user.nickname.includes(keyword))||
        item.categories.includes(keyword)||
        (item.createTime && item.cerateTime.includes(keyword)) ||
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
      const { cashGoodsList, swapGoodsList } = this.data;
      const allGoods = [...cashGoodsList, ...swapGoodsList];
      const goods = allGoods.find(item => item.id === id);
      
      if (goods) {
        wx.navigateTo({
          url: `/pages/detail/detail?id=${id}`
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
            return String(time).substring(4, 21); // "Mon Nov 24 2025 16:22:36" -> "Nov 24 2025 16:22"
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
          return String(time).substring(4, 21); // 降级处理
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