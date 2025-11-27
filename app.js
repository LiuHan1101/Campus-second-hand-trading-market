// app.js
App({
    onLaunch() {
      // 小程序启动时，检查登录状态
      wx.cloud.init({
          env:"cloud1-8gw6xrycfea6d00b",
          traceUser:true
        });

      const token = wx.getStorageSync('token');
      if (token) {
        // 验证token是否过期
        this.checkSession();
      } else {
        // 跳转到登录页或静默登录
        this.login();
      }
    },
    
    globalData: {
      userInfo: null,
      baseURL: 'https://your-backend-api.com/api/v1',
      // 莫兰迪色系颜色变量
      colors: {
        primaryRed: '#E8B4B8',
        primaryPink: '#F5D5D0', 
        primaryCoral: '#F4A6A3',
        accentYellow: '#F7E4C8',
        accentBeige: '#F2E8D5',
        accentGold: '#E8D0B3',
        neutralLight: '#FAF7F2',
        neutralGray: '#D8CFC7',
        neutralDark: '#8C7B6C',
        neutralText: '#5D534A'
      }
    },
    
    // 封装登录方法
    async login() {
      // 1. 获取微信code
      // 2. 发送code到后端，换取自定义token和用户信息
      // 3. 存储token，并更新globalData.userInfo
    },
    // 图片加载失败处理
onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const { activeTab, cashGoodsList, swapGoodsList } = this.data;
    
    const defaultImage = '/images/default.jpg';
    
    if (activeTab === 'cash') {
      const key = `cashGoodsList[${index}].image`;
      this.setData({ [key]: defaultImage });
    } else {
      const key = `swapGoodsList[${index}].image`;
      this.setData({ [key]: defaultImage });
    }
  },
    // 封装请求方法
    request(options) {
      return new Promise((resolve, reject) => {
        wx.request({
          ...options,
          url: this.globalData.baseURL + options.url,
          header: {
            'Authorization': 'Bearer ' + wx.getStorageSync('token'),
            ...options.header
          },
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.data);
            } else if (res.statusCode === 401) {
              // token过期，重新登录
              this.login().then(() => {
                this.request(options).then(resolve).catch(reject);
              });
            } else {
              reject(res);
            }
          },
          fail: reject
        });
      });
    },



  })