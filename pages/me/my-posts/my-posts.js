Page({
  data: {
    postsList: [],
    loading: false,
    debugInfo: '' // 添加调试信息
  },

  onLoad() {
    console.log('页面开始加载...');
    this.loadMyPosts();
  },

  onPullDownRefresh() {
    this.loadMyPosts().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载我发布的商品
  async loadMyPosts() {
    console.log('开始加载商品数据...');
    this.setData({ 
      loading: true,
      debugInfo: '开始加载数据...'
    });

    try {
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 使用您数据库中的openid
      const openid = 'og8tRLBQfquAQ-kzSLAEGM52Br6A';
      
      console.log('查询条件 - openid:', openid);
      this.setData({ debugInfo: `查询openid: ${openid}` });

      // 直接查询POST集合
      console.log('开始数据库查询...');
      const res = await db.collection('POST')
        .where({
          openid: _.eq(openid)
        })
        .orderBy('createTime', 'desc')
        .get();

      console.log('数据库查询结果:', res);
      console.log('数据条数:', res.data.length);
      console.log('详细数据:', JSON.stringify(res.data, null, 2));
      
      this.setData({ 
        debugInfo: `查询到 ${res.data.length} 条数据\n${JSON.stringify(res.data, null, 2)}`
      });

      if (res.data.length === 0) {
        console.log('没有查询到数据，可能的原因：');
        console.log('1. openid 不匹配');
        console.log('2. 集合名称不正确');
        console.log('3. 数据库权限问题');
      }

      const postsList = res.data.map(item => {
        console.log('处理商品项:', item);
        return {
          id: item._id || item.id,
          title: item.title || '无标题',
          description: item.description || '无描述',
          price: item.price || 0,
          images: item.images || ['/images/default-goods.png'],
          categories: item.categories || ['未分类'],
          transactionType: item.transactionType || 'cash',
          status: item.status || 'selling',
          viewCount: item.viewCount || 0,
          likeCount: item.likeCount || 0,
          createTime: item.createTime,
          expectedSwap: item.expectedSwap || '',
          userInfo: item.userInfo || {
            avatar: '/images/avatar.png',
            nickname: '测试用户'
          }
        };
      });
  
      this.setData({
        postsList: postsList,
        loading: false
      });

      console.log('最终渲染的商品列表:', this.data.postsList);

    } catch (error) {
      console.error('从POST集合加载商品失败:', error);
      this.setData({ 
        loading: false,
        debugInfo: `加载失败: ${error.message}`
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 测试查询所有数据（不限制openid）
  async testQueryAll() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('POST')
        .limit(10)
        .get();
      
      console.log('测试查询所有数据:', res);
      this.setData({
        debugInfo: `测试查询所有数据: ${JSON.stringify(res.data, null, 2)}`
      });
    } catch (error) {
      console.error('测试查询失败:', error);
    }
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'selling': '在售中',
      'sold': '已售出', 
      'draft': '草稿箱',
      'pending': '审核中'
    };
    return statusMap[status] || '未知状态';
  },

  // 价格格式化
  formatPrice(price) {
    if (!price) return '0.00';
    
    if (typeof price === 'number' && price > 1e10) {
      return '议价';
    }
    
    const numPrice = Number(price);
    if (isNaN(numPrice)) return '0.00';
    
    if (numPrice > 1000000) {
      return '议价';
    }
    
    return numPrice.toFixed(2);
  },

  // 时间格式化
  formatTime(timestamp) {
    if (!timestamp) return '未知时间';
    
    try {
      let date;
      if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (timestamp.toDate) {
        date = timestamp.toDate();
      } else {
        date = new Date(timestamp);
      }
      
      if (isNaN(date.getTime())) {
        return timestamp; // 直接返回原始字符串
      }
      
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60 * 1000) return '刚刚';
      else if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + '分钟前';
      else if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
      else if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前';
      else return `${date.getMonth() + 1}-${date.getDate()}`;
    } catch (error) {
      return timestamp; // 直接返回原始字符串
    }
  },

  // 发布商品
  onPublishTap() {
    wx.navigateTo({
      url: '/pages/me/my-posts/publish/publish'
    });
  },

  // 测试按钮
  onTestTap() {
    this.testQueryAll();
  }
});