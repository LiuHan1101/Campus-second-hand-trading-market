// pages/me/credit-center/credit-center.js
const app = getApp();

Page({
  data: {
    creditScore: {
      total: 0,
      level: '',
      desc: ''
    },
    dimensionScores: [],
    ratingList: [],
    colors: {}
  },

  onLoad(options) {
    console.log('信用中心页面加载');
    // 确保获取全局颜色
    this.setData({
      colors: app.globalData.colors || {
        neutralLight: '#FAF7F2',
        primaryRed: '#E8B4B8'
      }
    });
    this.loadCreditData();
  },

  onShow() {
    console.log('信用中心页面显示');
    this.loadCreditData();
  },

  // 加载信用数据
  async loadCreditData() {
    try {
      console.log('开始加载信用数据');
      
      // 模拟信用数据 - 实际项目中从服务器获取
      const mockData = {
        total: 850,
        level: '优秀',
        desc: '信用极好，交易体验佳',
        dimensions: [
          { 
            name: '描述相符', 
            score: 4.8, 
            fullScore: 5, 
            desc: '商品与描述一致程度',
            stars: this.renderStars(4.8)
          },
          { 
            name: '守时履约', 
            score: 4.6, 
            fullScore: 5, 
            desc: '按时完成交易约定',
            stars: this.renderStars(4.6)
          },
          { 
            name: '沟通态度', 
            score: 4.9, 
            fullScore: 5, 
            desc: '沟通交流友好程度',
            stars: this.renderStars(4.9)
          }
        ],
        ratings: [
          {
            id: 1,
            username: '张三',
            avatar: '/images/avatar.png',
            transactionType: '现金交易',
            itemName: '九成新AirPods耳机',
            ratingData: { 
              descScore: 5, 
              timeScore: 4, 
              attitudeScore: 5 
            },
            comment: '卖家很耐心，商品和描述完全一致，交易过程很愉快！',
            createTime: '2024-01-15 14:30',
            totalScore: 4.7,
            stars: this.renderStars(4.7)
          },
          {
            id: 2,
            username: '李四',
            avatar: '/images/avatar.png',
            transactionType: '以物换物',
            itemName: '高数课本',
            ratingData: { 
              descScore: 4, 
              timeScore: 5, 
              attitudeScore: 4 
            },
            comment: '换物过程顺利，书本保存得很好',
            createTime: '2024-01-10 10:15',
            totalScore: 4.3,
            stars: this.renderStars(4.3)
          }
        ]
      };

      // 为每个评价计算详细星星
      mockData.ratings.forEach(rating => {
        rating.detailStars = {
          desc: this.renderStars(rating.ratingData.descScore),
          time: this.renderStars(rating.ratingData.timeScore),
          attitude: this.renderStars(rating.ratingData.attitudeScore)
        };
      });

      console.log('设置信用数据:', mockData);
      
      this.setData({
        creditScore: {
          total: mockData.total,
          level: mockData.level,
          desc: mockData.desc
        },
        dimensionScores: mockData.dimensions,
        ratingList: mockData.ratings
      });

    } catch (error) {
      console.error('加载信用数据失败:', error);
      // 设置默认数据防止页面空白
      this.setDefaultData();
    }
  },

  // 设置默认数据
  setDefaultData() {
    const defaultData = {
      creditScore: { 
        total: 600, 
        level: '良好', 
        desc: '信用良好，继续保持' 
      },
      dimensionScores: [
        { 
          name: '描述相符', 
          score: 4.0, 
          fullScore: 5, 
          desc: '商品与描述一致程度',
          stars: this.renderStars(4.0)
        },
        { 
          name: '守时履约', 
          score: 4.0, 
          fullScore: 5, 
          desc: '按时完成交易约定',
          stars: this.renderStars(4.0)
        },
        { 
          name: '沟通态度', 
          score: 4.0, 
          fullScore: 5, 
          desc: '沟通交流友好程度',
          stars: this.renderStars(4.0)
        }
      ],
      ratingList: []
    };

    this.setData(defaultData);
  },

  // 渲染星星
  renderStars(score) {
    const stars = [];
    const fullStars = Math.floor(score);
    const hasHalfStar = score % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('full');
      } else if (i === fullStars && hasHalfStar) {
        stars.push('half');
      } else {
        stars.push('empty');
      }
    }
    return stars;
  },

  // 获取信用等级颜色
  getCreditLevelColor(score) {
    if (!score) return '#E8B4B8';
    if (score >= 800) return '#07C160';
    if (score >= 700) return '#FFB400';
    if (score >= 600) return '#FF6B00';
    return '#FF4757';
  },

  // 查看评价详情
  viewRatingDetail(e) {
    const index = e.currentTarget.dataset.index;
    const rating = this.data.ratingList[index];
    
    wx.showModal({
      title: '评价详情',
      content: `交易用户：${rating.username}
交易类型：${rating.transactionType}
交易商品：${rating.itemName}
描述相符：${rating.ratingData.descScore}星
守时履约：${rating.ratingData.timeScore}星
沟通态度：${rating.ratingData.attitudeScore}星
综合评分：${rating.totalScore}星
评价内容：${rating.comment}
评价时间：${rating.createTime}`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 图片加载失败处理
  onAvatarError(e) {
    const index = e.currentTarget.dataset.index;
    const key = `ratingList[${index}].avatar`;
    this.setData({
      [key]: '/images/avatar.png'
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    console.log('下拉刷新信用数据');
    this.loadCreditData().then(() => {
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  }
});