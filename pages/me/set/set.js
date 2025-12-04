// pages/me/settings/settings.js
Page({
    data: {
      userInfo: {
        nickname: '加载中...',
        avatar: '/images/avatar.png',
        college: '未知学院'
      },
      settings: [
        {
          title: '编辑个人资料',
          desc: '修改昵称、头像、学院等信息',
          url: '/pages/me/edit-profile/edit-profile',
          type: 'navigate'
        },
        {
          title: '隐私设置',
          desc: '管理个人信息可见性',
          url: '',
          type: 'toggle',
          value: true
        },
        {
          title: '消息通知',
          desc: '接收交易和系统通知',
          url: '',
          type: 'toggle',
          value: true
        },
        {
          title: '语言设置',
          desc: '简体中文',
          url: '',
          type: 'navigate'
        },
        {
          title: '关于上财易物',
          desc: '版本号 1.0.0',
          url: '/pages/me/about/about',
          type: 'navigate'
        },
      ],
      cacheSize: '0.0MB'
    },
  
    onLoad() {
      this.loadUserInfo();
      this.calculateCache();
    },
  
    onShow() {
      // 每次显示页面时重新加载用户信息
      this.loadUserInfo();
    },
  
    // 加载用户信息
    loadUserInfo() {
      try {
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo) {
          this.setData({
            userInfo: {
              ...this.data.userInfo,
              ...userInfo
            }
          });
        }
      } catch (error) {
        console.error('加载用户信息失败:', error);
      }
    },
  
    // 计算缓存大小
    calculateCache() {
      try {
        const { storageInfo } = wx.getStorageInfoSync();
        const cacheSize = (storageInfo.currentSize / 1024).toFixed(1);
        this.setData({ cacheSize: `${cacheSize}MB` });
      } catch (error) {
        console.error('计算缓存大小失败:', error);
      }
    },
  
    // 点击设置项
    onSettingTap(e) {
      const index = e.currentTarget.dataset.index;
      const setting = this.data.settings[index];
      
      switch (setting.type) {
        case 'navigate':
          if (setting.url) {
            wx.navigateTo({
              url: setting.url
            });
          }
          break;
          
        case 'toggle':
          this.toggleSetting(index);
          break;
          
        default:
          wx.showToast({
            title: `${setting.title}功能开发中`,
            icon: 'none'
          });
      }
    },
  
    // 切换开关设置
    toggleSetting(index) {
      const key = `settings[${index}].value`;
      const newValue = !this.data.settings[index].value;
      
      this.setData({
        [key]: newValue
      });
      
      // 保存设置到本地
      this.saveSetting(this.data.settings[index].title, newValue);
    },
  
    // 保存设置
    saveSetting(key, value) {
      try {
        const settings = wx.getStorageSync('appSettings') || {};
        settings[key] = value;
        wx.setStorageSync('appSettings', settings);
      } catch (error) {
        console.error('保存设置失败:', error);
      }
    },
  
    // 联系客服
    contactCustomer() {
      wx.showModal({
        title: '联系客服',
        content: '客服微信：shangcai-service\n工作时间：9:00-18:00\n邮箱：service@shangcai.com',
        showCancel: false,
        confirmText: '知道了'
      });
    },
  
    // 清除缓存
    onClearCache() {
      wx.showModal({
        title: '清除缓存',
        content: `确定要清除 ${this.data.cacheSize} 缓存吗？`,
        confirmColor: '#ff6b6b',
        success: (res) => {
          if (res.confirm) {
            this.clearCache();
          }
        }
      });
    },
  
    // 执行清除缓存
    clearCache() {
      wx.showLoading({
        title: '清除中...',
        mask: true
      });
  
      try {
        // 清除所有本地存储（除了用户信息）
        const userInfo = wx.getStorageSync('userInfo');
        wx.clearStorageSync();
        
        // 重新保存用户信息
        if (userInfo) {
          wx.setStorageSync('userInfo', userInfo);
        }
        
        // 重新计算缓存大小
        this.calculateCache();
        
        wx.hideLoading();
        wx.showToast({
          title: '清除成功',
          icon: 'success'
        });
        
      } catch (error) {
        console.error('清除缓存失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: '清除失败',
          icon: 'none'
        });
      }
    },
  
    // 退出登录
    onLogout() {
      wx.showModal({
        title: '退出登录',
        content: '确定要退出登录吗？',
        confirmColor: '#ff6b6b',
        success: (res) => {
          if (res.confirm) {
            this.logout();
          }
        }
      });
    },
  
    // 执行退出登录
    logout() {
      wx.showLoading({
        title: '退出中...',
        mask: true
      });
  
      try {
        // 清除所有本地存储
        wx.clearStorageSync();
        
        wx.hideLoading();
        
        // 退出成功后跳转到首页
        wx.reLaunch({
          url: '/pages/index/index'
        });
        
      } catch (error) {
        console.error('退出登录失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: '退出失败',
          icon: 'none'
        });
      }
    },
  
    // 分享设置页面
    onShareAppMessage() {
      return {
        title: '上财易物 - 设置',
        path: '/pages/me/settings/settings'
      };
    }
  });