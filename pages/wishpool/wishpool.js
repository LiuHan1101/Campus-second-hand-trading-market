// pages/wishpool/wishpool.js
Page({
  data: {
    activeTab: 'all',
    searchValue: '',
    wishList: [], // 当前分类的愿望列表
    isLoading: false,
    currentCategoryLabel: '图书教材',
    
    // 分类列表
    contentSidebar: 'books',
    categoryList: [
      { label: '图书教材', value: 'books' },
      { label: '数码产品', value: 'electronics' },
      { label: '服饰鞋包', value: 'clothing' },
      { label: '生活用品', value: 'daily' },
      { label: '运动器材', value: 'sports' },
      { label: '美妆个护', value: 'beauty' },
      { label: '宿舍神器', value: 'dorm' },
      { label: '学习用品', value: 'study' },
      { label: '其他', value: 'other' }
    ]
  },

  onLoad() {
    this.loadWishesByCategory('books');
  },

  onShow() {
    this.loadWishesByCategory(this.data.contentSidebar);
  },

  // 搜索功能 - 跳转到search页面
  onSearch(e) {
    const value = e.detail.value;
    if (value.trim()) {
      wx.navigateTo({
        url: `/pages/search/search?keyword=${value}`
      });
    }
  },

  // 跳转到搜索页面
  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  },

  // 侧边栏分类切换
  onContentSideBarChange(e) {
    const category = e.detail.value;
    this.setData({
      contentSidebar: category
    });
    this.loadWishesByCategory(category);
  },

  // 根据分类加载愿望
  async loadWishesByCategory(category) {
    try {
      this.setData({ isLoading: true });
      
      // 更新当前分类名称
      this.updateCategoryLabel(category);
      
      const db = wx.cloud.database();
      
      // 先尝试从数据库加载愿望数据
      let hasData = false;
      try {
        // 查询指定分类的愿望，按创建时间倒序
        const result = await db.collection('POST')
          .where({
            categories: category,
            switch: 'wish' // 只显示愿望
          })
          .orderBy('createTime', 'desc')
          .get();
        
        console.log(`分类 ${category} 的愿望:`, result.data);
        
        if (result.data.length > 0) {
          const processedData = this.processWishesData(result.data);
          this.setData({
            wishList: processedData
          });
          hasData = true;
        }
      } catch (dbError) {
        console.error('数据库查询失败:', dbError);
      }
      
      // 如果数据库没有数据，使用模拟数据
      if (!hasData) {
        console.log('使用模拟数据');
        this.loadMockWishesByCategory(category);
      }
      
    } catch (error) {
      console.error('加载分类愿望失败:', error);
      // 确保出错时也加载模拟数据
      this.loadMockWishesByCategory(category);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 更新当前分类标签
  updateCategoryLabel(categoryValue) {
    const category = this.data.categoryList.find(item => item.value === categoryValue);
    if (category) {
      this.setData({
        currentCategoryLabel: category.label
      });
    }
  },

  // 处理愿望数据格式 - 删除用户和时间信息
  processWishesData(wishesList) {
    return wishesList.map(item => {
      // 处理图片URL - 支持多张图片
      let allImages = [];
      if (item.images && item.images.length > 0) {
        allImages = item.images.map(img => {
          if (img.startsWith('cloud://') || img.startsWith('http')) {
            return img;
          } else {
            return img;
          }
        });
      }
      
      // 处理显示图片（最多显示3张，多余在第三张显示数量）
      const displayImages = this.processDisplayImages(allImages);
      
      // 处理价格显示 - 改为人民币符号和数字
      let priceDisplay = '';
      if (item.transactionType === 'cash' || item.transactionType === 'both') {
        if (item.priceRange) {
          priceDisplay = '¥' + item.priceRange.replace('元', '').replace('-', '-¥');
        } else if (item.price) {
          priceDisplay = '¥' + item.price;
        }
      }
      
      // 处理自定义标签
      let customTags = [];
      if (item.customTags && Array.isArray(item.customTags)) {
        customTags = item.customTags;
      } else if (item.tags) {
        customTags = Array.isArray(item.tags) ? item.tags : [item.tags];
      }
      
      return {
        id: item._id || item.id,
        title: item.title,
        description: item.description,
        price: parseFloat(item.price) || 0,
        priceDisplay: priceDisplay,
        allImages: allImages, // 所有图片
        displayImages: displayImages.images, // 显示的图片（最多3张）
        totalImages: allImages.length, // 总图片数量
        transactionType: item.transactionType || 'cash',
        customTags: customTags, // 自定义标签
        switch: item.switch,
        expectedSwap: item.expectedSwap || '',
        rawData: item
      };
    });
  },

  // 处理显示图片逻辑 - 保持原有的多图显示逻辑
  processDisplayImages(images) {
    if (!images || images.length === 0) {
      return { images: [], totalImages: 0 };
    }
    
    const displayImages = images.slice(0, 3).map((url, index) => ({ 
      url, 
      isLast: index === 2 && images.length > 3 // 标记是否为最后一张且需要显示数量
    }));
    
    return {
      images: displayImages,
      totalImages: images.length
    };
  },

  // 模拟愿望数据 - 删除用户和时间信息
  loadMockWishesByCategory(category) {
    const mockData = {
      'books': [
        { 
          id: 1, 
          title: '线性代数课本', 
          price: 20, 
          priceRange: '20-30',
          images: ['/images/demo2.jpg', '/images/demo1.jpg', '/images/demo3.jpg', '/images/demo4.jpg'], // 多张图片
          transactionType: 'cash', 
          customTags: ['教材', '数学', '课后答案'], // 自定义标签
          description: '需要上海财经大学出版社的线性代数教材，希望有课后习题答案',
          switch: 'wish'
        },
        { 
          id: 4, 
          title: 'Python编程教材', 
          price: 25, 
          images: ['/images/demo1.jpg'], // 单张图片
          transactionType: 'cash', 
          customTags: ['编程', '计算机'],
          description: 'Python入门教材，人民邮电出版社',
          switch: 'wish'
        }
      ],
      'electronics': [
        { 
          id: 3, 
          title: '机械键盘', 
          price: 0, 
          images: ['/images/demo1.jpg', '/images/demo2.jpg'], // 2张图片
          transactionType: 'swap', 
          customTags: ['外设', '游戏'],
          expectedSwap: '用我的游戏鼠标交换',
          description: '青轴机械键盘，希望换一个雷蛇游戏鼠标',
          switch: 'wish'
        }
      ],
      'sports': [
        { 
          id: 8, 
          title: '篮球', 
          price: 0, 
          images: [], // 无图片
          transactionType: 'swap', 
          customTags: ['运动', '球类'],
          expectedSwap: '用我的足球交换',
          description: '7号篮球，可用全新足球交换',
          switch: 'wish'
        }
      ]
      // ... 其他分类数据
    };
    
    const wishes = mockData[category] || [];
    // 处理模拟数据的图片显示
    const processedWishes = wishes.map(item => {
      const displayImages = this.processDisplayImages(item.images);
      const priceDisplay = item.transactionType === 'cash' || item.transactionType === 'both' ? 
        (item.priceRange ? '¥' + item.priceRange.replace('-', '-¥') : '¥' + item.price) : '';
      
      return {
        ...item,
        displayImages: displayImages.images,
        totalImages: item.images.length,
        priceDisplay: priceDisplay
      };
    });
    
    this.setData({
      wishList: processedWishes
    });
  },

  // 图片加载失败处理
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const imgIndex = e.currentTarget.dataset.imgIndex;
    const key = `wishList[${index}].displayImages[${imgIndex}].url`;
    this.setData({ 
      [key]: '/images/default.jpg'
    });
  },

  // 跳转到愿望详情 - 修复模拟数据跳转问题
  goToDetail(e) {
    console.log('点击事件:', e);
    
    const index = e.currentTarget.dataset.index;
    console.log('点击的索引:', index);
    
    const wish = this.data.wishList[index];
    console.log('愿望数据:', wish);
    
    if (wish) {
        // 统一传递完整数据，让详情页自己处理
        const url = `/pages/detail/detail?goodsData=${encodeURIComponent(JSON.stringify(wish))}&type=wish`;
        console.log('跳转URL:', url);
        
        wx.navigateTo({
            url: url,
            fail: (err) => {
                console.error('跳转失败:', err);
                wx.showToast({
                    title: '跳转失败',
                    icon: 'none'
                });
            }
        });
    } else {
        console.error('未找到愿望数据');
        wx.showToast({
            title: '数据加载中，请稍后',
            icon: 'none'
        });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadWishesByCategory(this.data.contentSidebar).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '上财易物 - 愿望池',
      path: '/pages/wishpool/wishpool'
    };
  }
});
