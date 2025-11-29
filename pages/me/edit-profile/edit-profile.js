<<<<<<< HEAD
// pages/me/edit-profile.js
=======
// pages/me/edit-profile/edit-profile.js
>>>>>>> wishpool
Page({
    data: {
      avatarUrl: '/images/avatar.png',
      nickname: '',
      college: '',
      collegeIndex: 0,
<<<<<<< HEAD
=======
      bio: '',
      gender: 0,
      genders: ['未知', '男', '女'],
>>>>>>> wishpool
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
<<<<<<< HEAD
      isSaving: false
=======
      isSaving: false,
      wordCount: 0
>>>>>>> wishpool
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
<<<<<<< HEAD
            collegeIndex: collegeIndex >= 0 ? collegeIndex : 0
=======
            collegeIndex: collegeIndex >= 0 ? collegeIndex : 0,
            bio: userInfo.bio || '',
            gender: userInfo.gender || 0,
            wordCount: (userInfo.bio || '').length
>>>>>>> wishpool
          });
        }
      } catch (error) {
        console.error('加载用户信息失败:', error);
      }
    },
  
    // 选择头像
    onChooseAvatar() {
      console.log('选择头像');
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
<<<<<<< HEAD
=======
        maxWidth: 800,
        maxHeight: 800,
>>>>>>> wishpool
        success: (res) => {
          console.log('选择的图片:', res.tempFiles[0].tempFilePath);
          this.setData({
            avatarUrl: res.tempFiles[0].tempFilePath
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
    },
  
    // 输入昵称
    onNicknameInput(e) {
      this.setData({
        nickname: e.detail.value
      });
    },
  
<<<<<<< HEAD
=======
    // 输入个人简介
    onBioInput(e) {
      const bio = e.detail.value;
      this.setData({
        bio: bio,
        wordCount: bio.length
      });
    },
  
>>>>>>> wishpool
    // 选择学院
    onCollegeChange(e) {
      const index = parseInt(e.detail.value);
      this.setData({
        collegeIndex: index,
        college: this.data.colleges[index]
      });
    },
  
<<<<<<< HEAD
=======
    // 选择性别
    onGenderChange(e) {
      const index = parseInt(e.detail.value);
      this.setData({
        gender: index
      });
    },
  
>>>>>>> wishpool
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
  
<<<<<<< HEAD
=======
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
  
>>>>>>> wishpool
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
        // 准备用户数据
        const userInfo = {
          nickname: this.data.nickname.trim(),
          college: this.data.college,
          avatar: this.data.avatarUrl,
<<<<<<< HEAD
=======
          bio: this.data.bio.trim(),
          gender: this.data.gender,
>>>>>>> wishpool
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