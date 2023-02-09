import { remark } from 'remark';
import stripMarkdown from 'strip-markdown';
import { Configuration, OpenAIApi } from 'openai';
import config from './config.js';
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY || config.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
export async function getOpenAiReply(prompt) {
  console.log('prompt', prompt);
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: prompt,
    temperature: 0.9,
    max_tokens: 4000,
    top_p: 1,
    frequency_penalty: 0.0,
    presence_penalty: 0.6,
    stop: [' Human:', ' AI:'],
  });
  const reply = markdownToText(response.data.choices[0].text);
  console.log('reply', reply);
  return reply;
}
export async function getOpenAIImage(prompt) {
  const response = await openai.createImage({
    prompt,
    n: 1,
    size: '512x512',
  });
  const image_url = response.data.data[0].url;
  console.log('image_url1', image_url);
  return image_url;
}
function markdownToText(markdown) {
  return remark()
    .use(stripMarkdown)
    .processSync(markdown ?? '')
    .toString();
}
