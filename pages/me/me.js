// pages/me/me.js
Page({
    data: {
      userInfo: {
        nickname: '加载中...',
        avatar: '/images/avatar.png',
        college: '',
        isVerified: false,
        joinDays: 0
      },
      stats: {
        published: 0,
        inProgress: 0,
        completed: 0,
        favorites: 0
      },
      menuItems: [
        {
          icon: '/images/credit.png',  
          title: '信用中心',
          type: 'navigate',
          url: '/pages/me/credit-center/credit-center',
          badge: 0
        },
        {
          icon: '/images/service.png',  
          title: '联系客服',
          type: 'contact',
          url: '',
          badge: 0
        },
        {
          icon: '/images/agreement.png',  
          title: '用户协议',
          type: 'navigate',
          url: '/pages/me/agreement/agreement',
          badge: 0
        },
        {
          icon: '/images/set.png',  
          title: '设置',
          type: 'navigate',
          url: '/pages/me/set/set',
          badge: 0
        },
        {
          icon: '/images/help.png', 
          title: '帮助与反馈',
          type: 'navigate',
          url: '/pages/me/help-feedback/help-feedback',
          badge: 0
        }
      ],
      isLoading: true
    },

    onLoad() {
        this.loadUserInfoFromDatabase();
        this.loadUserStats();
      },
    
      onShow() {
        // 每次页面显示时检查是否需要更新
        this.checkProfileUpdate();
        this.loadUserStats();
      },
    
      // 检查是否需要更新个人信息
      checkProfileUpdate() {
        const shouldRefresh = wx.getStorageSync('shouldRefreshProfile');
        if (shouldRefresh) {
          console.log('检测到需要更新个人信息');
          this.loadUserInfoFromDatabase();
          // 清除标志
          wx.removeStorageSync('shouldRefreshProfile');
        }
      },
    
      // 从云数据库加载用户信息 - 增强版本
      async loadUserInfoFromDatabase() {
        try {
          this.setData({ isLoading: true });
          
          const db = wx.cloud.database();
          
          // 先尝试从本地缓存加载（更快）
          const cachedUserInfo = wx.getStorageSync('userInfo');
          if (cachedUserInfo && cachedUserInfo.nickname !== '加载中...') {
            console.log('使用缓存的用户信息:', cachedUserInfo);
            this.setData({
              userInfo: {
                ...this.data.userInfo,
                ...cachedUserInfo
              }
            });
          }
    
          // 然后从云数据库加载最新数据
          console.log('从云数据库加载用户信息...');
          const userResult = await db.collection('users')
            .orderBy('createTime', 'desc')
            .limit(1)
            .get();
    
          console.log('云数据库用户信息:', userResult);
    
          if (userResult.data.length > 0) {
            const userData = userResult.data[0];
            const newUserInfo = {
              nickname: userData.nickname || '上财同学',
              avatar: userData.avatarUrl || userData.avatar || '/images/avatar.png',
              college: userData.college || '未知学院',
              isVerified: userData.isVerified || false,
              joinDays: this.calculateJoinDays(userData.createTime) || 0
            };
    
            console.log('更新后的用户信息:', newUserInfo);
            
            this.setData({
              userInfo: newUserInfo
            });
            
            // 更新缓存
            wx.setStorageSync('userInfo', newUserInfo);
          } else {
            console.log('用户表中没有数据，使用缓存数据');
            // 如果没有云数据，但缓存有数据，就使用缓存
            if (cachedUserInfo) {
              this.setData({
                userInfo: {
                  ...this.data.userInfo,
                  ...cachedUserInfo
                }
              });
            }
          }
    
        } catch (error) {
          console.error('加载用户信息失败:', error);
          // 失败时尝试使用缓存
          const cachedUserInfo = wx.getStorageSync('userInfo');
          if (cachedUserInfo) {
            this.setData({
              userInfo: {
                ...this.data.userInfo,
                ...cachedUserInfo
              }
            });
          }
        } finally {
          this.setData({ isLoading: false });
        }
      },
  
    // 计算加入天数
    calculateJoinDays(createTime) {
      if (!createTime) return 0;
      
      const createDate = new Date(createTime);
      const now = new Date();
      const diffTime = now - createDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > 0 ? diffDays : 0;
    },

    // 加载用户统计数据
    async loadUserStats() {
      try {
        const db = wx.cloud.database();
        
        // 获取已发布商品数量
        const publishedResult = await db.collection('POST')
          .where({
            status: 'selling'
          })
          .count();
        
        // 获取已售出商品数量（需要你的业务逻辑）
        const inProgressResult = await db.collection('POST')
          .where({
            status: 'in_progress'
          })
          .count();
        
        // 获取愿望数量
        const favoritesResult = await db.collection('wishes')
          .where({
            status: 'pending'
          })
          .count();
  
        this.setData({
          stats: {
            published: publishedResult.total || 0,
            inProgress: inProgressResult.total || 0,
            completed: 0,  // 需要已成交记录表
            favorites: favoritesResult.total || 0
          }
        });
  
        // 更新菜单徽章
        this.updateMenuBadges();
  
      } catch (error) {
        console.error('加载统计数据失败:', error);
        // 使用默认数据
        this.setData({
          stats: {
            published: 0,
            inProgress: 0,
            completed: 0,
            favorites: 0
          }
        });
      }
    },
  
    // 更新菜单徽章
    updateMenuBadges() {
      const menuItems = [...this.data.menuItems];
      
      // 更新帮助与反馈徽章（现在索引为2）
      menuItems[2].badge = this.data.stats.favorites;
      
      this.setData({ menuItems });
    },
  
    // 点击菜单项
    onMenuItemTap(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.menuItems[index];
      
      console.log('点击菜单项:', item.title, '类型:', item.type);
      
      // 根据类型处理不同的菜单项
      switch (item.type) {
        case 'navigate':
          if (item.url) {
            wx.navigateTo({
              url: item.url,
              success: (res) => {
                console.log('跳转成功:', res);
              },
              fail: (err) => {
                console.error('跳转失败:', err);
                this.showNavigationError(item.title, err);
              }
            });
          } else {
            wx.showToast({
              title: `${item.title}功能开发中`,
              icon: 'none'
            });
          }
          break;
          
        case 'contact':
          // 处理联系客服
          this.contactCustomer();
          break;
          
        default:
          wx.showToast({
            title: `${item.title}功能开发中`,
            icon: 'none'
          });
      }
    },
    
    // 添加联系客服函数
    contactCustomer() {
      wx.showModal({
        title: '联系客服',
        content: '客服微信：shangcai-service\n工作时间：9:00-18:00\n邮箱：service@shangcai.com',
        showCancel: false,
        confirmText: '知道了'
      });
    },
  
      // 显示导航错误信息
      showNavigationError(title, error) {
        wx.showModal({
          title: '跳转失败',
          content: `无法打开${title}\n错误: ${error.errMsg}\n\n请检查页面文件是否存在`,
          showCancel: false,
          confirmText: '知道了'
        });
      },

    // 点击用户信息区域 - 唯一进入个人主页的入口
    onUserInfoTap() {
        console.log('跳转到个人主页');
        
        // 直接跳转到个人主页
        wx.navigateTo({
          url: '/pages/me/profile/profile',
          success: (res) => {
            console.log('跳转到个人主页成功:', res);
          },
          fail: (err) => {
            console.error('跳转到个人主页失败:', err);
            // 显示具体错误信息
            wx.showModal({
              title: '跳转失败',
              content: `错误: ${err.errMsg}\n\n请检查个人主页文件是否存在`,
              showCancel: false
            });
          }
        });
    },

    // 点击数据统计项
    onStatItemTap(e) {
      const type = e.currentTarget.dataset.type;
      const statsMap = {
        published: '已发布商品',
        inProgress: '进行中交易',
        completed: '已成交',
        favorites: '收藏'
      };
      // 跳转到对应的列表页面
      let url = '';
      switch(type) {
        case 'published':
          url = '/pages/me/my-goods/my-goods?type=published';
          break;
        case 'inProgress':
          url = '/pages/me/my-goods/my-goods?type=inProgress';
          break;
        case 'completed':
          url = '/pages/me/my-goods/my-goods?type=completed';
          break;
        case 'favorites':
          url = '/pages/me/my-goods/my-goods?type=favorites';
          break;
      }
  
      if (url) {
        wx.navigateTo({
          url: url
        });
      }
      
      wx.showToast({
        title: `查看${statsMap[type]}`,
        icon: 'none'
      });
    },
  
    // 分享功能
    onShareAppMessage() {
      return {
        title: `${this.data.userInfo.nickname}邀请你使用上财易物`,
        path: '/pages/index/index',
        imageUrl: '/images/share-logo.png'
      };
    },
  
    // 联系客服
    onContactCustomer() {
      wx.showModal({
        title: '联系客服',
        content: '客服微信：shangcai-service\n工作时间：9:00-18:00',
        showCancel: false
      });
    },
  })