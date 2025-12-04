// pages/me/edit-profile/edit-profile.js
Page({
    data: {
      avatarUrl: '/images/avatar.png',
      nickname: '',
      college: '',
      collegeIndex: 0,
      bio: '',
      gender: 0,
      genders: ['未知', '男', '女'],
      colleges: [
        '会计学院',
        '金融学院', 
        '经济学院',
        '商学院',
        '计算机学院',
        '数学学院',
        '艺术学院',
        '其他学院'
      ],
      tags: [], // 用户标签
      tagInput: '', // 标签输入框内容
      showAvatarModal: false,
      isSaving: false,
      wordCount: 0
    },
  
    onLoad(options) {
      console.log('编辑页面加载完成');
      this.loadUserInfo();
    },
  
    // 加载用户信息
    loadUserInfo() {
      try {
        const userInfo = wx.getStorageSync('userInfo');
        console.log('从缓存加载的用户信息:', userInfo);
        
        if (userInfo) {
          const collegeIndex = this.data.colleges.indexOf(userInfo.college);
          this.setData({
            avatarUrl: userInfo.avatar || '/images/avatar.png',
            nickname: userInfo.nickname || '',
            college: userInfo.college || '',
            collegeIndex: collegeIndex >= 0 ? collegeIndex : 0,
            bio: userInfo.bio || '',
            gender: userInfo.gender || 0,
            tags: userInfo.tags || [], // 加载标签
            wordCount: (userInfo.bio || '').length
          });
        }
      } catch (error) {
        console.error('加载用户信息失败:', error);
      }
    },
  
    // 点击头像（打开预览弹窗）
    onChooseAvatar() {
      console.log('打开头像预览弹窗');
      this.setData({
        showAvatarModal: true
      });
    },
  
    // 弹窗内点击“更换头像”按钮
    onChangeAvatarInModal() {
      console.log('弹窗内点击更换头像');
    
      // 1. 先关闭弹窗
      this.setData({ showAvatarModal: false });
      
      // 2. 延迟执行选择图片，让弹窗关闭动画完成
      setTimeout(() => {
        // 3. 调用选择图片API（复用您原有的核心逻辑）
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          maxWidth: 800,
          maxHeight: 800,
          success: (res) => {
            console.log('选择的新图片:', res.tempFiles[0].tempFilePath);
            // 4. 更新页面头像预览
            this.setData({
              avatarUrl: res.tempFiles[0].tempFilePath
            });
            // 可选：给用户一个成功提示
            wx.showToast({
              title: '头像已更新',
              icon: 'success',
              duration: 1500
            });
          },
          fail: (err) => {
            console.error('选择图片失败:', err);
            wx.showToast({
              title: '选择图片失败',
              icon: 'none'
            });
          }
        });
      }, 150); // 延迟300毫秒，确保弹窗关闭动画流畅
    },

    // 关闭头像弹窗（点击遮罩或“取消”按钮时调用）
    onCloseAvatarModal() {
      console.log('关闭头像弹窗');
      this.setData({
        showAvatarModal: false
      });
    },

    // 输入昵称
    onNicknameInput(e) {
      this.setData({
        nickname: e.detail.value
      });
    },
  
    // 输入个人简介
    onBioInput(e) {
      const bio = e.detail.value;
      this.setData({
        bio: bio,
        wordCount: bio.length
      });
    },
  
    // 选择学院
    onCollegeChange(e) {
      const index = parseInt(e.detail.value);
      this.setData({
        collegeIndex: index,
        college: this.data.colleges[index]
      });
    },
  
    // 选择性别
    onGenderChange(e) {
      const index = parseInt(e.detail.value);
      this.setData({
        gender: index
      });
    },
  
    // 标签输入
    onTagInput(e) {
      this.setData({
      tagInput: e.detail.value
      });
    },

    // 添加标签
    onAddTag(e) {
      const newTag = this.data.tagInput.trim();
      
      if (!newTag) {
        return;
      }
      
      if (newTag.length > 6) {
        wx.showToast({
          title: '标签不能超过6个字符',
          icon: 'none'
        });
        return;
      }
      
      if (this.data.tags.length >= 5) {
        wx.showToast({
          title: '最多只能添加5个标签',
          icon: 'none'
        });
        return;
      }
      
      // 检查是否已存在相同标签
      if (this.data.tags.includes(newTag)) {
        wx.showToast({
          title: '标签已存在',
          icon: 'none'
        });
        return;
      }
      
      const updatedTags = [...this.data.tags, newTag];
      
      this.setData({
        tags: updatedTags,
        tagInput: ''
      });
    },

    // 移除标签
    onRemoveTag(e) {
      const index = e.currentTarget.dataset.index;
      const updatedTags = [...this.data.tags];
      updatedTags.splice(index, 1);
      
      this.setData({
        tags: updatedTags
      });
    },

    // 保存信息
    async onSave() {
      if (this.data.isSaving) return;
  
      // 验证表单
      if (!this.data.nickname.trim()) {
        wx.showToast({ 
          title: '请输入昵称', 
          icon: 'none' 
        });
        return;
      }
  
      if (this.data.nickname.trim().length > 20) {
        wx.showToast({ 
          title: '昵称不能超过20个字符', 
          icon: 'none' 
        });
        return;
      }
  
      if (this.data.bio.length > 100) {
        wx.showToast({ 
          title: '个人简介不能超过100个字符', 
          icon: 'none' 
        });
        return;
      }
  
      if (!this.data.college) {
        wx.showToast({ 
          title: '请选择学院', 
          icon: 'none' 
        });
        return;
      }
  
      this.setData({ isSaving: true });
      wx.showLoading({ 
        title: '保存中...', 
        mask: true 
      });
  
      try {
        // 保存信息 - 修改用户数据对象
        const userInfo = {
          nickname: this.data.nickname.trim(),
          college: this.data.college,
          avatar: this.data.avatarUrl,
          bio: this.data.bio.trim(),
          gender: this.data.gender,
          tags: this.data.tags, // 添加标签
          isVerified: true,
          updateTime: new Date().toISOString()
        };
  
        console.log('准备保存的用户信息:', userInfo);
  
        // 保存到云数据库
        const db = wx.cloud.database();
        await db.collection('users').add({
          data: {
            ...userInfo,
            createTime: db.serverDate()
          }
        });
  
        // 保存到本地缓存
        wx.setStorageSync('userInfo', userInfo);
        console.log('用户信息保存成功');
  
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        });
  
        // 设置更新标志
        wx.setStorageSync('shouldRefreshProfile', true);
  
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
  
      } catch (error) {
        console.error('保存失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: '保存失败: ' + error.message,
          icon: 'none'
        });
      } finally {
        this.setData({ isSaving: false });
      }
    },
  
    // 取消
    onCancel() {
      wx.navigateBack();
    }
  });