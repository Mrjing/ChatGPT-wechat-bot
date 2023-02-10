import { ChatGPTAPI } from 'chatgpt';
import config from './config.js';
import { retryRequest } from './utils.js';
import { getOpenAIImage, getOpenAiReply } from './openai.js';
import { FileBox } from 'file-box';

// let chatGPT: any = {};
let chatOption = {};
// export function initChatGPT() {
//   chatGPT = new ChatGPTAPI({
//     apiKey: process.env.OPENAI_API_KEY || config.OPENAI_API_KEY,
//     completionParams: {
//       model: 'text-davinci-003',
//       temperature: 0.9,
//       top_p: 1,
//       frequency_penalty: 0.0,
//       presence_penalty: 0.6,
//       stop: [' Human:', ' AI:'],
//     },
//   });
// }

async function getChatGPTReply(content) {
  // const { conversationId, text, id } = await chatGPT.sendMessage(
  //   content,
  //   chatOption[contactId]
  // );
  // chatOption = {
  //   [contactId]: {
  //     conversationId,
  //     parentMessageId: id,
  //   },
  // };
  // console.log('response: ', conversationId, text);

  // 先替换为调用 openAI 接口实现，再考虑上下文实现
  // response is a markdown-formatted string
  const text = await getOpenAiReply(content);
  return text;
}

export async function replyImageMessage(contact, content) {
  try {
    const imgUrl = await getOpenAIImage(content);
    if (imgUrl) {
      const fileBox = FileBox.fromUrl(imgUrl);
      await contact.say(fileBox);
    } else {
      const sayContent = '对不起，我暂时有点忙，请稍后重试';
      await contact.say(sayContent);
    }
  } catch (e) {
    console.log('replyImageMessage err', e);
  }
}

export async function replyMessage(contact, content) {
  const { id: contactId } = contact;
  try {
    if (
      content.trim().toLocaleLowerCase() === config.resetKey.toLocaleLowerCase()
    ) {
      chatOption = {
        ...chatOption,
        [contactId]: {},
      };
      await contact.say('Previous conversation has been reset.');
      return;
    }
    const message = await retryRequest(
      () => getChatGPTReply(content),
      config.retryTimes,
      500
    );

    if (
      (contact.topic && contact?.topic() && config.groupReplyMode) ||
      (!contact.topic && config.privateReplyMode)
    ) {
      const result = content + '\n-----------\n' + message;
      await contact.say(result);
      return;
    } else {
      await contact.say(message);
    }
  } catch (e: any) {
    console.error('-----------', e.message, e.stack);
    const sayContent = '对不起，我暂时有点忙，请稍后重试';
    if (e.message.includes('timed out')) {
      console.error(
        'ERROR: Please try again, ChatGPT timed out for waiting response.'
      );
    }
    await contact.say(sayContent);
  }
}
