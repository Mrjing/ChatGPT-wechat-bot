export default {
  // 填入你的session token
  OPENAI_API_KEY: '',
  // 设置获取消息的重试次数
  retryTimes: 3,
  // 在群组中设置唤醒微信机器人的关键词
  groupKey: '',
  // 在私聊中设置唤醒微信机器人的关键词
  privateKey: '',
  // 重置上下文的关键词，如可设置为reset
  resetKey: '#重置对话',
  // 开启会后收到ChatGPT的自动回复
  autoReply: true,
  // 根据正则匹配是否自动通过好友验证
  friendShipRule: /chatgpt|chat/,
  // 是否在群聊中按照回复的格式进行回复
  groupReplyMode: true,
  // 是否在私聊中按照回复的格式进行回复
  privateReplyMode: true,
  token: '',
  imageCreateKey: '画',
  characterDesc:
    '你是ChatGPT, 一个由OpenAI训练的大型语言模型, 你旨在回答并解决人们的任何问题，并且可以使用多种语言与人交流。', //性格描述
  conversationMaxTokens: 3000,
};
