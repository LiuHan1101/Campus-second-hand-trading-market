// pages/me/help-feedback/help-feedback.js
// pages/me/help-feedback/help-feedback.js
Page({
  data: {
    helpItems: [
      {
        icon: '/images/problems.png', 
        title: '常见问题',
        desc: '查看使用过程中常见问题',
        type: 'navigate',
        url: '/pages/me/faq/faq'
      },
      {
        icon: '/images/propose.png', 
        title: '意见反馈',
        desc: '告诉我们您的建议',
        type: 'feedback'
      },
      {
        icon: '/images/evaluation.png', 
        title: '评价我们',
        desc: '去应用商店给我们评分',
        type: 'rate'
      }
    ]
  },

  onLoad(options) {
    console.log('帮助与反馈页面加载');
  },

  // 点击帮助项
  onHelpItemTap(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.helpItems[index];
    
    switch (item.type) {
      case 'navigate':
        if (item.url) {
          wx.navigateTo({
            url: item.url
          });
        }
        break;
        
      case 'feedback':
        this.giveFeedback();
        break;
        
      case 'rate':
        this.rateApp();
        break;
        
      default:
        wx.showToast({
          title: `${item.title}功能开发中`,
          icon: 'none'
        });
    }
  },

  // 联系客服
  contactCustomer() {
    wx.showModal({
      title: '联系客服',
      content: '客服微信：shangcai-service\n工作时间：9:00-18:00\n邮箱：service@shangcai.com',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 意见反馈
  giveFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '您可以通过以下方式反馈意见：\n1. 发送邮件到 feedback@shangcai.com\n2. 在应用商店评价中留言\n3. 联系客服微信号',
      showCancel: true,
      cancelText: '取消',
      confirmText: '去发邮件',
      success: (res) => {
        if (res.confirm) {
          // 这里可以跳转到邮件客户端或其他反馈方式
          wx.showToast({
            title: '即将打开邮件应用',
            icon: 'none'
          });
        }
      }
    });
  },

  // 评价应用
  rateApp() {
    wx.showModal({
      title: '评价我们',
      content: '您的评价对我们非常重要！\n请前往应用商店给我们评分。',
      showCancel: true,
      cancelText: '下次再说',
      confirmText: '去评价',
      success: (res) => {
        if (res.confirm) {
          // 这里可以跳转到应用商店
          wx.showToast({
            title: '即将打开应用商店',
            icon: 'none'
          });
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    console.log('刷新帮助与反馈页面');
    wx.stopPullDownRefresh();
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '上财易物 - 帮助与反馈',
      path: '/pages/me/help-feedback/help-feedback'
    };
  }
});