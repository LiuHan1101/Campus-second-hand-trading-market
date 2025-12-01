Page({
    data: {
        messages: [
            { text: '你好！', sender: 'received', time: '10:00' },
            { text: '你好，有什么可以帮助你的吗？', sender: 'sent', time: '10:01' },
            { text: '我想了解这个聊天功能是如何实现的。', sender: 'received', time: '10:02' }
        ],
        inputValue: '',
        scrollTop: 0,
        // 弹窗显示状态
        showConfirmBubble: false,
        showRatingBubble: false,
        // 评价内容
        comment: '',
        // 评价数据
        ratingData: {
            descScore: 0,
            timeScore: 0,
            attitudeScore: 0
        }
    },
    onInput(e) {
        this.setData({
            inputValue: e.detail.value
        });
    },
    sendMessage() {
        const messageText = this.data.inputValue.trim();
        if (!messageText) return;
        const now = new Date();
        const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        const newMessage = {
            text: messageText,
            sender: 'sent',
            time: timeString
        };
        this.setData({
            messages: [...this.data.messages, newMessage],
            inputValue: ''
        });  
        this.scrollToBottom();
        // 模拟回复
        setTimeout(() => {
            const replies = [
                '收到你的消息了！',
                '这个问题我需要查一下。',
                '稍等，我看看怎么回答。',
                '好的，明白了。',
                '谢谢你的反馈！'
            ];
            const randomReply = replies[Math.floor(Math.random() * replies.length)];
            const replyTime = new Date();
            const replyTimeString = `${replyTime.getHours()}:${replyTime.getMinutes().toString().padStart(2, '0')}`;
            const replyMessage = {
                text: randomReply,
                sender: 'received',
                time: replyTimeString
            };
            
            this.setData({
                messages: [...this.data.messages, replyMessage]
            });
            
            this.scrollToBottom();
        }, 1000);
    },
    /*滚动*/
    scrollToBottom() {
        this.setData({
            scrollTop: 99999
        });
    },
    goBack() {
        wx.showModal({
            title: '提示',
            content: '确定要返回吗？',
            success: (res) => {
                if (res.confirm) {
                    wx.navigateBack();
                }
            }
        });
    },
    
    // 卖家触发确认收货气泡
    triggerConfirmBubble() {
        // 模拟卖家发送确认收货消息
        const now = new Date();
        const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        const sellerMessage = {
            text: '请确认收货',
            sender: 'received',
            time: timeString,
            isBubble: true,
            bubbleType: 'confirm'
        };
        
        this.setData({
            messages: [...this.data.messages, sellerMessage],
            showConfirmBubble: true
        });
        this.scrollToBottom();
    },
    
    // 确认收货
    onConfirmReceipt() {
        console.log('确认收货');
        
        // 隐藏确认气泡
        this.setData({
            showConfirmBubble: false
        });
        
        // 发送确认收货成功消息
        const now = new Date();
        const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        const confirmMessage = {
            text: '确认收货成功',
            sender: 'sent',
            time: timeString
        };
        
        this.setData({
            messages: [...this.data.messages, confirmMessage]
        });
        this.scrollToBottom();
        
        // 延迟显示评价气泡
        setTimeout(() => {
            // 模拟卖家发送评价消息
            const sellerMessage = {
                text: '请评价本次交易',
                sender: 'received',
                time: timeString,
                isBubble: true,
                bubbleType: 'rating'
            };
            
            this.setData({
                messages: [...this.data.messages, sellerMessage],
                showRatingBubble: true
            });
            this.scrollToBottom();
        }, 500);
    },
    
    // 取消确认收货
    cancelConfirm() {
        this.setData({
            showConfirmBubble: false
        });
    },
    
    // 评价内容输入
    onCommentInput(e) {
        this.setData({
            comment: e.detail.value
        });
    },
    
    // 评价评分处理
    rateDesc(e) {
        const score = e.currentTarget.dataset.score;
        this.setData({
            'ratingData.descScore': score
        });
    },
  
    rateTime(e) {
        const score = e.currentTarget.dataset.score;
        this.setData({
            'ratingData.timeScore': score
        });
    },
  
    rateAttitude(e) {
        const score = e.currentTarget.dataset.score;
        this.setData({
            'ratingData.attitudeScore': score
        });
    },
  
    // 获取默认评价语句
    getDefaultComment() {
        const { ratingData } = this.data;
        const totalScore = (ratingData.descScore + ratingData.timeScore + ratingData.attitudeScore) / 3;
        
        if (totalScore >= 4.5) {
            return '非常满意的购物体验！商品质量很好，卖家服务态度也很棒！';
        } else if (totalScore >= 4) {
            return '整体还不错，商品符合描述，交易过程顺利。';
        } else if (totalScore >= 3) {
            return '交易完成，有一些小问题但整体可以接受。';
        } else {
            return '交易已完成。';
        }
    },
  
    // 提交评价
    submitRating() {
        const { ratingData, comment } = this.data;
        
        if (ratingData.descScore === 0 || ratingData.timeScore === 0 || ratingData.attitudeScore === 0) {
            wx.showToast({
                title: '请完成所有评价',
                icon: 'none'
            });
            return;
        }
        
        // 如果没有输入评价内容，使用默认评价语句
        const finalComment = comment.trim() || this.getDefaultComment();
        
        console.log('提交评价:', ratingData, '评价内容:', finalComment);
        
        this.setData({
            showRatingBubble: false,
            ratingData: {
                descScore: 0,
                timeScore: 0,
                attitudeScore: 0
            },
            comment: ''
        });
        
        // 发送评价成功消息
        const now = new Date();
        const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        const ratingMessage = {
            text: `评价完成：${finalComment}`,
            sender: 'sent',
            time: timeString
        };
        
        this.setData({
            messages: [...this.data.messages, ratingMessage]
        });
        this.scrollToBottom();
        
        wx.showToast({
            title: '评价成功',
            icon: 'success'
        });
    },
    
    // 取消评价
    cancelRating() {
        this.setData({
            showRatingBubble: false,
            ratingData: {
                descScore: 0,
                timeScore: 0,
                attitudeScore: 0
            },
            comment: ''
        });
    },
    
    // 测试按钮 - 卖家触发确认收货气泡
    testSellerBubble() {
        this.triggerConfirmBubble();
    }
});