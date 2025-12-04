// cloudfunctions/getPublicUrl/index.js
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const { fileID } = event
  
  try {
    // 获取临时URL（云函数端不受权限限制）
    const result = await cloud.downloadFile({
      fileID: fileID
    })
    
    // 或者获取临时链接
    const tempResult = await cloud.getTempFileURL({
      fileList: [fileID]
    })
    
    return {
      success: true,
      url: tempResult.fileList[0].tempFileURL,
      // 或者返回下载的内容（适合小图片）
      // buffer: result.fileContent.toString('base64')
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}