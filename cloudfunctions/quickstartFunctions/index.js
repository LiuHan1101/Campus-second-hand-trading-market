// cloudfunctions/getGoods/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: process.env.ENV_ID }) // 使用当前云函数环境

exports.main = async (event, context) => {
  const db = cloud.database()
  const { type, page } = event // 可以从event中获取前端传递的参数

  try {
    // 在云函数中可以进行更复杂的数据库查询
    let query = db.collection('POST').where({ status: 'selling' })
    if (type && type !== 'all') {
      query = query.where({ transactionType: type })
    }
    const result = await query.orderBy('createTime', 'desc').get()

    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}