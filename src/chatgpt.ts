import { ChatGPTAPI } from 'chatgpt';
import config from './config.js';
import { retryRequest } from './utils.js';

let chatGPT: any = {};
let chatOption = {};
export function initChatGPT() {
  chatGPT = new ChatGPTAPI({
    apiKey: process.env.OPENAI_API_KEY || config.OPENAI_API_KEY,
  });
}

async function getChatGPTReply(content, contactId) {
  console.log('reply content', content);
  const { conversationId, text, id } = await chatGPT.sendMessage(
    content,
    chatOption[contactId]
  );
  chatOption = {
    [contactId]: {
      conversationId,
      parentMessageId: id,
    },
  };
  console.log('response: ', conversationId, text);
  // response is a markdown-formatted string
  return text;
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
      () => getChatGPTReply(content, contactId),
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
    console.error(e);
    const sayContent = '对不起，我暂时有点忙，请稍后重试';
    if (e.message.includes('timed out')) {
      console.error(
        'ERROR: Please try again, ChatGPT timed out for waiting response.'
      );
    }
    await contact.say(sayContent);
  }
}
