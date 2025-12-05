// pages/login/login.js

Page({
    data: {
      isLogging: false,
      loginError: '',
      canIUseGetUserProfile: false
    },
  
    onLoad() {
      // 检查是否支持 getUserProfile
      if (wx.getUserProfile) {
        this.setData({
          canIUseGetUserProfile: true
        });
      }
      
      // 检查是否已有token，有则直接跳转
      const token = wx.getStorageSync('token');
      if (token) {
        this.redirectToHome();
      }
    },
  
    // 微信登录
    async onWechatLogin() {
      if (this.data.isLogging) return;
  
      this.setData({
        isLogging: true,
        loginError: ''
      });
  
      try {
        // 1. 获取微信登录code
        const loginRes = await new Promise((resolve, reject) => {
          wx.login({
            success: resolve,
            fail: reject
          });
        });
  
        if (!loginRes.code) {
          throw new Error('获取登录code失败');
        }
  
        console.log('获取到code:', loginRes.code);
  
        // 2. 这里模拟登录成功，实际应该调用后端接口
        // const result = await getApp().request({
        //   url: '/auth/login',
        //   method: 'POST',
        //   data: {
        //     code: loginRes.code
        //   }
        // });
  
        // 模拟登录成功 - 实际开发时删除这部分
        await this.mockLoginSuccess(loginRes.code);
  
      } catch (error) {
        console.error('登录失败:', error);
        this.setData({
          loginError: error.message || '登录失败，请重试',
          isLogging: false
        });
      }
    },
  
    // 模拟登录成功 - 实际开发时删除这个方法
    mockLoginSuccess(code) {
      return new Promise((resolve) => {
        setTimeout(() => {
          // 模拟token和用户信息
          const mockToken = 'mock_token_' + Date.now();
          const mockUserInfo = {
            nickName: '微信用户',
            avatarUrl: '/images/default-avatar.png'
          };
  
          // 存储token和用户信息
          wx.setStorageSync('token', mockToken);
          wx.setStorageSync('userInfo', mockUserInfo);
          getApp().globalData.userInfo = mockUserInfo;
  
          console.log('模拟登录成功, token:', mockToken);
          
          this.loginSuccess(mockUserInfo);
          resolve();
        }, 1000);
      });
    },
  
    // 获取用户信息授权（新规范）
    onGetUserProfile() {
      wx.getUserProfile({
        desc: '用于完善会员资料', // 请务必填写正确描述
        success: (res) => {
          console.log('用户信息授权成功:', res.userInfo);
          // 保存用户信息
          wx.setStorageSync('userInfo', res.userInfo);
          getApp().globalData.userInfo = res.userInfo;
          
          // 这里可以调用后端接口更新用户信息
          wx.showToast({
            title: '授权成功',
            icon: 'success'
          });
        },
        fail: (err) => {
          console.error('用户信息授权失败:', err);
          wx.showToast({
            title: '授权失败',
            icon: 'none'
          });
        }
      });
    },
  
    // 登录成功处理
    loginSuccess(userInfo) {
      this.setData({
        isLogging: false
      });
  
      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1500,
        success: () => {
          setTimeout(() => {
            this.redirectToHome();
          }, 1500);
        }
      });
    },
  
    // 跳转到首页
    redirectToHome() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    },
  
    // 重新加载
    onRetry() {
      this.onWechatLogin();
    },
  
    // 联系客服
    onContactCustomer() {
      wx.makePhoneCall({
        phoneNumber: '400-000-0000' // 替换为您的客服电话
      });
    }
  });
