Page({
    data: {
      goodsList: [],
      pageTitle: '在售商品',
      currentType: 'selling'  // 当前显示的商品类型
    },
  
    onLoad: function(options) {
      const type = options.type || 'selling'; // 默认显示在售商品
      
      console.log('商品类型:', type);
      
      // 根据类型设置页面标题和加载数据
      if (type === 'selling') {
        this.setData({
          pageTitle: '在售商品',
          currentType: 'selling'
        });
        wx.setNavigationBarTitle({
          title: '在售商品'
        });
        this.loadSellingGoods();
        
      } else if (type === 'sold') {
        this.setData({
          pageTitle: '已售出商品', 
          currentType: 'sold'
        });
        wx.setNavigationBarTitle({
          title: '已售出商品'
        });
        this.loadSoldGoods();
      }
    },
  
    // 加载在售商品
    loadSellingGoods: function() {
      const db = wx.cloud.database();
      const _ = db.command;
      
      db.collection('POST')
        .where({
          openid: _.eq(wx.getStorageSync('openid')),
          status: 'selling'  // 在售状态
        })
        .orderBy('createTime', 'desc')
        .get()
        .then(res => {
          console.log('在售商品:', res.data);
          this.setData({
            goodsList: res.data
          });
        });
    },
  
    // 加载已售出商品
    loadSoldGoods: function() {
      const db = wx.cloud.database();
      const _ = db.command;
      
      db.collection('POST')
        .where({
          openid: _.eq(wx.getStorageSync('openid')),
          status: 'sold'  // 已售出状态
        })
        .orderBy('createTime', 'desc')
        .get()
        .then(res => {
          console.log('已售出商品:', res.data);
          this.setData({
            goodsList: res.data
          });
        });
    }
  })