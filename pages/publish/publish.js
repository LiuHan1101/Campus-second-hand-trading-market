// pages/publish/publish.js
Page({
    data: {
      formData: {
        title: '',
        description: '',
        images: [],
        categories: [], // 改为数组，支持多选
        switch: 'object',
        transactionType: 'cash',
        price: '',
        expectedSwap: '',
        customTags: [], // 存储自定义标签
        customTagInputValue: '', // 自定义标签输入值
        customTagCharCount: 0, // 字符计数
        showCustomTagInput: false // 是否显示自定义标签输入弹窗
      },
      categories: [
        { name: '图书教材', label: '图书教材', icon: '📚' },
        { name: '数码产品', label: '数码产品', icon: '💻' },
        { name: '服饰鞋包', label: '服饰鞋包', icon: '👕' },
        { name: '生活用品', label: '生活用品', icon: '🏠' },
        { name: '运动器材', label: '运动器材', icon: '⚽' },
        { name: '美妆个护', label: '美妆个护', icon: '💄' },
        { name: '宿舍神器', label: '宿舍神器', icon: '🛏️' },
        { name: '学习用品', label: '学习用品', icon: '✏️' },
        { name: '其他', label: '其他', icon: '📦' }
      ],
      isSubmitting: false,
      showImageAction: false,
      showCustomTagInput: false,
      customTagInputValue: '',
      customTagCharCount: 0, // 字符计数
      userInfo: null, // 添加用户信息存储
      selectedCategoriesText: '请选择标签'
    },
  
    onLoad() {
      this.updateSelectedCategoriesText();
      // 加载用户信息
      this.loadUserInfo();
    },
  
    // 加载当前用户信息
    async loadUserInfo() {
      try {
        // 1. 从本地缓存获取用户信息
        const cachedUserInfo = wx.getStorageSync('userInfo');
        const openid = wx.getStorageSync('openid');
        
        if (!openid) {
          wx.showToast({
            title: '请先登录',
            icon: 'none'
          });
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/login/login'
            });
          }, 1500);
          return;
        }
  
        if (cachedUserInfo && cachedUserInfo.openid === openid) {
          console.log('使用缓存的用户信息:', cachedUserInfo);
          this.setData({
            userInfo: cachedUserInfo
          });
        }
  
        // 2. 从云数据库获取最新用户信息
        const db = wx.cloud.database();
        const userQuery = await db.collection('users')
          .where({ openid: openid })
          .get();
        
        if (userQuery.data.length > 0) {
          const userData = userQuery.data[0];
          console.log('从数据库获取用户信息:', userData);
          
          const updatedUserInfo = {
            ...userData,
            openid: openid  // 只保存自定义的openid字段
          };
          
          this.setData({ userInfo: updatedUserInfo });
          wx.setStorageSync('userInfo', updatedUserInfo);
        } else {
          console.log('未在数据库中找到用户信息');
          if (!cachedUserInfo) {
            wx.showToast({
              title: '请先完善个人信息',
              icon: 'none'
            });
          }
        }
  
      } catch (error) {
        console.error('加载用户信息失败:', error);
        // 使用缓存数据
        const cachedUserInfo = wx.getStorageSync('userInfo');
        if (cachedUserInfo) {
          this.setData({ userInfo: cachedUserInfo });
        }
      }
    },
  
    // 输入标题
    onTitleInput(e) {
      this.setData({
        'formData.title': e.detail.value
      });
    },
  
    // 输入描述
    onDescriptionInput(e) {
      this.setData({
        'formData.description': e.detail.value
      });
    },
  
    // 选择交易类型
    onTypeChange(e) {
      const type = e.currentTarget.dataset.type;
      this.setData({
        'formData.transactionType': type
      });
    },
  
    // 选择出物/许愿
    onFormChange(e) {
      const type = e.currentTarget.dataset.type;
      this.setData({
        'formData.switch': type
      });
    },
  
    // 输入价格
    onPriceInput(e) {
      this.setData({
        'formData.price': e.detail.value
      });
    },
  
    // 输入期望换物
    onExpectedSwapInput(e) {
      this.setData({
        'formData.expectedSwap': e.detail.value
      });
    },
  
    // 显示图片操作面板
    onShowImageAction() {
      this.setData({
        showImageAction: true
      });
    },
  
    // 隐藏图片操作面板
    onHideImageAction() {
      this.setData({
        showImageAction: false
      });
    },
  
    // 从相册选择图片
    onChooseFromAlbum() {
      this.onHideImageAction();
      this.chooseImages('album');
    },
  
    // 拍照
    onTakePhoto() {
      this.onHideImageAction();
      this.chooseImages('camera');
    },
  
    // 选择图片（统一处理相册和拍照）
    chooseImages(sourceType) {
      const that = this;
      const count = 9 - that.data.formData.images.length;
  
      if (count <= 0) {
        wx.showToast({
          title: '最多上传9张图片',
          icon: 'none'
        });
        return;
      }
  
      wx.chooseMedia({
        count: count,
        mediaType: ['image'],
        sourceType: [sourceType],
        maxDuration: 30,
        camera: 'back',
        success(res) {
          const tempFiles = res.tempFiles;
          const newImages = tempFiles.map(file => file.tempFilePath);
          const allImages = [...that.data.formData.images, ...newImages].slice(0, 9);
  
          that.setData({
            'formData.images': allImages
          });
  
          // 显示成功提示
          wx.showToast({
            title: `添加了${newImages.length}张图片`,
            icon: 'success',
            duration: 1500
          });
        },
        fail(err) {
          console.error('选择图片失败:', err);
          let errorMsg = '选择图片失败';
          if (err.errMsg.includes('auth deny')) {
            errorMsg = '需要相册/相机权限';
          }
          wx.showToast({
            title: errorMsg,
            icon: 'none'
          });
        }
      });
    },
  
    // 删除图片
    onDeleteImage(e) {
      const index = e.currentTarget.dataset.index;
      const images = [...this.data.formData.images];
      images.splice(index, 1);
  
      this.setData({
        'formData.images': images
      });
  
      wx.showToast({
        title: '图片已删除',
        icon: 'success',
        duration: 1000
      });
    },
  
    // 预览图片
    onPreviewImage(e) {
      const index = e.currentTarget.dataset.index;
      const images = this.data.formData.images;
  
      wx.previewImage({
        current: images[index],
        urls: images
      });
    },
  
    // 重新排序图片（拖拽功能）
    onImageDragStart(e) {
      this.dragStartIndex = e.currentTarget.dataset.index;
    },
  
    onImageDragOver(e) {
      e.preventDefault();
    },
  
    // 在选择分类的方法中更新文本
    onCategorySelect(e) {
      const category = e.currentTarget.dataset.category;
      const currentCategories = [...this.data.formData.categories];
      const index = currentCategories.indexOf(category);
  
      if (index > -1) {
        currentCategories.splice(index, 1);
      } else {
        if (currentCategories.length < 3) {
          currentCategories.push(category);
        } else {
          wx.showToast({
            title: '最多选择3个标签',
            icon: 'none'
          });
          return;
        }
      }
  
      this.setData({
        'formData.categories': currentCategories,
        selectedCategoriesText: this.getSelectedCategoriesText(currentCategories)
      });
    },
  
    // 获取选中的分类标签显示文本
    getSelectedCategoriesText(selectedCategories = null) {
      const selected = selectedCategories || this.data.formData.categories;
      if (selected.length === 0) return '请选择标签';
  
      const categoryMap = {};
      this.data.categories.forEach(cat => {
        categoryMap[cat.name] = cat.label;
      });
  
      return selected.map(name => categoryMap[name] || name).join('、');
    },
  
    // 表单验证
    validateForm() {
      const form = this.data.formData;
  
      if (!form.title.trim()) {
        wx.showToast({
          title: '请输入商品标题',
          icon: 'none'
        });
        return false;
      }
  
      if (!form.description.trim()) {
        wx.showToast({
          title: '请输入商品描述',
          icon: 'none'
        });
        return false;
      }
  
      if (form.switch == 'object' && form.images.length === 0) {
        wx.showToast({
          title: '请至少上传一张图片',
          icon: 'none'
        });
        return false;
      }
  
      if (form.categories.length === 0) {
        wx.showToast({
          title: '请至少选择一个标签',
          icon: 'none'
        });
        return false;
      }
  
      if (form.transactionType === 'cash' || form.transactionType === 'both') {
        if (!form.price || isNaN(form.price) || parseFloat(form.price) <= 0) {
          wx.showToast({
            title: '请输入正确的价格',
            icon: 'none'
          });
          return false;
        }
      }
  
      if (form.transactionType === 'swap' || form.transactionType === 'both') {
        if (!form.expectedSwap.trim()) {
          wx.showToast({
            title: '请输入期望换得的物品',
            icon: 'none'
          });
          return false;
        }
      }
  
      // 检查用户是否登录
      if (!this.data.userInfo) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return false;
      }
  
      return true;
    },
  
    // 确保图片正确上传到云存储
    async uploadImages(imagePaths) {
      if (!imagePaths || imagePaths.length === 0) {
        return [];
      }
  
      try {
        console.log('开始上传图片:', imagePaths);
  
        const uploadTasks = imagePaths.map(async (imagePath, index) => {
          // 生成唯一的云存储路径
          const cloudPath = `goods/${Date.now()}-${index}-${Math.random().toString(36).substring(2, 8)}.jpg`;
  
          console.log(`上传图片 ${index}:`, imagePath, '->', cloudPath);
  
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: imagePath,
          });
  
          console.log(`图片 ${index} 上传成功:`, uploadResult.fileID);
          return uploadResult.fileID;
        });
  
        const fileIDs = await Promise.all(uploadTasks);
        console.log('所有图片上传完成:', fileIDs);
        return fileIDs;
  
      } catch (error) {
        console.error('图片上传失败:', error);
        throw error;
      }
    },
  
    // 修改发布提交逻辑 - 绑定用户信息
    async onSubmit() {
      if (this.data.isSubmitting) return;
      if (!this.validateForm()) return;
  
      this.setData({ isSubmitting: true });
      wx.showLoading({ title: '发布中...', mask: true });
  
      try {
        const db = wx.cloud.database();
  
        console.log('发布前的表单数据:', this.data.formData);
        console.log('当前用户信息:', this.data.userInfo);
  
        // 检查用户信息是否完整
        if (!this.data.userInfo || !this.data.userInfo.openid) {
          throw new Error('用户信息不完整，请重新登录');
        }
  
        // 1. 上传图片到云存储
        let imageFileIDs = [];
        if (this.data.formData.images && this.data.formData.images.length > 0) {
          imageFileIDs = await this.uploadImages(this.data.formData.images);
        }
  
        console.log('上传后的图片FileIDs:', imageFileIDs);
  
        // 2. 准备商品数据（包含用户信息）- 修复：不包含 _openid 字段
        const goodsData = {
          // 商品基本信息
          title: this.data.formData.title,
          description: this.data.formData.description,
          images: imageFileIDs,
          categories: this.data.formData.categories || [],
          transactionType: this.data.formData.transactionType,
          price: this.data.formData.transactionType === 'swap' ? 0 : parseFloat(this.data.formData.price),
          expectedSwap: this.data.formData.expectedSwap || '',
          status: 'selling',
          switch: this.data.formData.switch,
          viewCount: 0,
          favoriteCount: 0,
          
          // 用户信息 - 绑定发布者（使用自定义字段，不包含 _openid）
          publisherOpenid: this.data.userInfo.openid, // 使用自定义字段存储openid
          publisherId: this.data.userInfo._id, // 用户ID
          publisherInfo: {
            // 从users库中获取的用户信息
            nickname: this.data.userInfo.nickname || '上财同学',
            avatar: this.data.userInfo.avatar || this.data.userInfo.avatarUrl || '/images/avatar.png',
            college: this.data.userInfo.college || '未知学院',
            isVerified: this.data.userInfo.isRegistered || false,
            studentId: this.data.userInfo.studentId || '',
            phone: this.data.userInfo.phone || ''
          },
          
          // 系统字段
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        };
  
        console.log('最终保存的商品数据:', goodsData);
  
        // 3. 保存到数据库
        const result = await db.collection('POST').add({
          data: goodsData
        });
  
        console.log('发布成功，文档ID:', result._id);
  
        wx.hideLoading();
        wx.showToast({
          title: '发布成功',
          icon: 'success',
          duration: 2000
        });
  
        // 重置表单
        this.resetForm();
  
        // 返回首页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
  
      } catch (error) {
        console.error('发布失败:', error);
        wx.hideLoading();
        
        let errorMsg = '发布失败，请重试';
        if (error.errMsg) {
          if (error.errMsg.includes('invalid parameters')) {
            errorMsg = '数据格式错误，请检查字段';
            console.error('详细错误信息:', error);
          } else if (error.message) {
            errorMsg = error.message;
          }
        }
        
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        });
      } finally {
        this.setData({ isSubmitting: false });
      }
    },
  
    // 重置表单
    resetForm() {
      this.setData({
        formData: {
          title: '',
          description: '',
          images: [],
          categories: [],
          transactionType: 'cash',
          price: '',
          switch: 'object',
          expectedSwap: '',
          customTagInputValue: '',
          customTagCharCount: 0,
          showCustomTagInput: false
        },
        showImageAction: false,
        selectedCategoriesText: '请选择标签'
      });
    },
  
    // 显示发布提示
    showPublishTips() {
      wx.showModal({
        title: '证书',
        content: '刘涵天下第一帅',
        showCancel: false,
        confirmText: '我也觉得',
        confirmColor: '#E8B4B8'
      });
    },
  
    // 更新选中的分类文本显示
    updateSelectedCategoriesText() {
      this.setData({
        selectedCategoriesText: this.getSelectedCategoriesText()
      });
    },
  
    // 拖拽结束
    onImageDrop(e) {
      const dragEndIndex = e.currentTarget.dataset.index;
      if (this.dragStartIndex === undefined || this.dragStartIndex === dragEndIndex) return;
  
      const images = [...this.data.formData.images];
      const [movedImage] = images.splice(this.dragStartIndex, 1);
      images.splice(dragEndIndex, 0, movedImage);
  
      this.setData({
        'formData.images': images
      });
  
      this.dragStartIndex = undefined;
    },
  
    // 显示自定义标签输入弹窗
    showCustomTagInput() {
      this.setData({
        showCustomTagInput: true,
        customTagInputValue: '',
        customTagCharCount: 0
      });
    },
  
    // 隐藏自定义标签输入弹窗
    hideCustomTagInput() {
      this.setData({
        showCustomTagInput: false
      });
    },
  
    // 自定义标签输入监听
    onCustomTagInput(e) {
      const value = e.detail.value;
      // 限制输入长度为5个字符
      const limitedValue = value.slice(0, 5);
      const charCount = limitedValue.length;
  
      this.setData({
        customTagInputValue: limitedValue,
        customTagCharCount: charCount
      });
    },
  
    // 添加自定义标签
    addCustomTag() {
      const { customTagInputValue, formData } = this.data;
  
      if (!customTagInputValue.trim()) {
        wx.showToast({
          title: '请输入标签内容',
          icon: 'none'
        });
  
        return;
      }
  
      // 检查总标签数量
      if (formData.categories.length >= 3) {
        wx.showToast({
          title: '最多只能添加3个标签',
          icon: 'none'
        });
        return;
      }
  
      // 检查是否已存在相同标签
      if (formData.categories.includes(customTagInputValue)) {
        wx.showToast({
          title: '该标签已存在',
          icon: 'none'
        });
        return;
      }
  
      // 添加到分类列表中（统一存储在 formData.categories 中）
      const newCategories = [...formData.categories, customTagInputValue];
      this.setData({
        'formData.categories': newCategories,
        showCustomTagInput: false,
        customTagInputValue: '',
        customTagCharCount: 0,
        selectedCategoriesText: this.getSelectedCategoriesText(newCategories)
      });
  
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });
    },
  
    // 移除标签（统一处理固定分类和自定义标签）
    removeTag(e) {
      const tag = e.currentTarget.dataset.tag;
      const { formData } = this.data;
  
      const newCategories = formData.categories.filter(item => item !== tag);
      this.setData({
        'formData.categories': newCategories,
        selectedCategoriesText: this.getSelectedCategoriesText(newCategories)
      });
    },
  
    // 页面显示时重新加载用户信息
    onShow() {
      this.loadUserInfo();
    }
  });