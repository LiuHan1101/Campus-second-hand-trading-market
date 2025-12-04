// pages/register/register.js
Page({
  data: {
    formData: {
      studentId: '',
      name: '',
      phone: '',
      nickname: '' // 新增昵称字段
    },
    avatarUrl: '',
    tempFilePath: '',
    isSubmitting: false,
    canIUseChooseMedia: false
  },

  onLoad() {
    // 检查是否支持 chooseMedia API（新版）
    if (wx.chooseMedia) {
      this.setData({ canIUseChooseMedia: true });
    }
    
    // 初始化云开发
    wx.cloud.init({
      env: 'cloud1-8gw6xrycfea6d00b',
      traceUser: true
    });
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 尝试从缓存加载已有信息
    this.loadExistingUserInfo();
  },

  // 加载已有的用户信息（如果有）
  loadExistingUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        // 如果已经有用户信息，填充到表单中
        this.setData({
          'formData.nickname': userInfo.nickname || '',
          'formData.studentId': userInfo.studentId || '',
          'formData.name': userInfo.name || '',
          'formData.phone': userInfo.phone || '',
          'avatarUrl': userInfo.avatar || userInfo.avatarUrl || ''
        });
      }
    } catch (error) {
      console.error('加载已有用户信息失败:', error);
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      wx.showModal({
        title: '提示',
        content: '您还未登录，请先登录',
        showCancel: false,
        success: () => {
          wx.redirectTo({
            url: '/pages/login/login'
          });
        }
      });
    }
  },

  // 选择头像（兼容新旧API）
  chooseAvatar() {
    if (this.data.canIUseChooseMedia) {
      // 新版API
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          if (res.tempFiles && res.tempFiles[0]) {
            this.setData({
              avatarUrl: res.tempFiles[0].tempFilePath,
              tempFilePath: res.tempFiles[0].tempFilePath
            });
          }
        }
      });
    } else {
      // 旧版API
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.setData({
            avatarUrl: res.tempFilePaths[0],
            tempFilePath: res.tempFilePaths[0]
          });
        }
      });
    }
  },

  // 输入处理
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value.trim()
    });
  },

  // 输入验证
  validateForm() {
    const { studentId, name, phone, nickname } = this.data.formData;
    
    // 学号验证（示例：至少6位数字）
    if (!studentId || !/^\d{6,}$/.test(studentId)) {
      wx.showToast({ 
        title: '请输入有效的学号（至少6位数字）', 
        icon: 'none',
        duration: 2000
      });
      return false;
    }
    
    // 姓名验证
    if (!name || name.trim().length < 2) {
      wx.showToast({ 
        title: '请输入正确的姓名（至少2位字符）', 
        icon: 'none',
        duration: 2000
      });
      return false;
    }
    
    // 手机号验证
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ 
        title: '请输入正确的手机号', 
        icon: 'none',
        duration: 2000
      });
      return false;
    }
    
    // 昵称验证（可选，但如果有输入则需要验证长度）
    if (nickname && nickname.trim().length > 20) {
      wx.showToast({ 
        title: '昵称不能超过20个字符', 
        icon: 'none',
        duration: 2000
      });
      return false;
    }
    
    return true;
  },

  // 提交注册信息
  async submitForm() {
    // 1. 验证表单
    if (!this.validateForm()) {
      return;
    }
    
    const { formData, tempFilePath } = this.data;
    
    // 2. 显示加载中
    wx.showLoading({
      title: '提交中...',
      mask: true
    });
    
    this.setData({ isSubmitting: true });
    
    try {
      let avatarFileID = '';
      
      // 3. 上传头像到云存储（如果有）
      if (tempFilePath) {
        try {
          console.log('开始上传头像...');
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substr(2, 8);
          const cloudPath = `avatars/${timestamp}_${randomStr}.jpg`;
          
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath
          });
          
          avatarFileID = uploadRes.fileID;
          console.log('头像上传成功:', avatarFileID);
        } catch (uploadError) {
          console.error('头像上传失败:', uploadError);
          // 头像上传失败不影响注册，继续其他操作
        }
      }
      
      // 4. 获取用户信息
      const openid = wx.getStorageSync('openid');
      const existingUserInfo = wx.getStorageSync('userInfo');
      
      if (!openid) {
        throw new Error('用户信息失效，请重新登录');
      }
      
      // 5. 构建用户数据 - 注意：不要包含 _openid 字段
      const userData = {
        openid: openid, // 使用自定义的 openid 字段
        studentId: formData.studentId,
        name: formData.name.trim(),
        phone: formData.phone,
        isRegistered: true, // 标记为已注册
        updateTime: new Date()
      };
      
      // 如果有昵称，添加到数据中
      if (formData.nickname && formData.nickname.trim()) {
        userData.nickname = formData.nickname.trim();
      }
      
      // 如果有头像，添加到数据中
      if (avatarFileID) {
        userData.avatarFileID = avatarFileID;
        userData.avatar = avatarFileID; // 兼容字段
        userData.avatarUrl = avatarFileID; // 另一个兼容字段
      }
      
      console.log('准备保存的用户数据:', userData);
      
      // 6. 检查用户是否已有记录 - 使用 openid 字段查询
      const db = wx.cloud.database();
      const userQuery = await db.collection('users')
        .where({ openid: openid })
        .get();
      
      console.log('查询用户结果:', userQuery);
      
      let result;
      let userId;
      
      if (userQuery.data.length > 0) {
        // 更新现有用户记录
        userId = userQuery.data[0]._id;
        console.log('找到用户记录，ID:', userId);
        
        // 合并现有数据和新数据，避免覆盖不修改的字段
        const updateData = {
          ...userData,
          updateTime: new Date()
        };
        
        result = await db.collection('users').doc(userId).update({
          data: updateData
        });
        console.log('更新用户记录成功:', result);
      } else {
        // 创建新用户记录
        userData.createTime = new Date();
        console.log('创建新用户，数据:', userData);
        
        result = await db.collection('users').add({
          data: userData
        });
        
        userId = result._id;
        console.log('创建用户记录成功，ID:', userId);
      }
      
      // 7. 更新本地存储的用户信息
      const updatedUserInfo = {
        _id: userId,
        ...existingUserInfo, // 保留原有的用户信息
        ...userData, // 用新数据覆盖
        isRegistered: true,
        _openid: openid // 本地存储可以包含这个字段
      };
      
      wx.setStorageSync('userInfo', updatedUserInfo);
      console.log('本地用户信息已更新:', updatedUserInfo);
      
      // 8. 更新全局数据
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.userInfo = updatedUserInfo;
        app.globalData.isRegistered = true;
        console.log('全局数据已更新');
      }
      
      // 9. 隐藏加载提示，显示成功提示
      wx.hideLoading();
      wx.showToast({
        title: '注册成功',
        icon: 'success',
        duration: 1500
      });
      
      // 10. 延迟跳转到主页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);
      
    } catch (error) {
      console.error('注册失败:', error);
      wx.hideLoading();
      
      let errorMsg = '提交失败，请重试';
      if (error.errMsg) {
        if (error.errMsg.includes('invalid parameters')) {
          errorMsg = '数据格式错误，请联系管理员';
          console.error('详细错误:', error);
        } else if (error.errMsg.includes('uploadFile:fail')) {
          errorMsg = '头像上传失败，请重试或跳过';
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 3000
      });
      
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  // 跳过注册，直接进入主页
  skipRegister() {
    wx.showModal({
      title: '跳过注册',
      content: '可以先跳过注册使用基础功能，稍后在个人中心完善信息',
      confirmText: '确定跳过',
      cancelText: '继续填写',
      success: (res) => {
        if (res.confirm) {
          // 更新用户信息标记为未注册
          const userInfo = wx.getStorageSync('userInfo');
          if (userInfo) {
            userInfo.isRegistered = false;
            wx.setStorageSync('userInfo', userInfo);
            
            // 更新全局数据
            const app = getApp();
            if (app && app.globalData) {
              app.globalData.userInfo = userInfo;
              app.globalData.isRegistered = false;
            }
          }
          
          // 跳转到主页
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    });
  },

  // 预览头像
  previewAvatar() {
    if (this.data.avatarUrl) {
      wx.previewImage({
        urls: [this.data.avatarUrl]
      });
    }
  },

  // 清除头像
  clearAvatar() {
    wx.showModal({
      title: '提示',
      content: '确定要清除已选择的头像吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            avatarUrl: '',
            tempFilePath: ''
          });
          
          wx.showToast({
            title: '已清除头像',
            icon: 'none',
            duration: 1500
          });
        }
      }
    });
  },

  // 页面显示时检查登录状态
  onShow() {
    this.checkLoginStatus();
  },

  // 监听返回按钮
  onUnload() {
    // 清理临时文件（如果需要）
  }
});