import config from './config.js';
import { retryRequest } from './utils.js';
import { getOpenAIImage, getOpenAiReply } from './openai.js';
import { FileBox } from 'file-box';

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
// 维护全局的对话上下文
const contactContext = new Map<
  string, // contactId
  {
    question: string;
    answer: string;
  }[]
>();

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
    if (content === config.resetKey) {
      clearContactContext(contactId);
      await contact.say('会话已重置');
      return;
    }

    const transformContent = buildContactContextQuery(content, contactId);

    const message = await retryRequest(
      () => getChatGPTReply(transformContent),
      config.retryTimes,
      500
    );
    if (message) {
      saveContactContext(content, message, contactId);
    }

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
    // 清理 当前contact的会话
    clearContactContext(contactId);
    const sayContent = '对不起，我暂时有点忙，请稍后重试';
    if (e.message.includes('timed out')) {
      console.error(
        'ERROR: Please try again, ChatGPT timed out for waiting response.'
      );
    }
    await contact.say(sayContent);
  }
}

export const buildContactContextQuery = (query: string, contactId: string) => {
  let prompt = config.characterDesc || '';
  if (prompt) {
    prompt += '\n\n';
  }
  const curContactContext = contactContext.get(contactId);
  if (curContactContext) {
    for (const conversation of curContactContext) {
      prompt +=
        'Q: ' +
        conversation['question'] +
        '\nA: ' +
        conversation['answer'] +
        '\n';
    }
    prompt += 'Q: ' + query + '\nA: ';
    return prompt;
  } else {
    return prompt + 'Q: ' + query + '\nA: ';
  }
};

export const saveContactContext = (
  query: string,
  answer: string,
  contactId: string
) => {
  const curConversation = {
    question: query,
    answer: answer,
  };
  const curContactContext = contactContext.get(contactId);
  if (curContactContext) {
    contactContext.set(contactId, [...curContactContext, curConversation]);
  } else {
    contactContext.set(contactId, [curConversation]);
  }

  discardExceedConversation(contactId);
};

export const discardExceedConversation = (contactId: string) => {
  const curContactContext = contactContext.get(contactId);
  if (curContactContext) {
    const curContactContextTotalToken = curContactContext.reduce(
      (prev, cur) => {
        return prev + cur.answer.length + cur.question.length;
      },
      0
    );
    if (curContactContextTotalToken > config.conversationMaxTokens) {
      curContactContext.shift();
      contactContext.set(contactId, [...curContactContext]);
    }
  }
};

export const clearContactContext = (contactId: string) => {
  contactContext.set(contactId, []);
};
