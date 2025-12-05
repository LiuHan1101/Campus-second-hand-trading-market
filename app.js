// app.js
App({
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
    },
    // 添加防重复标志
    isCheckingLogin: false,
    hasCheckedInitialLogin: false,
    // 添加主页刷新支持
    refreshHomePage: null,
    eventBus: {
      events: {},
      on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
      },
      off(event, callback) {
        if (this.events[event]) {
          this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
      },
      emit(event, data) {
        if (this.events[event]) {
          this.events[event].forEach(callback => callback(data));
        }
      }
    }
  },

  onLaunch: function() {
    console.log('【验证】App onLaunch 执行');
    
    wx.cloud.init({
      env: "cloud1-8gw6xrycfea6d00b",
      traceUser: true
    });

    console.log('【验证】云环境初始化完成');
    
    // 【关键修改】延迟检查，避免立即跳转导致闪烁
    setTimeout(() => {
      this.checkInitialLoginStatus();
    }, 300);
  },

  // 初始登录状态检查（只执行一次）
  checkInitialLoginStatus() {
    if (this.globalData.hasCheckedInitialLogin) return;
    this.globalData.hasCheckedInitialLogin = true;
    
    const token = wx.getStorageSync('token');
    console.log('【初始检查】token存在:', !!token);
    
    if (token) {
      // 有token，验证有效性
      this.checkSession();
    } else {
      // 没有token，跳转到登录页
      console.log('【初始检查】没有token，准备跳转到登录页');
      this.safeNavigateToLogin();
    }
  },

  // 检查登录状态
  async checkSession() {
    // 防止重复检查
    if (this.globalData.isCheckingLogin) return;
    this.globalData.isCheckingLogin = true;
    
    try {
      // 检查微信session是否有效
      await new Promise((resolve, reject) => {
        wx.checkSession({
          success: () => {
            console.log('【checkSession】微信session有效');
            resolve();
          },
          fail: (err) => {
            console.log('【checkSession】微信session失效', err);
            reject(err);
          }
        });
      });
      
      // 【可选】验证自定义token是否有效
      // const userInfo = await this.getUserInfo();
      // this.globalData.userInfo = userInfo;
      
      console.log('【checkSession】登录状态有效');
      
    } catch (error) {
      console.log('【checkSession】验证失败，清除token', error);
      
      // 清除过期的token
      wx.removeStorageSync('token');
      wx.removeStorageSync('userInfo');
      
      // 跳转到登录页
      this.safeNavigateToLogin();
      
    } finally {
      this.globalData.isCheckingLogin = false;
    }
  },

  // 安全的跳转到登录页（防止重复跳转）
  safeNavigateToLogin() {
    // 检查当前页面栈
    const pages = getCurrentPages();
    console.log('【跳转检查】当前页面栈:', pages.map(p => p.route));
    
    // 如果已经在登录页，不重复跳转
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1];
      if (currentPage && currentPage.route === 'pages/login/login') {
        console.log('【跳转检查】当前已在登录页，跳过跳转');
        return;
      }
    }
    
    console.log('【跳转检查】执行跳转到登录页');
    
    // 使用 reLaunch 关闭所有页面，打开登录页
    wx.reLaunch({
      url: '/pages/login/login',
      success: () => {
        console.log('【跳转检查】跳转成功');
      },
      fail: (err) => {
        console.error('【跳转检查】跳转失败:', err);
      }
    });
  },

  // 【重要】保持这个检查方法，供其他页面调用
  checkLogin() {
    const token = wx.getStorageSync('token');
    if (!token) {
      this.safeNavigateToLogin();
      return false;
    }
    return true;
  },

  // 封装登录方法
  async login() {
    try {
      // 1. 获取微信code
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });

      if (!loginRes.code) {
        throw new Error('获取微信登录code失败');
      }

      // 2. 发送code到后端，换取自定义token和用户信息
      const authRes = await this.request({
        url: '/auth/login',
        method: 'POST',
        data: {
          code: loginRes.code
        },
        header: {
          'Content-Type': 'application/json'
        }
      });

      if (authRes.success && authRes.data) {
        // 存储token和用户信息
        wx.setStorageSync('token', authRes.data.token);
        wx.setStorageSync('userInfo', authRes.data.userInfo);
        this.globalData.userInfo = authRes.data.userInfo;
        
        console.log('登录成功', authRes.data.userInfo);
        
        // 登录成功后的回调
        if (this.loginSuccessCallback) {
          this.loginSuccessCallback(authRes.data.userInfo);
        }
        
        return authRes.data;
      } else {
        throw new Error(authRes.message || '登录失败');
      }

    } catch (error) {
      console.error('登录失败:', error);
      
      // 登录失败，跳转到登录页面
      this.safeNavigateToLogin();
      throw error;
    }
  },

  // 跳转到登录页面（供其他地方调用）
  navigateToLogin() {
    this.safeNavigateToLogin();
  },

  // 获取用户信息
  async getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          const userInfo = res.userInfo;
          // 更新用户信息到后端
          this.updateUserInfo(userInfo).then(() => {
            resolve(userInfo);
          }).catch(reject);
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  // 更新用户信息
  async updateUserInfo(userInfo) {
    try {
      const res = await this.request({
        url: '/user/update',
        method: 'POST',
        data: userInfo
      });

      if (res.success) {
        // 更新本地存储的用户信息
        const updatedUserInfo = { ...this.globalData.userInfo, ...userInfo };
        wx.setStorageSync('userInfo', updatedUserInfo);
        this.globalData.userInfo = updatedUserInfo;
        
        return res.data;
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  },

  // 获取用户信息（从后端）
  async getUserInfo() {
    try {
      const res = await this.request({
        url: '/user/info',
        method: 'GET'
      });

      if (res.success) {
        return res.data;
      } else {
        throw new Error(res.message || '获取用户信息失败');
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  },

  // 退出登录
  async logout() {
    try {
      // 调用后端退出接口
      await this.request({
        url: '/auth/logout',
        method: 'POST'
      });
    } catch (error) {
      console.error('退出登录失败:', error);
    } finally {
      // 清除本地存储
      wx.removeStorageSync('token');
      wx.removeStorageSync('userInfo');
      this.globalData.userInfo = null;
      
      // 跳转到登录页
      this.safeNavigateToLogin();
    }
  },

  // 设置登录成功回调
  setLoginSuccessCallback(callback) {
    this.loginSuccessCallback = callback;
  },

  // 图片加载错误处理（这个是Page的方法，不应该在App里，建议删除或移动到对应页面）
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
          'Content-Type': 'application/json',
          ...options.header
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else if (res.statusCode === 401) {
            // token过期，清除token并跳转到登录页
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            this.globalData.userInfo = null;
            
            this.safeNavigateToLogin();
            reject(new Error('登录已过期，请重新登录'));
          } else {
            reject(res);
          }
        },
        fail: reject
      });
    });
  }
});