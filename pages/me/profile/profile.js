// pages/me/profile/profile.js
Page({
    data: {
      // 加载状态
      isLoading: true,
      isLoadingGoods: false,
      isLoadingWishes: false,
      showEmptyGoods: false,
      showEmptyWishes: false,
      
      // 用户身份标识
      isViewOtherUser: false,
      targetOpenId: null,
      targetUserId: null,
      
      // 用户信息
      userInfo: {
        nickname: '加载中...',
        avatar: '/images/avatar.png',  // 统一使用avatar字段
        college: '',
        bio: '',
        joinDays: 0,
        creditScore: 4.7,
        tags: ['加载中...']
      },
      
      // 商品数据
      activeGoodsTab: 'published',
      publishedGoods: [],
      wishGoods: [],
      
      // 评价数据（根据实际需求，可能需要从数据库加载）
      ratingScore: 4.7,
      commentCount: 0,
      comments: []
    },
  
    onLoad(options) {
      console.log('个人主页加载，参数:', options);
      
      // 检查登录状态
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        wx.showToast({
          title: '请先登录',
          icon: 'none',
          duration: 1500
        });
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }, 1500);
        return;
      }
  
      // 判断是否查看其他用户
      if (options.userId) {
        // 查看其他用户
        console.log('查看其他用户:', options.userId);
        this.setData({ 
          isViewOtherUser: true, 
          targetUserId: options.userId,
          isLoading: true 
        });
        this.loadOtherUserData(options.userId);
      } else {
        // 查看自己
        console.log('查看自己的主页，openid:', openid);
        this.setData({ 
          isViewOtherUser: false, 
          targetOpenId: openid,
          isLoading: true 
        });
        this.loadUserData();
        this.loadUserGoods();
        this.loadUserWishes();
      }
    },
  
    // 加载用户数据（查看自己时使用）
    async loadUserData() {
      try {
        const openid = this.data.targetOpenId || wx.getStorageSync('openid');
        if (!openid) {
          console.log('未找到openid');
          this.setData({ isLoading: false });
          return;
        }
  
        console.log('加载用户数据，openid:', openid);
  
        // 首先尝试从缓存获取
        const cachedUserInfo = wx.getStorageSync('userInfo');
        
        // 从云数据库查询对应用户
        const db = wx.cloud.database();
        const userResult = await db.collection('users')
          .where({
            $or: [
              { _openid: openid },
              { openid: openid }
            ]
          })
          .get();
  
        console.log('用户查询结果:', userResult);
  
        if (userResult.data.length > 0) {
          const userData = userResult.data[0];
          
          // 统一字段名处理
          const newUserInfo = {
            // 昵称字段
            nickname: userData.nickname || userData.nickName || cachedUserInfo?.nickname || '上财同学',
            
            // 头像字段 - 统一使用avatar
            avatar: userData.avatar || userData.avatarUrl || cachedUserInfo?.avatar || '/images/avatar.png',
            
            // 学院
            college: userData.college || cachedUserInfo?.college || '未知学院',
            
            // 个人简介
            bio: userData.bio || cachedUserInfo?.bio || '',
            
            // 加入天数
            joinDays: this.calculateJoinDays(userData.createTime || cachedUserInfo?.createTime) || 0,
            
            // 信用评分
            creditScore: userData.creditScore || 4.7,
            
            // 标签
            tags: userData.tags || cachedUserInfo?.tags || ['新用户'],
            
            // 保留原始ID
            _id: userData._id,
            openid: userData.openid || userData._openid
          };
  
          console.log('处理后的用户信息:', newUserInfo);
  
          this.setData({ 
            userInfo: newUserInfo,
            isLoading: false 
          });
  
          // 如果是查看自己，更新缓存
          if (!this.data.isViewOtherUser) {
            const cacheData = {
              ...userData,
              ...newUserInfo
            };
            wx.setStorageSync('userInfo', cacheData);
            
            // 更新全局数据
            const app = getApp();
            if (app && app.globalData) {
              app.globalData.userInfo = cacheData;
            }
          }
        } else {
          // 未找到用户数据
          console.log('未找到用户数据');
          this.setData({
            userInfo: {
              ...this.data.userInfo,
              nickname: '用户不存在',
              college: '',
              bio: '',
              tags: ['未找到用户']
            },
            isLoading: false
          });
        }
      } catch (error) {
        console.error('加载用户数据失败:', error);
        this.setData({ isLoading: false });
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
      }
    },
  
    // 加载其他用户数据
    async loadOtherUserData(userId) {
      try {
        console.log('加载其他用户数据，userId:', userId);
        
        const db = wx.cloud.database();
        
        // 1. 根据userId获取用户信息
        const userResult = await db.collection('users').doc(userId).get();
        
        console.log('其他用户查询结果:', userResult);
        
        if (userResult.data) {
          const userData = userResult.data;
          
          // 2. 设置用户信息
          const newUserInfo = {
            nickname: userData.nickname || userData.nickName || '上财同学',
            avatar: userData.avatar || userData.avatarUrl || '/images/avatar.png',
            college: userData.college || '未知学院',
            bio: userData.bio || '',
            joinDays: this.calculateJoinDays(userData.createTime) || 0,
            creditScore: userData.creditScore || 4.7,
            tags: userData.tags || ['该用户暂无标签'],
            _id: userData._id,
            openid: userData.openid || userData._openid
          };
          
          this.setData({ 
            userInfo: newUserInfo,
            targetOpenId: userData.openid || userData._openid,
            isLoading: false 
          });
          
          // 3. 加载该用户的商品和愿望
          this.loadUserGoods();
          this.loadUserWishes();
        } else {
          console.log('未找到其他用户数据');
          this.setData({ 
            userInfo: {
              ...this.data.userInfo,
              nickname: '用户不存在',
              bio: '无法加载用户信息'
            },
            isLoading: false 
          });
        }
      } catch (error) {
        console.error('加载其他用户数据失败:', error);
        this.setData({ 
          userInfo: {
            ...this.data.userInfo,
            nickname: '加载失败',
            bio: '无法加载用户信息'
          },
          isLoading: false 
        });
        wx.showToast({
          title: '加载用户信息失败',
          icon: 'none'
        });
      }
    },
  
    // 加载用户发布的商品
    async loadUserGoods() {
      try {
        const openid = this.data.targetOpenId || wx.getStorageSync('openid');
        if (!openid) {
          console.log('未找到openid，跳过加载商品');
          this.setData({ 
            publishedGoods: [],
            showEmptyGoods: true,
            isLoadingGoods: false 
          });
          return;
        }
  
        console.log('加载用户商品，openid:', openid);
        
        this.setData({ isLoadingGoods: true });
        
        const db = wx.cloud.database();
        const result = await db.collection('POST')
          .where({
            _openid: openid,  // 关键修改：按用户过滤
            status: 'selling'
          })
          .orderBy('createTime', 'desc')
          .limit(20)  // 限制数量，避免过多
          .get();
  
        console.log('商品查询结果:', result);
  
        if (result.data.length === 0) {
          // 没有商品时设置空数组
          console.log('用户没有发布的商品');
          this.setData({ 
            publishedGoods: [],
            showEmptyGoods: true,
            isLoadingGoods: false 
          });
        } else {
          const processedGoods = this.processGoodsData(result.data);
          console.log('处理后的商品数据:', processedGoods);
          this.setData({ 
            publishedGoods: processedGoods,
            showEmptyGoods: false,
            isLoadingGoods: false 
          });
        }
      } catch (error) {
        console.error('加载用户商品失败:', error);
        // 查询失败时设置空数组，不再使用模拟数据
        this.setData({ 
          publishedGoods: [],
          showEmptyGoods: true,
          isLoadingGoods: false 
        });
        
        wx.showToast({
          title: '加载商品失败',
          icon: 'none'
        });
      }
    },
  
    // 加载用户愿望
    async loadUserWishes() {
      try {
        const openid = this.data.targetOpenId || wx.getStorageSync('openid');
        if (!openid) {
          console.log('未找到openid，跳过加载愿望');
          this.setData({ 
            wishGoods: [],
            showEmptyWishes: true,
            isLoadingWishes: false 
          });
          return;
        }
  
        console.log('加载用户愿望，openid:', openid);
        
        this.setData({ isLoadingWishes: true });
        
        const db = wx.cloud.database();
        const result = await db.collection('wishes')
          .where({
            _openid: openid,  // 关键修改：按用户过滤
            status: 'pending'
          })
          .orderBy('createTime', 'desc')
          .limit(20)  // 限制数量
          .get();
  
        console.log('愿望查询结果:', result);
  
        if (result.data.length === 0) {
          console.log('用户没有愿望');
          this.setData({ 
            wishGoods: [],
            showEmptyWishes: true,
            isLoadingWishes: false 
          });
        } else {
          this.setData({ 
            wishGoods: result.data,
            showEmptyWishes: false,
            isLoadingWishes: false 
          });
        }
      } catch (error) {
        console.error('加载用户愿望失败:', error);
        // 查询失败时设置空数组
        this.setData({ 
          wishGoods: [],
          showEmptyWishes: true,
          isLoadingWishes: false 
        });
        
        wx.showToast({
          title: '加载愿望失败',
          icon: 'none'
        });
      }
    },
  
    // 处理商品数据格式
    processGoodsData(goodsList) {
      if (!goodsList || !Array.isArray(goodsList)) {
        return [];
      }
      
      return goodsList.map(item => {
        // 处理图片，优先使用images数组的第一个，否则用image字段
        let image = '/images/default.jpg';
        if (item.images && item.images.length > 0) {
          image = item.images[0];
        } else if (item.image) {
          image = item.image;
        }
        
        return {
          id: item._id || item.id,
          title: item.title || '未命名商品',
          description: item.description || '',
          price: parseFloat(item.price) || 0,
          image: image,
          transactionType: item.transactionType || 'cash',
          createTime: item.createTime,
          status: item.status || 'selling'
        };
      });
    },
  
    // 计算加入天数
    calculateJoinDays(createTime) {
      if (!createTime) {
        console.log('没有创建时间');
        return 0;
      }
      
      console.log('计算加入天数，原始数据:', createTime);
      
      let createDate;
      
      try {
        // 处理多种日期格式
        if (typeof createTime === 'object') {
          // 处理Date对象
          if (createTime.getTime && typeof createTime.getTime === 'function') {
            createDate = createTime;
          } 
          // 处理云数据库日期格式
          else if (createTime.$date) {
            createDate = new Date(createTime.$date);
          }
          // 处理云函数serverDate对象
          else if (createTime.get) {
            // 这是云函数的serverDate对象，我们无法直接转换
            console.log('云函数serverDate对象，使用当前日期计算');
            createDate = new Date(); // 近似处理
          }
        } 
        // 处理字符串
        else if (typeof createTime === 'string') {
          createDate = new Date(createTime);
        }
        // 处理时间戳
        else if (typeof createTime === 'number') {
          createDate = new Date(createTime);
        }
        
        // 检查日期是否有效
        if (!createDate || isNaN(createDate.getTime())) {
          console.warn('无效的日期格式:', createTime);
          return 0;
        }
        
        const now = new Date();
        const diffTime = now.getTime() - createDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // 确保至少显示1天
        const result = Math.max(1, diffDays);
        console.log('计算出的天数:', result);
        return result;
        
      } catch (error) {
        console.error('计算加入天数出错:', error, createTime);
        return 0;
      }
    },
  
    // 切换商品标签
    switchGoodsTab(e) {
      const tab = e.currentTarget.dataset.tab;
      console.log('切换标签:', tab);
      this.setData({ activeGoodsTab: tab });
    },
  
    // 点击商品
    onGoodsTap(e) {
      const id = e.currentTarget.dataset.id;
      const index = e.currentTarget.dataset.index;
      
      if (!id) {
        console.error('商品ID为空');
        wx.showToast({
          title: '商品信息错误',
          icon: 'none'
        });
        return;
      }
      
      console.log('点击商品，ID:', id, '索引:', index);
      
      wx.navigateTo({
        url: `/pages/detail/detail?id=${id}`,
        fail: (err) => {
          console.error('跳转失败:', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    },
  
    // 点击愿望
    onWishTap(e) {
      const id = e.currentTarget.dataset.id;
      const index = e.currentTarget.dataset.index;
      
      console.log('点击愿望，ID:', id, '索引:', index);
      
      wx.showToast({
        title: '查看愿望详情',
        icon: 'none'
      });
      
      // 如果需要跳转到愿望详情页，可以在这里实现
      // wx.navigateTo({
      //   url: `/pages/wishpool/wish-detail/wish-detail?id=${id}`
      // });
    },
  
    // 发送私信
    onSendMessage() {
      if (this.data.isViewOtherUser && this.data.userInfo._id) {
        // 跳转到与目标用户的聊天页面
        wx.navigateTo({
          url: `/pages/chatdetail/chatdetail?targetUserId=${this.data.userInfo._id}&targetNickname=${encodeURIComponent(this.data.userInfo.nickname)}`
        });
      } else {
        wx.navigateTo({
          url: '/pages/chat/chat'
        });
      }
    },
  
    // 编辑个人资料（仅自己可见）
    onEditProfile() {
      if (this.data.isViewOtherUser) {
        wx.showToast({
          title: '不能编辑他人资料',
          icon: 'none'
        });
        return;
      }
      
      console.log('跳转到编辑页面');
      wx.navigateTo({
        url: '/pages/me/edit-profile/edit-profile',
        success: (res) => {
          console.log('跳转成功:', res);
        },
        fail: (err) => {
          console.error('跳转失败:', err);
          wx.showModal({
            title: '跳转失败',
            content: `错误: ${err.errMsg}`,
            showCancel: false
          });
        }
      });
    },
  
    // 添加标签
    onAddTag() {
      wx.showToast({
        title: '添加标签功能开发中',
        icon: 'none'
      });
    },
  
    // 图片加载失败处理
    onImageError(e) {
      const index = e.currentTarget.dataset.index;
      const type = e.currentTarget.dataset.type; // 'goods' 或 'avatar'
      
      console.log('图片加载失败，索引:', index, '类型:', type);
      
      if (type === 'avatar') {
        // 头像加载失败
        this.setData({
          'userInfo.avatar': '/images/avatar.png'
        });
      } else if (type === 'goods') {
        // 商品图片加载失败
        const key = `publishedGoods[${index}].image`;
        this.setData({
          [key]: '/images/default.jpg'
        });
      }
    },
  
    // 页面显示时刷新数据
    onShow() {
      console.log('个人主页显示');
      
      // 如果不是查看其他用户，刷新数据
      if (!this.data.isViewOtherUser) {
        const openid = wx.getStorageSync('openid');
        if (openid) {
          this.setData({ 
            targetOpenId: openid,
            isLoading: true 
          });
          this.loadUserData();
          this.loadUserGoods();
          this.loadUserWishes();
        }
      }
    },
  
    // 下拉刷新
    onPullDownRefresh() {
      console.log('下拉刷新');
      
      if (this.data.isViewOtherUser) {
        // 刷新其他用户数据
        this.loadOtherUserData(this.data.targetUserId);
      } else {
        // 刷新自己数据
        this.loadUserData();
        this.loadUserGoods();
        this.loadUserWishes();
      }
      
      // 停止下拉刷新
      setTimeout(() => {
        wx.stopPullDownRefresh();
      }, 1000);
    },
  
    // 分享功能
    onShareAppMessage() {
      let title = `${this.data.userInfo.nickname}的个人主页`;
      let path = `/pages/me/profile/profile`;
      
      // 如果是查看其他用户，分享时带上userId参数
      if (this.data.isViewOtherUser && this.data.userInfo._id) {
        path += `?userId=${this.data.userInfo._id}`;
      }
      
      return {
        title: title,
        path: path,
        imageUrl: this.data.userInfo.avatar
      };
    }
  });