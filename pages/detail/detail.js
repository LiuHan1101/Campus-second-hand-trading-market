// pages/detail/detail.js
Page({
    data: {
      goods: {},
      isFavorite: false,
      isWish: false,
      showConfirmPopup: false,
      popupProductInfo: null,
      isLoading: true,
      publisherInfo: null // 添加发布者信息字段
    },
  
    onLoad(options) {
      console.log('详情页参数:', options);
      
      const id = options.id;
      const type = options.type;
      const goodsData = options.goodsData;
      
      // 设置是否为愿望
      this.setData({
        isWish: type === 'wish'
      });
      
      if (goodsData) {
        // 如果有传递的完整数据，直接使用
        this.loadGoodsFromData(goodsData);
      } else if (id) {
        // 如果有ID，从数据库加载
        this.loadGoodsFromDatabase(id);
      } else {
        wx.showToast({
          title: '数据加载失败',
          icon: 'none'
        });
        wx.navigateBack();
      }
    },
  
    // 从传递的数据加载商品
    loadGoodsFromData(goodsData) {
      try {
        const data = JSON.parse(decodeURIComponent(goodsData));
        const goods = this.processGoodsData(data);
        
        this.setData({ 
          goods,
          isLoading: false
        });
        
        this.checkFavoriteStatus(goods.id);
        
        // 加载发布者信息
        this.loadPublisherInfo(goods);
        
      } catch (error) {
        console.error('解析商品数据失败:', error);
        wx.showToast({
          title: '数据加载失败',
          icon: 'none'
        });
        this.setData({ isLoading: false });
      }
    },
  
    // 从数据库加载商品
    async loadGoodsFromDatabase(id) {
      try {
        this.setData({ isLoading: true });
        
        const db = wx.cloud.database();
        const result = await db.collection('POST').doc(id).get();
        
        const goods = this.processGoodsData(result.data);
        
        this.setData({ 
          goods,
          isLoading: false
        });
        
        this.checkFavoriteStatus(id);
        
        // 加载发布者信息
        await this.loadPublisherInfo(goods);
        
      } catch (error) {
        console.error('加载商品详情失败:', error);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
        this.setData({ isLoading: false });
      }
    },
  
    // 加载发布者信息
    async loadPublisherInfo(goods) {
      try {
        // 如果商品数据中已经有完整的publisherInfo，直接使用
        if (goods.publisherInfo && goods.publisherInfo.nickname) {
          console.log('使用商品中的发布者信息:', goods.publisherInfo);
          this.setData({
            publisherInfo: {
              ...goods.publisherInfo,
              // 确保有默认值
              nickname: goods.publisherInfo.nickname || '上财同学',
              avatar: goods.publisherInfo.avatar || goods.publisherInfo.avatarUrl || '/images/avatar.png',
              college: goods.publisherInfo.college || '未知学院',
              isVerified: goods.publisherInfo.isVerified || false
            }
          });
          return;
        }
        
        // 如果商品有publisherOpenid或userOpenid，从users数据库查询最新信息
        const publisherOpenid = goods.publisherOpenid || goods.userOpenid;
        if (publisherOpenid) {
          console.log('从users数据库查询发布者信息，openid:', publisherOpenid);
          
          const db = wx.cloud.database();
          const userRes = await db.collection('users')
            .where({ openid: publisherOpenid })
            .get();
          
          if (userRes.data.length > 0) {
            const userData = userRes.data[0];
            console.log('从数据库获取的发布者信息:', userData);
            
            const publisherInfo = {
              nickname: userData.nickname || userData.nickName || '上财同学',
              avatar: userData.avatar || userData.avatarUrl || '/images/avatar.png',
              college: userData.college || '未知学院',
              isVerified: userData.isVerified || false,
              openid: publisherOpenid,
              userId: userData._id,
              // 其他可选信息
              studentId: userData.studentId || '',
              phone: userData.phone || '',
              gender: userData.gender || 0,
              bio: userData.bio || ''
            };
            
            this.setData({ publisherInfo });
            
            // 可选：更新商品中的发布者信息（异步）
            this.updateGoodsPublisherInfo(goods.id, publisherInfo);
            
          } else {
            // 如果没有找到用户，使用默认信息
            this.setDefaultPublisherInfo();
          }
        } else if (goods._openid) {
          // 如果有_openid，尝试查询
          console.log('使用_openid查询发布者:', goods._openid);
          await this.loadUserByOpenid(goods._openid);
        } else {
          // 都没有，使用默认信息
          this.setDefaultPublisherInfo();
        }
        
      } catch (error) {
        console.error('加载发布者信息失败:', error);
        this.setDefaultPublisherInfo();
      }
    },
  
    // 通过openid查询用户
    async loadUserByOpenid(openid) {
      try {
        const db = wx.cloud.database();
        const userRes = await db.collection('users')
          .where({ openid: openid })
          .get();
        
        if (userRes.data.length > 0) {
          const userData = userRes.data[0];
          const publisherInfo = {
            nickname: userData.nickname || userData.nickName || '上财同学',
            avatar: userData.avatar || userData.avatarUrl || '/images/avatar.png',
            college: userData.college || '未知学院',
            isVerified: userData.isVerified || false,
            openid: openid,
            userId: userData._id
          };
          
          this.setData({ publisherInfo });
        } else {
          this.setDefaultPublisherInfo();
        }
      } catch (error) {
        console.error('通过openid查询用户失败:', error);
        this.setDefaultPublisherInfo();
      }
    },
  
    // 设置默认发布者信息
    setDefaultPublisherInfo() {
      this.setData({
        publisherInfo: {
          nickname: '上财同学',
          avatar: '/images/avatar.png',
          college: '未知学院',
          isVerified: false
        }
      });
    },
  
    // 更新商品中的发布者信息（异步）
    async updateGoodsPublisherInfo(goodsId, publisherInfo) {
      try {
        const db = wx.cloud.database();
        await db.collection('POST').doc(goodsId).update({
          data: {
            'publisherInfo.nickname': publisherInfo.nickname,
            'publisherInfo.avatar': publisherInfo.avatar,
            'publisherInfo.college': publisherInfo.college,
            'publisherInfo.isVerified': publisherInfo.isVerified,
            updateTime: db.serverDate()
          }
        });
        console.log('商品发布者信息已更新');
      } catch (error) {
        console.error('更新商品发布者信息失败:', error);
        // 不显示错误，不影响主要功能
      }
    },
  
    // 处理商品数据 - 增强兼容性
    processGoodsData(data) {
      // 处理图片
      let images = [];
      if (data.images && data.images.length > 0) {
        images = data.images;
      } else if (data.image) {
        images = [data.image];
      } else {
        images = ['/images/default.jpg'];
      }
      
      // 处理标签
      let tags = [];
      if (data.customTags && Array.isArray(data.customTags)) {
        tags = data.customTags;
      } else if (data.tag) {
        tags = Array.isArray(data.tag) ? data.tag : [data.tag];
      } else if (data.categories) {
        tags = Array.isArray(data.categories) ? data.categories : [data.categories];
      }
      
      // 处理用户信息（保留原有逻辑，用于兼容）
      let userInfo = {
        nickname: '匿名用户',
        avatar: '/images/avatar.png',
        college: ''
      };
      
      if (data.user && typeof data.user === 'object') {
        userInfo = {
          nickname: data.user.nickname || userInfo.nickname,
          avatar: data.user.avatar || userInfo.avatar,
          college: data.user.college || userInfo.college
        };
      } else if (data.nickname) {
        userInfo.nickname = data.nickname;
      }
      
      // 提取发布者信息
        const publisherInfo = data.publisherInfo || {
          nickname: userInfo.nickname,
          avatar: userInfo.avatar,
          college: userInfo.college
        };

        // 如果传入的是从列表页处理过的 goodsData，原始文档可能在 data.rawData
        const raw = data.rawData || null;
        // 优先从多种可能的位置提取发布者 openid
        const extractedPublisherOpenid = data.publisherOpenid || data._openid || (raw && (raw.publisherOpenid || raw._openid)) || '';
      
      return {
        id: data._id || data.id || Date.now().toString(),
        title: data.title || '未知商品',
        description: data.description || '暂无描述',
        price: parseFloat(data.price) || 0,
        priceRange: data.priceRange || '',
        images: images,
        transactionType: data.transactionType || 'cash',
        tags: tags,
        expectedSwap: data.expectedSwap || '',
        viewCount: data.viewCount || 0,
        createTime: data.createTime || '',
        switch: data.switch || 'object',
        user: userInfo,
        // 添加发布者相关字段
        publisherOpenid: extractedPublisherOpenid,
        publisherInfo: publisherInfo,
        _openid: data._openid || (raw && raw._openid) || '',
        // 保留原始数据以便后续回退查找
        rawData: raw
      };
    },
  
    // 检查收藏状态
    checkFavoriteStatus(goodsId) {
      const favorites = wx.getStorageSync('favorites') || [];
      const isFavorite = favorites.includes(goodsId);
      this.setData({ isFavorite });
    },
  
    // 切换收藏状态
    onToggleFavorite() {
      const { goods, isFavorite } = this.data;
      const favorites = wx.getStorageSync('favorites') || [];
      
      let newFavorites;
      if (isFavorite) {
        newFavorites = favorites.filter(id => id !== goods.id);
        wx.showToast({ title: '取消收藏', icon: 'success' });
      } else {
        newFavorites = [...favorites, goods.id];
        wx.showToast({ title: '收藏成功', icon: 'success' });
      }
      
      wx.setStorageSync('favorites', newFavorites);
      this.setData({ isFavorite: !isFavorite });
    },
  
    // 查看发布者详情 - 修复跳转逻辑
    onViewPublisherDetail() {
      const { publisherInfo, goods } = this.data;
      
      // 先检查发布者信息是否完整；如果没有 userId/openid，则尝试使用商品中的 _openid 作为回退
      if (!publisherInfo) {
        wx.showToast({
          title: '用户信息不完整',
          icon: 'none'
        });
        return;
      }

      if (!publisherInfo.userId && !publisherInfo.openid) {
        // 有时页面是从列表页传来的已处理数据，其中原始文档的 _openid 在 goods.rawData 中
        const fallbackOpenid = (goods && (goods.publisherOpenid || goods._openid))
          || (goods && goods.rawData && (goods.rawData.publisherOpenid || goods.rawData._openid));

        if (fallbackOpenid) {
          publisherInfo.openid = fallbackOpenid;
          this.setData({ publisherInfo });
          // 继续后续逻辑，允许通过 openid 查询用户并跳转
        } else {
          wx.showToast({
            title: '用户信息不完整',
            icon: 'none'
          });
          return;
        }
      }
      
      // 获取当前用户的openid和userInfo
      const currentOpenid = wx.getStorageSync('openid');
      const currentUserInfo = wx.getStorageSync('userInfo') || {};
      
      // 判断是否是查看自己的主页
      // 比较方式：openid或userId（优先使用userId）
      let isCurrentUser = false;
      
      if (publisherInfo.userId) {
        // 如果有userId，比较userId
        isCurrentUser = currentUserInfo._id === publisherInfo.userId;
      } else if (currentOpenid && publisherInfo.openid) {
        // 如果没有userId但都有openid，比较openid
        isCurrentUser = currentOpenid === publisherInfo.openid;
      } else if (currentOpenid && goods._openid) {
        // 如果发布者信息中没有openid，使用商品中的_openid比较
        isCurrentUser = currentOpenid === goods._openid;
      }
      
      console.log('发布者信息:', publisherInfo);
      console.log('当前用户信息:', { openid: currentOpenid, userId: currentUserInfo._id });
      console.log('是否是当前用户:', isCurrentUser);
      
      if (isCurrentUser) {
        // 如果是当前用户的发布，不跳转（只做提示或静默处理）
        console.log('发布者为当前用户，取消跳转');
        wx.showToast({
          title: '这是您发布的商品',
          icon: 'none',
          duration: 1200
        });
        return;
      } else {
        // 查看他人主页，传递userId参数
        if (publisherInfo.userId) {
          console.log('跳转到他人个人主页，userId:', publisherInfo.userId);
          // 对昵称进行编码，防止特殊字符问题
          const encodedNickname = encodeURIComponent(publisherInfo.nickname || '');
          wx.navigateTo({
            url: `/pages/me/profile/profile?userId=${publisherInfo.userId}&nickname=${encodedNickname}`,
            fail: (err) => {
              console.error('跳转失败:', err);
              wx.showToast({
                title: '跳转失败',
                icon: 'none'
              });
            }
          });
        } else if (publisherInfo.openid) {
          // 如果没有userId但有openid，尝试通过openid查询用户
          console.log('通过openid查询用户:', publisherInfo.openid);
          this.navigateByOpenid(publisherInfo.openid);
        } else {
          wx.showToast({
            title: '无法获取用户信息',
            icon: 'none'
          });
        }
      }
    },
  
    // 通过openid跳转到用户主页
    async navigateByOpenid(openid) {
      try {
        wx.showLoading({
          title: '加载中...',
          mask: true
        });
        
        const db = wx.cloud.database();
        const userRes = await db.collection('users')
          .where({ openid: openid })
          .get();
        
        wx.hideLoading();
        
        if (userRes.data.length > 0) {
          const userData = userRes.data[0];
          console.log('通过openid查询到的用户:', userData);
          
          const encodedNickname = encodeURIComponent(userData.nickname || userData.nickName || '上财同学');
          wx.navigateTo({
            url: `/pages/me/profile/profile?userId=${userData._id}&nickname=${encodedNickname}`,
            fail: (err) => {
              console.error('跳转失败:', err);
              wx.showToast({
                title: '跳转失败',
                icon: 'none'
              });
            }
          });
        } else {
          wx.showToast({
            title: '用户不存在',
            icon: 'none'
          });
        }
      } catch (error) {
        wx.hideLoading();
        console.error('通过openid查询用户失败:', error);
        wx.showToast({
          title: '加载用户信息失败',
          icon: 'none'
        });
      }
    },
  
    // 聊天 - 使用 postId
    onChat() {
      const { goods, publisherInfo } = this.data;
      
      // 可以传递发布者信息给聊天页面
      const chatData = {
        postId: goods.id,
        postTitle: goods.title,
        publisherId: publisherInfo?.userId || '',
        publisherName: publisherInfo?.nickname || '发布者'
      };
      
      wx.navigateTo({
        url: `/pages/chatdetail/chatdetail?chatData=${encodeURIComponent(JSON.stringify(chatData))}`
      });
              // 在商品详情页或用户信息页跳转时
          const goToChat = async (sellerId, postId) => {
            try {
              // 获取卖家详细信息
              const db = wx.cloud.database();
              const sellerRes = await db.collection('users').doc(sellerId).get();
              const postRes = await db.collection('POST').doc(postId).get();
              
              const sellerInfo = sellerRes.data;
              const postInfo = postRes.data;
              
              // 准备聊天数据
              const chatData = {
                sellerId: sellerId,
                sellerNickname: sellerInfo.nickname || '商家',
                sellerAvatar: sellerInfo.avatar || sellerInfo.avatarUrl || '/images/avatar.png',
                sellerCollege: sellerInfo.college || '',
                postId: postId,
                postTitle: postInfo.title || '相关商品',
                postPrice: postInfo.price,
                postImage: postInfo.images?.[0] || ''
              };
              
              // 编码数据并跳转
              const encodedData = encodeURIComponent(JSON.stringify(chatData));
              wx.navigateTo({
                url: `/pages/chatdetail/chatdetail?chatData=${encodedData}`
              });
              
            } catch (error) {
              console.error('跳转聊天失败:', error);
              // 简化版本，只传递必要参数
              wx.navigateTo({
                url: `/pages/chatdetail/chatdetail?sellerId=${sellerId}&postId=${postId}`
              });
            }
          };
    },
  
    // 购买/出售
    onBuy() {
      const { isWish, goods } = this.data;
      
      if (isWish) {
        // 许愿商品：立即出售（我有这个物品，卖给他）
        wx.showToast({
          title: '出售功能开发中',
          icon: 'none'
        });
      } else {
        // 出物商品：立即购买 - 显示确认弹窗
        this.showConfirmPopup(goods);
      }
    },
  
    // 显示确认弹窗
    showConfirmPopup(goods) {
      this.setData({
        showConfirmPopup: true,
        popupProductInfo: {
          image: goods.images && goods.images.length > 0 ? goods.images[0] : '/images/default.jpg',
          title: goods.title,
          price: goods.price
        }
      });
    },
  
    // 弹窗关闭事件
    onPopupClose() {
      this.setData({
        showConfirmPopup: false
      });
    },
  
    // 弹窗取消事件
    onPopupCancel() {
      console.log('用户取消交易');
      this.setData({
        showConfirmPopup: false
      });
    },
  
    // 弹窗确认事件
    onPopupConfirm(e) {
      const transactionInfo = e.detail;
      console.log('交易信息:', transactionInfo);
      
      // 这里处理交易确认逻辑
      wx.showToast({
        title: '交易确认成功',
        icon: 'success'
      });
      
      // 可以在这里调用云函数或API提交交易信息
      this.submitTransaction(transactionInfo);
      
      this.setData({
        showConfirmPopup: false
      });
    },
  
    // 提交交易信息到后端
    async submitTransaction(transactionInfo) {
      try {
        // 示例：调用云函数提交交易信息
        const result = await wx.cloud.callFunction({
          name: 'createTransaction',
          data: {
            goodsId: this.data.goods.id,
            ...transactionInfo,
            timestamp: new Date()
          }
        });
        
        console.log('交易提交成功:', result);
      } catch (error) {
        console.error('交易提交失败:', error);
        wx.showToast({
          title: '交易提交失败',
          icon: 'none'
        });
      }
    },
  
    // 换物
    onSwap() {
      const { isWish, goods } = this.data;
      if (isWish) {
        // 许愿商品：以物换物（我有物品可以和他交换）
        wx.showToast({
          title: '换物功能开发中',
          icon: 'none'
        });
      } else {
        // 出物商品：发起换物
        wx.showToast({
          title: '换物功能开发中',
          icon: 'none'
        });
      }
    },
  
    // 预览图片
    onPreviewImage(e) {
      const index = e.currentTarget.dataset.index;
      const { goods } = this.data;
      
      if (goods.images && goods.images.length > 0) {
        wx.previewImage({
          current: goods.images[index],
          urls: goods.images
        });
      }
    },
  
    // 分享功能
    onShareAppMessage() {
      const { goods, publisherInfo } = this.data;
      return {
        title: `${publisherInfo?.nickname || '上财同学'}发布的：${goods.title}`,
        path: `/pages/detail/detail?id=${goods.id}`,
        imageUrl: goods.images && goods.images.length > 0 ? goods.images[0] : '/images/share-logo.png'
      };
    }
  });
