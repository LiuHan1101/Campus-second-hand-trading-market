// pages/publish/publish.js
Page({
  data: {
    formData: {
      title: '',
      description: '',
      images: [],
      categories: [], 
      switch: 'object',
      transactionType: 'cash',
      price: '',
      expectedSwap: '',
      customTags: [], 
      customTagInputValue: '',
      customTagCharCount: 0,
      showCustomTagInput: false
    },
    categories: [
      { name: '图书教材', label: '图书教材' },
      { name: '数码产品', label: '数码产品' },
      { name: '服饰鞋包', label: '服饰鞋包' },
      { name: '生活用品', label: '生活用品'},
      { name: '运动器材', label: '运动器材' },
      { name: '美妆个护', label: '美妆个护' },
      { name: '宿舍神器', label: '宿舍神器' },
      { name: '学习用品', label: '学习用品' },
      { name: '其他', label: '其他' }
    ],
    isSubmitting: false,
    showImageAction: false,
    showCustomTagInput: false,
    customTagInputValue: '',
    customTagCharCount: 0,
    categoryStyles: [] 
  },
  
  onLoad() {
    // 初始化分类样式
    this.updateCategoryStyles();
  },
  
  onShow() {
    // 页面显示时更新样式
    this.updateCategoryStyles();
  },
  
  // 更新所有分类的样式
  updateCategoryStyles() {
    const { categories, formData } = this.data;
    const styles = categories.map((item, index) => {
      const isSelected = formData.categories.includes(item.label);
      return this.getCategoryStyle(isSelected);
    });
    
    this.setData({
      categoryStyles: styles
    });
  },
  
  // 获取分类样式
  getCategoryStyle(isSelected) {
    const baseStyle = 'padding: 20rpx 24rpx; ' +
                     'border-radius: 12rpx; ' +
                     'font-size: 28rpx; ' +
                     'display: flex; ' +
                     'align-items: center; ' +
                     'justify-content: center; ' +
                     'gap: 12rpx; ' +
                     'min-width: calc(33.333% - 14rpx); ' +
                     'flex: 1; ' +
                     'box-sizing: border-box; ' +
                     'text-align: center; ' +
                     'transition: all 0.2s ease;';
    
    if (isSelected) {
      // 选中状态：黄色背景，黑色文字，加粗
      return baseStyle + 
             'background: #fdf3d8 !important; ' +
             'border: 1rpx solid #fdf3d8 !important; ' +
             'color: #333333 !important; ' +
             'font-weight: 600 !important; ' +
             'box-shadow: 0 2rpx 8rpx rgba(255, 210, 98, 0.3);';
    } else {
      // 未选中状态：灰色背景，黑色文字，正常粗细
      return baseStyle + 
             'background: #f8f8f8 !important; ' +
             'border: 1rpx solid #e0e0e0 !important; ' +
             'color: #333333 !important; ' +
             'font-weight: 600 !important;';
    }
  },
  
  // 输入标题
  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    });
  },

  // 输入描述
  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    });
  },

  // 选择交易类型
  onTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      'formData.transactionType': type
    });
  },

  // 选择出物/许愿
  onFormChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      'formData.switch': type
    });
  },

  // 输入价格
  onPriceInput(e) {
    this.setData({
      'formData.price': e.detail.value
    });
  },

  // 输入期望换物
  onExpectedSwapInput(e) {
    this.setData({
      'formData.expectedSwap': e.detail.value
    });
  },

  // 显示图片操作面板
  onShowImageAction() {
    this.setData({
      showImageAction: true
    });
  },

  // 隐藏图片操作面板
  onHideImageAction() {
    this.setData({
      showImageAction: false
    });
  },

  // 从相册选择图片
  onChooseFromAlbum() {
    this.onHideImageAction();
    this.chooseImages('album');
  },

  // 拍照
  onTakePhoto() {
    this.onHideImageAction();
    this.chooseImages('camera');
  },

  // 选择图片（统一处理相册和拍照）
  chooseImages(sourceType) {
    const that = this;
    const count = 9 - that.data.formData.images.length;
    
    if (count <= 0) {
      wx.showToast({
        title: '最多上传9张图片',
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: count,
      mediaType: ['image'],
      sourceType: [sourceType],
      maxDuration: 30,
      camera: 'back',
      success(res) {
        const tempFiles = res.tempFiles;
        const newImages = tempFiles.map(file => file.tempFilePath);
        const allImages = [...that.data.formData.images, ...newImages].slice(0, 4);
        
        that.setData({
          'formData.images': allImages
        });

        // 显示成功提示
        wx.showToast({
          title: `添加了${newImages.length}张图片`,
          icon: 'success',
          duration: 1500
        });
      },
      fail(err) {
        console.error('选择图片失败:', err);
        let errorMsg = '选择图片失败';
        if (err.errMsg.includes('auth deny')) {
          errorMsg = '需要相册/相机权限';
        }
        wx.showToast({
          title: errorMsg,
          icon: 'none'
        });
      }
    });
  },

  // 删除图片
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.formData.images];
    images.splice(index, 1);
    
    this.setData({
      'formData.images': images
    });

    // 删除成功提示
    wx.showToast({
      title: '图片已删除',
      icon: 'success',
      duration: 1000
    });
  },

  // 预览图片
  onPreviewImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.formData.images;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 重新排序图片（拖拽功能）
  onImageDragStart(e) {
    this.dragStartIndex = e.currentTarget.dataset.index;
  },

  onImageDragOver(e) {
    e.preventDefault();
  },

  onImageDrop(e) {
    const dragEndIndex = e.currentTarget.dataset.index;
    if (this.dragStartIndex === undefined || this.dragStartIndex === dragEndIndex) return;

    const images = [...this.data.formData.images];
    const [movedImage] = images.splice(this.dragStartIndex, 1);
    images.splice(dragEndIndex, 0, movedImage);
    
    this.setData({
      'formData.images': images
    });

    this.dragStartIndex = undefined;
  },

  // 显示自定义标签输入弹窗
  showCustomTagInput() {
    this.setData({
      showCustomTagInput: true,
      customTagInputValue: '',
      customTagCharCount: 0
    });
  },

  // 隐藏自定义标签输入弹窗
  hideCustomTagInput() {
    this.setData({
      showCustomTagInput: false
    });
  },

  // 自定义标签输入监听
  onCustomTagInput(e) {
    const value = e.detail.value;
    // 限制输入长度为5个字符
    const limitedValue = value.slice(0, 5);
    const charCount = limitedValue.length;
    
    this.setData({
      customTagInputValue: limitedValue,
      customTagCharCount: charCount
    });
  },

  // 添加自定义标签
  addCustomTag() {
    const { customTagInputValue, formData } = this.data;
    
    if (!customTagInputValue.trim()) {
      wx.showToast({
        title: '请输入标签内容',
        icon: 'none'
      });
      return;
    }

    // 检查总标签数量（包括分类和自定义标签）
    if (formData.categories.length >= 3) {
      wx.showToast({
        title: '最多只能添加3个标签',
        icon: 'none'
      });
      return;
    }

    // 检查是否已存在相同标签
    if (formData.categories.includes(customTagInputValue)) {
      wx.showToast({
        title: '该标签已存在',
        icon: 'none'
      });
      return;
    }

    // 添加到分类列表和自定义标签列表
    const newCategories = [...formData.categories, customTagInputValue];
    const newCustomTags = [...formData.customTags, customTagInputValue];
    
    this.setData({
      'formData.categories': newCategories,
      'formData.customTags': newCustomTags,
      showCustomTagInput: false,
      customTagInputValue: '',
      customTagCharCount: 0
    });
    
    // 更新分类样式
    this.updateCategoryStyles();
  },

  // 移除标签（统一处理固定分类和自定义标签）
  removeTag(e) {
    const tag = e.currentTarget.dataset.tag;
    const { formData } = this.data;
    
    // 从categories中移除
    const newCategories = formData.categories.filter(item => item !== tag);
    // 从customTags中移除（如果是自定义标签）
    const newCustomTags = formData.customTags.filter(item => item !== tag);
    
    this.setData({
      'formData.categories': newCategories,
      'formData.customTags': newCustomTags
    }, () => {
      // 更新分类样式
      this.updateCategoryStyles();
    });
  },

  // 选择分类
  onCategorySelect(e) {
    const index = e.currentTarget.dataset.index;
    const label = e.currentTarget.dataset.category;
    const currentCategories = [...this.data.formData.categories];
    const categoryIndex = currentCategories.indexOf(label);
    
    if (categoryIndex > -1) {
      // 如果已经选中，则取消选中
      currentCategories.splice(categoryIndex, 1);
    } else {
      // 如果未选中，则添加（最多3个）
      if (currentCategories.length < 3) {
        currentCategories.push(label);
      } else {
        wx.showToast({
          title: '最多选择3个标签',
          icon: 'none'
        });
        return;
      }
    }
    
    this.setData({
      'formData.categories': currentCategories
    }, () => {
      // 数据更新后，重新计算所有分类的样式
      this.updateCategoryStyles();
    });
  },

  // 表单验证
  validateForm() {
    const form = this.data.formData;

    if (!form.title.trim()) {
      wx.showToast({
        title: '请输入商品标题',
        icon: 'none'
      });
      return false;
    }

    if (!form.description.trim()) {
      wx.showToast({
        title: '请输入商品描述',
        icon: 'none'
      });
      return false;
    }

    if (form.switch == 'object' && form.images.length === 0) {
      wx.showToast({
        title: '请至少上传一张图片',
        icon: 'none'
      });
      return false;
    }

    // 修改：至少需要一个标签（可以是分类标签或自定义标签）
    if (form.categories.length === 0) {
      wx.showToast({
        title: '请至少选择一个标签或自定义标签',
        icon: 'none'
      });
      return false;
    }

    if (form.transactionType === 'cash' || form.transactionType === 'both') {
      if (!form.price || isNaN(form.price) || parseFloat(form.price) <= 0) {
        wx.showToast({
          title: '请输入正确的价格',
          icon: 'none'
        });
        return false;
      }
    }

    if (form.transactionType === 'swap' || form.transactionType === 'both') {
      if (!form.expectedSwap.trim()) {
        wx.showToast({
          title: '请输入期望换得的物品',
          icon: 'none'
        });
        return false;
      }
    }

    return true;
  },

  // 确保图片正确上传到云存储
  async uploadImages(imagePaths) {
    if (!imagePaths || imagePaths.length === 0) {
      return [];
    }
    
    try {
      console.log('开始上传图片:', imagePaths);
      
      const uploadTasks = imagePaths.map(async (imagePath, index) => {
        // 生成唯一的云存储路径
        const cloudPath = `goods/${Date.now()}-${index}-${Math.random().toString(36).substring(2, 8)}.jpg`;
        
        console.log(`上传图片 ${index}:`, imagePath, '->', cloudPath);
        
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: imagePath,
        });
        
        console.log(`图片 ${index} 上传成功:`, uploadResult.fileID);
        return uploadResult.fileID;
      });
      
      const fileIDs = await Promise.all(uploadTasks);
      console.log('所有图片上传完成:', fileIDs);
      return fileIDs;
      
    } catch (error) {
      console.error('图片上传失败:', error);
      throw error;
    }
  },
  
  // 修改发布提交逻辑
  async onSubmit() {
    if (this.data.isSubmitting) return;
    if (!this.validateForm()) return;
  
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '发布中...', mask: true });
  
    try {
      const db = wx.cloud.database();
      
      console.log('发布前的表单数据:', this.data.formData);
      
      // 1. 上传图片到云存储
      let imageFileIDs = [];
      if (this.data.formData.images && this.data.formData.images.length > 0) {
        imageFileIDs = await this.uploadImages(this.data.formData.images);
      }
      
      console.log('上传后的图片FileIDs:', imageFileIDs);
  
      // 2. 准备商品数据（包含分类标签和自定义标签）
      const goodsData = {
        title: this.data.formData.title,
        description: this.data.formData.description,
        images: imageFileIDs, // 使用云文件ID
        categories: this.data.formData.categories || [], // 包含预设标签和自定义标签
        customTags: this.data.formData.customTags || [], // 单独存储自定义标签
        transactionType: this.data.formData.transactionType,
        price: this.data.formData.transactionType === 'swap' ? 0 : parseFloat(this.data.formData.price),
        expectedSwap: this.data.formData.expectedSwap || '',
        status: 'selling',
        createTime: db.serverDate(),
        switch: this.data.formData.switch,
        viewCount: 0,
        likeCount: 0,
        userInfo: {
          nickname: '测试用户', // 可以替换为真实用户信息
          avatar: '/images/avatar.png'
        }
      };
  
      console.log('最终保存的商品数据:', goodsData);

      // 3. 保存到数据库
      const result = await db.collection('POST').add({
        data: goodsData
      });

      console.log('发布成功，文档ID:', result._id);
      
      wx.hideLoading();
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 2000
      });

      // 重置表单
      this.resetForm();
      
      // 返回首页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      console.error('发布失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '发布失败: ' + error.message,
        icon: 'none'
      });
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  // 重置表单
  resetForm() {
    this.setData({
      formData: {
        title: '',
        description: '',
        images: [],
        categories: [], // 重置为空数组
        transactionType: 'cash',
        price: '',
        switch: 'object',
        expectedSwap: '',
        customTags: [], // 重置为空数组
        customTagInputValue: '',
        customTagCharCount: 0,
        showCustomTagInput: false
      },
      showImageAction: false,
      showCustomTagInput: false,
      customTagInputValue: '',
      customTagCharCount: 0,
      categoryStyles: [] // 重置样式
    }, () => {
      // 重新初始化分类样式
      this.updateCategoryStyles();
    });
  },

  // 显示发布提示
  showPublishTips() {
    wx.showModal({
      title: '证书',
      content: '刘涵天下第一帅',
      showCancel: false,
      confirmText: '我也觉得',
      confirmColor: '#E8B4B8'
    });
  }
});