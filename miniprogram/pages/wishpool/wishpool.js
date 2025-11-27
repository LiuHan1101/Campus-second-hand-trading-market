// pages/wishpool/wishpool.js
Page({
    data: {
      activeTab: 'all', // all: 全部, mine: 我的愿望
      searchValue: '',
      wishList: [],
      myWishes: [],
       // 基本侧边栏
    //sidebarValue: 'hot',
    
    // 带徽章的侧边栏
    //sidebarWithBadge: 'all',
    
    // 禁用状态的侧边栏
    //sidebarDisabled: 'enabled',
    
    // 联动内容的侧边栏
    contentSidebar: 'study',
    categoryList: [
        { label: '学习', value: 'study' },
        { label: '生活', value: 'life' },
        { label: '工作', value: 'work' },
        { label: '健康', value: 'health' },
        { label: '娱乐', value: 'entertainment' }
      ],
      isLoading: false
    },
  
// 基本侧边栏变化
onSideBarChange(e) {
    const { value } = e.detail
    this.setData({
      sidebarValue: value
    })
    wx.showToast({
      title: `切换到: ${value}`,
      icon: 'none'
    })
  },

  // 带徽章侧边栏变化
  onSideBarWithBadgeChange(e) {
    this.setData({
      sidebarWithBadge: e.detail.value
    })
  },

  // 内容联动侧边栏变化
  onContentSideBarChange(e) {
    this.setData({
      contentSidebar: e.detail.value
    })
  },

  onLoad() {
    console.log('WishPool 页面加载')
  },
    
    onLoad() {
      this.loadWishesData();
    },
  
    onShow() {
      this.loadWishesData();
    },
  
    // 加载愿望数据 - 连接到云数据库
    async loadWishesData() {
      try {
        this.setData({ isLoading: true });
        
        const db = wx.cloud.database();
        // 查询 wishes 集合，按创建时间倒序
        const result = await db.collection('wishes').orderBy('createTime', 'desc').get();
        
        console.log('从云数据库获取的愿望:', result.data);
        
        if (result.data.length > 0) {
          // 处理数据格式
          const processedData = this.processWishesData(result.data);
          
          // 分离全部愿望和我的愿望（这里先用模拟逻辑，后面可以根据用户ID筛选）
          const allWishes = processedData;
          const myWishes = processedData.filter(item => item.isMine);
          
          this.setData({
            wishList: allWishes,
            myWishes: myWishes
          });
        } else {
          // 如果数据库为空，使用模拟数据
          this.loadMockWishData();
        }
        
      } catch (error) {
        console.error('加载愿望失败:', error);
        // 加载失败时使用模拟数据
        this.loadMockWishData();
      } finally {
        this.setData({ isLoading: false });
      }
    },
  
    // 处理愿望数据格式
    processWishesData(wishesList) {
      return wishesList.map(item => {
        return {
          id: item._id, // 使用云数据库的 _id
          title: item.title,
          description: item.description,
          wishType: item.wishType || 'buy',
          expectedPrice: parseFloat(item.expectedPrice) || 0,
          expectedSwap: item.expectedSwap || '',
          status: item.status || 'pending',
          user: {
            nickname: item.userInfo?.nickname || item.nickname || '匿名用户',
            avatar: item.userInfo?.avatar || item.avatar || '/images/avatar.png',
            college: item.userInfo?.college || item.college || ''
          },
          createTime: item.createTime,
          matchCount: item.matchCount || 0,
          isMine: item.isMine || false, // 可以根据当前用户ID判断
          rawData: item
        };
      });
    },
  
    // 模拟数据（备用）
    loadMockWishData() {
      const mockWishes = [
        {
          id: 1,
          title: '求购线性代数课本',
          description: '需要最新版的线性代数教材，希望有课后习题答案',
          wishType: 'buy',
          expectedPrice: 20,
          expectedSwap: '',
          status: 'pending',
          user: {
            nickname: '数学小白',
            college: '数学学院',
            avatar: '/images/avatar.png'
          },
          createTime: '2024-01-15',
          matchCount: 3,
          isMine: false
        },
        {
          id: 2,
          title: '想用Java书换Python书',
          description: '有一本《Java核心技术》，想换一本《Python编程从入门到实践》',
          wishType: 'swap',
          expectedPrice: 0,
          expectedSwap: 'Python编程从入门到实践',
          status: 'pending',
          user: {
            nickname: '编程爱好者',
            college: '计算机学院',
            avatar: '/images/avatar.png'
          },
          createTime: '2024-01-14',
          matchCount: 1,
          isMine: false
        }
      ];
      
      const myMockWishes = [
        {
          id: 5,
          title: '想要一个机械键盘',
          description: '求一个青轴机械键盘，玩游戏用，预算100元左右',
          wishType: 'buy',
          expectedPrice: 100,
          expectedSwap: '',
          status: 'pending',
          user: {
            nickname: '我',
            college: '会计学院',
            avatar: '/images/avatar.png'
          },
          createTime: '2024-01-16',
          matchCount: 1,
          isMine: true
        }
      ];
      
      this.setData({
        wishList: mockWishes,
        myWishes: myMockWishes
      });
    },
  
    // 切换标签
    switchTab(e) {
      const tab = e.currentTarget.dataset.tab;
      this.setData({ activeTab: tab });
    },
  
    // 搜索愿望
    onSearch(e) {
      const value = e.detail.value;
      this.setData({ searchValue: value });
      
      if (value.trim()) {
        this.filterWishes(value.trim());
      } else {
        // 搜索框为空时恢复所有数据
        this.loadWishesData();
      }
    },
  
    // 筛选愿望
    filterWishes(keyword) {
      const currentList = this.getCurrentList();
      const filtered = currentList.filter(item =>
        item.title.includes(keyword) ||
        (item.description && item.description.includes(keyword)) ||
        (item.expectedSwap && item.expectedSwap.includes(keyword)) ||
        (item.user.nickname && item.user.nickname.includes(keyword))
      );
      
      if (this.data.activeTab === 'mine') {
        this.setData({ myWishes: filtered });
      } else {
        this.setData({ wishList: filtered });
      }
    },
  
    // 发布新愿望
    onPublishWish() {
      wx.showModal({
        title: '发布愿望',
        content: '选择愿望类型',
        confirmText: '求购',
        cancelText: '求换',
        success: (res) => {
          if (res.confirm) {
            this.publishBuyWish();
          } else if (res.cancel) {
            this.publishSwapWish();
          }
        }
      });
    },
  
    // 发布求购愿望
    publishBuyWish() {
      wx.navigateTo({
        url: '/pages/wishpool/publish-wish?type=buy'
      });
    },
  
    // 发布求换愿望
    publishSwapWish() {
      wx.navigateTo({
        url: '/pages/wishpool/publish-wish?type=swap'
      });
    },
  
    // 点击愿望项
    onWishItemTap(e) {
      const id = e.currentTarget.dataset.id;
      const wish = this.getCurrentList().find(item => item.id === id);
      
      if (wish) {
        wx.showActionSheet({
          itemList: ['查看详情', '联系TA', '推荐匹配商品'],
          success: (res) => {
            switch(res.tapIndex) {
              case 0:
                this.viewWishDetail(wish);
                break;
              case 1:
                this.contactWisher(wish);
                break;
              case 2:
                this.recommendGoods(wish);
                break;
            }
          }
        });
      }
    },
  
    // 查看愿望详情
    viewWishDetail(wish) {
      wx.showModal({
        title: wish.title,
        content: `${wish.description}\n\n期望：${
          wish.wishType === 'buy' ? `¥${wish.expectedPrice}` : `换 ${wish.expectedSwap}`
        }`,
        showCancel: false,
        confirmText: '知道了'
      });
    },
  
    // 联系许愿者
    contactWisher(wish) {
      wx.showToast({
        title: `联系${wish.user.nickname}`,
        icon: 'none'
      });
    },
  
    // 推荐匹配商品
    recommendGoods(wish) {
      wx.showToast({
        title: '寻找匹配商品...',
        icon: 'none'
      });
    },
  
    // 获取当前显示的列表
    getCurrentList() {
      return this.data.activeTab === 'mine' ? this.data.myWishes : this.data.wishList;
    },
  
    // 下拉刷新
    onPullDownRefresh() {
      this.loadWishesData().finally(() => {
        wx.stopPullDownRefresh();
      });
    },
  
    // 分享愿望
    onShareWish(e) {
      const id = e.currentTarget.dataset.id;
      const wish = this.getCurrentList().find(item => item.id === id);
      
      if (wish) {
        wx.showShareMenu({
          withShareTicket: true
        });
      }
    },
  
    // 删除我的愿望 - 连接到云数据库
    async onDeleteWish(e) {
      const id = e.currentTarget.dataset.id;
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个愿望吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const db = wx.cloud.database();
              // 从云数据库删除
              await db.collection('wishes').doc(id).remove();
              
              // 从本地数据中移除
              const myWishes = this.data.myWishes.filter(wish => wish.id !== id);
              this.setData({ myWishes });
              
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
            } catch (error) {
              console.error('删除愿望失败:', error);
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          }
        }
      });
    }
  })