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
      wordCount: 0,
      userId: null,
      tempFilePath: '',
      userOpenid: null // 添加openid存储
    },
  
    onLoad(options) {
      console.log('编辑页面加载完成');
      this.loadUserInfo();
    },
  
    // 加载用户信息
    loadUserInfo() {
      try {
        const userInfo = wx.getStorageSync('userInfo');
        const openid = wx.getStorageSync('openid');
        console.log('从缓存加载的用户信息:', userInfo);
        
        if (userInfo) {
          const collegeIndex = this.data.colleges.indexOf(userInfo.college);
          this.setData({
            userId: userInfo._id,
            userOpenid: userInfo.openid || openid, // 保存openid
            avatarUrl: userInfo.avatar || userInfo.avatarUrl || '/images/avatar.png',
            nickname: userInfo.nickname || userInfo.nickName || '',
            college: userInfo.college || '',
            collegeIndex: collegeIndex >= 0 ? collegeIndex : 0,
            bio: userInfo.bio || '',
            gender: userInfo.gender || 0,
            tags: userInfo.tags || [], // 加载标签
            wordCount: (userInfo.bio || '').length
          });
        }
        
        if (!openid) {
          wx.showToast({
            title: '请先登录',
            icon: 'none'
          });
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }, 1500);
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
  
    // 弹窗内点击"更换头像"按钮
    onChangeAvatarInModal() {
      console.log('弹窗内点击更换头像');
    
      // 1. 先关闭弹窗
      this.setData({ showAvatarModal: false });
      
      // 2. 延迟执行选择图片，让弹窗关闭动画完成
      setTimeout(() => {
        // 3. 调用选择图片API
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
              avatarUrl: res.tempFiles[0].tempFilePath,
              tempFilePath: res.tempFiles[0].tempFilePath
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
      }, 150); // 延迟150毫秒，确保弹窗关闭动画流畅
    },
  
    // 关闭头像弹窗（点击遮罩或"取消"按钮时调用）
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
  
    // 上传头像到云存储
    async uploadAvatar() {
      if (!this.data.tempFilePath) {
        return null;
      }
  
      try {
        console.log('开始上传头像...');
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substr(2, 8);
        const cloudPath = `avatars/${timestamp}_${randomStr}.jpg`;
        
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: this.data.tempFilePath
        });
        
        console.log('头像上传成功:', uploadRes.fileID);
        return uploadRes.fileID;
      } catch (uploadError) {
        console.error('头像上传失败:', uploadError);
        throw new Error('头像上传失败');
      }
    },
  
    // 更新用户已发布的所有商品信息
    async updateAllPublishedGoods(updatedUserInfo) {
      try {
        const db = wx.cloud.database();
        const openid = updatedUserInfo.openid || this.data.userOpenid;
        
        if (!openid) {
          console.log('没有openid，跳过更新商品');
          return 0;
        }
        
        console.log('开始更新用户发布的商品，openid:', openid);
        
        // 1. 查询该用户发布的所有商品
        const goodsRes = await db.collection('POST')
          .where({ publisherOpenid: openid })
          .get();
        
        if (goodsRes.data.length === 0) {
          console.log('该用户没有发布的商品');
          return 0;
        }
        
        console.log(`找到${goodsRes.data.length}个需要更新的商品`);
        
        // 2. 准备更新数据
        const updateData = {
          'publisherInfo.nickname': updatedUserInfo.nickname,
          'publisherInfo.avatar': updatedUserInfo.avatar || updatedUserInfo.avatarUrl,
          'publisherInfo.college': updatedUserInfo.college,
          'publisherInfo.isVerified': updatedUserInfo.isVerified || false,
          updateTime: db.serverDate()
        };
        
        // 可选：添加其他用户信息字段
        if (updatedUserInfo.studentId) {
          updateData['publisherInfo.studentId'] = updatedUserInfo.studentId;
        }
        if (updatedUserInfo.phone) {
          updateData['publisherInfo.phone'] = updatedUserInfo.phone;
        }
        if (updatedUserInfo.bio) {
          updateData['publisherInfo.bio'] = updatedUserInfo.bio;
        }
        if (updatedUserInfo.gender !== undefined) {
          updateData['publisherInfo.gender'] = updatedUserInfo.gender;
        }
        if (updatedUserInfo.tags) {
          updateData['publisherInfo.tags'] = updatedUserInfo.tags;
        }
        
        // 3. 批量更新商品中的用户信息
        const updatePromises = goodsRes.data.map(goods => {
          return db.collection('POST').doc(goods._id).update({
            data: updateData
          });
        });
        
        // 4. 执行所有更新
        const results = await Promise.all(updatePromises);
        console.log(`成功更新${results.length}个商品`);
        
        // 显示提示但不打断主要流程
        setTimeout(() => {
          wx.showToast({
            title: `已更新${results.length}个商品信息`,
            icon: 'success',
            duration: 2000
          });
        }, 100);
        
        return results.length;
        
      } catch (error) {
        console.error('更新商品信息失败:', error);
        // 不阻止用户信息更新的主要流程
        return 0;
      }
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
        // 获取用户openid
        const openid = wx.getStorageSync('openid');
        if (!openid) {
          throw new Error('用户未登录');
        }
  
        let avatarFileID = null;
        
        // 1. 上传头像（如果有新头像）
        if (this.data.tempFilePath) {
          avatarFileID = await this.uploadAvatar();
        }
  
        // 2. 构建更新数据
        const updateData = {
          nickname: this.data.nickname.trim(),
          college: this.data.college,
          bio: this.data.bio.trim(),
          gender: this.data.gender,
          tags: this.data.tags, // 包含标签
          isVerified: true,
          updateTime: new Date()
        };
  
        // 如果有新头像，添加到更新数据中
        if (avatarFileID) {
          updateData.avatar = avatarFileID;
          updateData.avatarUrl = avatarFileID; // 兼容字段
        }
  
        console.log('准备更新的用户数据:', updateData);
        console.log('用户ID:', this.data.userId);
        console.log('用户openid:', openid);
  
        const db = wx.cloud.database();
        
        // 3. 更新用户数据库
        if (this.data.userId) {
          // 方式1：使用用户ID更新
          await db.collection('users').doc(this.data.userId).update({
            data: updateData
          });
          console.log('通过ID更新用户信息成功');
        } else {
          // 方式2：通过openid查找并更新
          const userQuery = await db.collection('users')
            .where({ openid: openid })
            .get();
          
          if (userQuery.data.length === 0) {
            throw new Error('找不到用户记录');
          }
          
          await db.collection('users').doc(userQuery.data[0]._id).update({
            data: updateData
          });
          console.log('通过openid更新用户信息成功');
          
          // 保存用户ID
          this.setData({ userId: userQuery.data[0]._id });
        }
  
        // 4. 构建完整的用户信息用于更新商品
        const currentUserInfo = wx.getStorageSync('userInfo') || {};
        const updatedUserInfo = {
          ...currentUserInfo,
          ...updateData,
          _id: this.data.userId || currentUserInfo._id,
          openid: openid,
          // 保留其他用户信息
          studentId: currentUserInfo.studentId || '',
          phone: currentUserInfo.phone || ''
        };
        
        // 5. 更新本地缓存
        wx.setStorageSync('userInfo', updatedUserInfo);
        console.log('本地用户信息已更新:', updatedUserInfo);
  
        // 6. 更新全局数据
        const app = getApp();
        if (app && app.globalData) {
          app.globalData.userInfo = updatedUserInfo;
          console.log('全局数据已更新');
        }
  
        // 7. 更新用户已发布的所有商品信息（异步执行，不阻塞主流程）
        setTimeout(async () => {
          try {
            const updatedCount = await this.updateAllPublishedGoods(updatedUserInfo);
            if (updatedCount > 0) {
              console.log(`已成功更新${updatedCount}个商品的发布者信息`);
            }
          } catch (goodsError) {
            console.error('更新商品信息过程中出错:', goodsError);
            // 不显示错误提示，避免干扰用户
          }
        }, 500);
  
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        });
  
        // 8. 返回上一页
        setTimeout(() => {
          wx.navigateBack({
            success: () => {
              // 通知上一个页面刷新数据
              const pages = getCurrentPages();
              const prevPage = pages[pages.length - 2];
              if (prevPage && prevPage.onShow) {
                prevPage.onShow();
              }
            }
          });
        }, 1500);
      
      } catch (error) {
        console.error('保存失败:', error);
        wx.hideLoading();
        
        let errorMsg = '保存失败，请重试';
        if (error.errMsg) {
          if (error.errMsg.includes('invalid document id')) {
            errorMsg = '用户信息错误，请重新登录';
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
        this.setData({ isSaving: false });
      }
    },
  
    // 取消
    onCancel() {
      wx.navigateBack();
    },
  
    // 页面显示时重新加载
    onShow() {
      this.loadUserInfo();
    }
  });