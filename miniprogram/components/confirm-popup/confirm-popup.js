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
    },
    // 新增：商品ID和卖家信息
    goodsId: {
      type: String,
      value: ''
    },
    sellerInfo: {
      type: Object,
      value: {
        nickname: '卖家',
        avatar: ''
      }
    }
  },

  data: {
    transactionDate: '', // 交易日期
    transactionTime: '', // 交易时间
    transactionLocation: '', // 交易地点
    transactionRemark: '', // 备注信息
    isFormValid: false // 表单是否有效
  },

  observers: {
    // 监听表单字段变化，自动验证表单
    'transactionDate, transactionTime, transactionLocation': function(date, time, location) {
      this.validateForm();
    }
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

    // 表单验证
    validateForm() {
      const { transactionDate, transactionTime, transactionLocation } = this.data;
      const isValid = !!transactionDate && !!transactionTime && !!transactionLocation.trim();
      
      this.setData({
        isFormValid: isValid
      });
      
      return isValid;
    },

    onCancel() {
      this.resetForm();
      this.triggerEvent('close');
    },

    // 新增：确认按钮点击事件（发送气泡并跳转到聊天）
    onConfirmBubble() {
      if (!this.validateForm()) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return;
      }

      const transactionInfo = {
        date: this.data.transactionDate,
        time: this.data.transactionTime,
        location: this.data.transactionLocation,
        remark: this.data.transactionRemark,
        productInfo: this.properties.productInfo,
        timestamp: new Date().getTime(),
        type: 'bubble'
      };

      console.log('确认发送交易信息气泡:', transactionInfo);
      
      // 触发发送气泡并跳转事件
      this.triggerEvent('confirmBubble', {
        transactionInfo: transactionInfo,
        goodsId: this.properties.goodsId,
        sellerInfo: this.properties.sellerInfo
      });
      
      // 重置表单
      this.resetForm();
    },

    // 原有的确认交易按钮
    onConfirmTransaction() {
      if (!this.validateForm()) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return;
      }

      const transactionInfo = {
        date: this.data.transactionDate,
        time: this.data.transactionTime,
        location: this.data.transactionLocation,
        remark: this.data.transactionRemark,
        productInfo: this.properties.productInfo,
        timestamp: new Date().getTime(),
        type: 'transaction'
      };

      // 触发确认交易事件
      this.triggerEvent('confirm', transactionInfo);
      this.resetForm();
    },

    // 重置表单
    resetForm() {
      this.setData({
        transactionDate: '',
        transactionTime: '',
        transactionLocation: '',
        transactionRemark: '',
        isFormValid: false
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