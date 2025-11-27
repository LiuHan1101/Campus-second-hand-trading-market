// utils/api.js
const { BASE_URL } = require('./config.js');

// 获取商品列表
export const getGoodsList = () => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/goods`,
      method: 'GET',
      timeout: 10000, // 10秒超时
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(`请求失败，状态码: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        reject(new Error('网络连接失败，请检查后端服务器是否运行'));
      }
    });
  });
};