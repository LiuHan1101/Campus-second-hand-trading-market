// pages/publish/publish.js
Page({
    data: {
      formData: {
        title: '',
        description: '',
        images: [],
        categories: [], // 改为数组，支持多选
        switch:'object',
        transactionType: 'cash',
        price: '',
        expectedSwap: ''
      },
      categories: [
        { name: 'books', label: '图书教材', icon: '📚' },
        { name: 'electronics', label: '数码产品', icon: '💻' },
        { name: 'clothing', label: '服饰鞋包', icon: '👕' },
        { name: 'daily', label: '生活用品', icon: '🏠' },
        { name: 'sports', label: '运动器材', icon: '⚽' },
        { name: 'beauty', label: '美妆个护', icon: '💄' },
        { name: 'dorm', label: '宿舍神器', icon: '🛏️' },
        { name: 'study', label: '学习用品', icon: '✏️' },
        { name: 'other', label: '其他', icon: '📦' }
      ],
      isSubmitting: false,
      showImageAction: false, // 控制图片操作面板显示
      editMode: false, // 是否为编辑模式
      editGoodsId: '', // 编辑的商品ID
      selectedCategoriesText: '请选择标签' // 选中的分类标签显示文本
    },
  
    onLoad(options) {
      // 检查是否是编辑模式
      if (options.id && options.mode === 'edit') {
        this.setData({
          editMode: true,
          editGoodsId: options.id
        });
        wx.setNavigationBarTitle({
          title: '编辑商品'
        });
        this.loadGoodsForEdit(options.id);
      } else {
        this.updateSelectedCategoriesText();
      }
    },
  
    // 加载要编辑的商品信息
    async loadGoodsForEdit(goodsId) {
      try {
        wx.showLoading({ title: '加载中...' });
        
        const db = wx.cloud.database();
        const result = await db.collection('POST').doc(goodsId).get();
        const goods = result.data;
        
        // 填充表单数据
        this.setData({
          'formData.title': goods.title,
          'formData.description': goods.description,
          'formData.categories': goods.categories || [],
          'formData.transactionType': goods.transactionType,
          'formData.price': goods.price.toString(),
          'formData.expectedSwap': goods.expectedSwap || '',
          'formData.switch': goods.switch || 'object',
          selectedCategoriesText: this.getSelectedCategoriesText(goods.categories)
        });
        
        // 处理图片
        if (goods.images && goods.images.length > 0) {
          this.setData({
            'formData.images': goods.images
          });
        }
        
        wx.hideLoading();
        
      } catch (error) {
        console.error('加载商品信息失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
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
  
    // 选择分类（多选）
    onCategorySelect(e) {
      const category = e.currentTarget.dataset.category;
      const currentCategories = [...this.data.formData.categories];
      const index = currentCategories.indexOf(category);
      
      if (index > -1) {
        // 如果已选中，则取消选中
        currentCategories.splice(index, 1);
      } else {
        // 如果未选中，则添加（最多选择3个）
        if (currentCategories.length < 3) {
          currentCategories.push(category);
        } else {
          wx.showToast({
            title: '最多选择3个标签',
            icon: 'none'
          });
          return;
        }
      }
      
      // 立即更新数据
      this.setData({
        'formData.categories': currentCategories,
        selectedCategoriesText: this.getSelectedCategoriesText(currentCategories)
      });
    },
  
    // 获取选中的分类标签显示文本
    getSelectedCategoriesText(selectedCategories = null) {
      const selected = selectedCategories || this.data.formData.categories;
      if (selected.length === 0) return '请选择标签';
      
      const categoryMap = {};
      this.data.categories.forEach(cat => {
        categoryMap[cat.name] = cat.label;
      });
      
      return selected.map(name => categoryMap[name]).join('、');
    },
  
    // 更新选中的分类标签文本
    updateSelectedCategoriesText() {
      this.setData({
        selectedCategoriesText: this.getSelectedCategoriesText()
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
      const count = 4 - that.data.formData.images.length;
      
      if (count <= 0) {
        wx.showToast({
          title: '最多上传4张图片',
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
  
      if (form.images.length === 0) {
        wx.showToast({
          title: '请至少上传一张图片',
          icon: 'none'
        });
        return false;
      }
  
      if (form.categories.length === 0) {
        wx.showToast({
          title: '请至少选择一个标签',
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
  
    // 上传图片到云存储
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
  
    // 提交发布或更新
    async onSubmit() {
      if (this.data.isSubmitting) return;
      if (!this.validateForm()) return;
  
      this.setData({ isSubmitting: true });
      wx.showLoading({ 
        title: this.data.editMode ? '更新中...' : '发布中...', 
        mask: true 
      });
  
      try {
        const db = wx.cloud.database();
        const formData = this.data.formData;
        
        console.log('提交前的表单数据:', formData);
        
        // 1. 上传新图片到云存储
        let imageFileIDs = [];
        const newImages = formData.images.filter(img => !img.startsWith('cloud://'));
        const existingImages = formData.images.filter(img => img.startsWith('cloud://'));
        
        if (newImages.length > 0) {
          imageFileIDs = await this.uploadImages(newImages);
        }
        
        const allImages = [...existingImages, ...imageFileIDs];
        console.log('处理后的图片:', allImages);
  
        // 2. 准备商品数据
        const goodsData = {
          title: formData.title,
          description: formData.description,
          images: allImages.length > 0 ? allImages : ['/images/default.jpg'],
          categories: formData.categories || [],
          transactionType: formData.transactionType,
          price: formData.transactionType === 'swap' ? 0 : parseFloat(formData.price),
          expectedSwap: formData.expectedSwap || '',
          switch: formData.switch,
          updateTime: db.serverDate()
        };
  
        let result;
        if (this.data.editMode) {
          // 更新现有商品
          console.log('更新商品:', this.data.editGoodsId, goodsData);
          result = await db.collection('POST').doc(this.data.editGoodsId).update({
            data: goodsData
          });
        } else {
          // 创建新商品
          goodsData.status = 'selling';
          goodsData.createTime = db.serverDate();
          goodsData.viewCount = 0;
          goodsData.likeCount = 0;
          goodsData.userInfo = {
            nickname: '测试用户',
            avatar: '/images/avatar.png'
          };
  
          console.log('发布新商品:', goodsData);
          result = await db.collection('POST').add({
            data: goodsData
          });
        }
  
        console.log('操作成功:', result);
        
        wx.hideLoading();
        wx.showToast({
          title: this.data.editMode ? '更新成功' : '发布成功',
          icon: 'success',
          duration: 2000
        });
  
        // 重置表单并返回
        this.resetForm();
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
  
      } catch (error) {
        console.error(this.data.editMode ? '更新失败:' : '发布失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: (this.data.editMode ? '更新失败: ' : '发布失败: ') + error.message,
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
          categories: [],
          transactionType: 'cash',
          price: '',
          switch: 'object',
          expectedSwap: ''
        },
        selectedCategoriesText: '请选择标签',
        showImageAction: false
      });
    },
  
    // 显示发布提示
    showPublishTips() {
      wx.showModal({
        title: '发布小贴士',
        content: '• 标题要清晰明确\n• 图片要真实清晰\n• 描述要详细具体\n• 价格要合理公道\n• 选择合适的标签让商品更容易被找到',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#E8B4B8'
      });
    },
  
    // 返回上一页
    onCancel() {
      wx.navigateBack();
    }
  });