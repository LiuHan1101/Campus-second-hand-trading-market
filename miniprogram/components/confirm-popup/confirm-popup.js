// components/confirm-popup/confirm-popup.js
Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    productInfo: {
      type: Object,
      value: {
        image: '',
        title: '',
        price: 0
      }
    }
  },

  data: {
    transactionDate: '', // 交易日期
    transactionTime: '', // 交易时间
    transactionLocation: '', // 交易地点
    transactionRemark: '' // 备注信息
  },

  methods: {
    onMaskTap() {
      this.triggerEvent('close');
    },

    onContainerTap(e) {
      e.stopPropagation();
    },

    preventTouchMove() {
      return;
    },

    // 日期选择
    onDateChange(e) {
      this.setData({
        transactionDate: e.detail.value
      });
    },

    // 时间选择
    onTimeChange(e) {
      this.setData({
        transactionTime: e.detail.value
      });
    },

    // 地点输入
    onLocationInput(e) {
      this.setData({
        transactionLocation: e.detail.value
      });
    },

    // 备注输入
    onRemarkInput(e) {
      this.setData({
        transactionRemark: e.detail.value
      });
    },

    onCancel() {
      this.resetForm();
      this.triggerEvent('cancel');
      this.triggerEvent('close');
    },

    onConfirm() {
      // 表单验证
      if (!this.validateForm()) {
        return;
      }

      const transactionInfo = {
        date: this.data.transactionDate,
        time: this.data.transactionTime,
        location: this.data.transactionLocation,
        remark: this.data.transactionRemark
      };

      this.triggerEvent('confirm', transactionInfo);
      this.resetForm();
    },

    // 表单验证
    validateForm() {
      const { transactionDate, transactionTime, transactionLocation } = this.data;
      
      if (!transactionDate) {
        wx.showToast({
          title: '请选择交易日期',
          icon: 'none'
        });
        return false;
      }

      if (!transactionTime) {
        wx.showToast({
          title: '请选择交易时间',
          icon: 'none'
        });
        return false;
      }

      if (!transactionLocation.trim()) {
        wx.showToast({
          title: '请输入交易地点',
          icon: 'none'
        });
        return false;
      }

      return true;
    },

    // 重置表单
    resetForm() {
      this.setData({
        transactionDate: '',
        transactionTime: '',
        transactionLocation: '',
        transactionRemark: ''
      });
    }
  },

  lifetimes: {
    detached() {
      // 组件销毁时重置表单
      this.resetForm();
    }
  }
})