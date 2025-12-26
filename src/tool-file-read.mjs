import 'dotenv/config';
import { ChatOpenAI } from "@langchain/openai";
import { tool } from '@langchain/core/tools'
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import fs from 'node:fs/promises'
import { z } from 'zod'

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME || "qwen-coder-turbo",
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0, // temperature 是温度，也就是 ai 的创造性，设置为 0，让它严格按照指令来做事情，不要自己发挥。如果设置为 1，则 ai 可以自己发挥，生成更加创造性的内容。
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  }
});

const readFileTool = tool(
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, 'utf-8')
    console.log(` [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`)
    return `文件内容: \n${content}`
  },
  {
    // 工具的名字、描述、参数格式 因为要给大模型用 你要描述下这个工具是干什么的
    name: 'read_file',
    description: '用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）。',
    schema: z.object({
      filePath: z.string().describe('要读取的文件路径'),
    }),
  }
)

const tools = [readFileTool]

// 把这个tools传给大模型，这样大模型就可以使用这些工具了。
const modelWithTools = model.bindTools(tools)

const messages = [
  // SystemMessage 设置AI是谁，可以干什么，有什么能力，以及一些回答、行为的规范等
  new SystemMessage(
    `你是一个代码助手，可以使用工具读取文件并解释代码。
    工作流程：
    1. 用户要求读取文件时，立即调用 read_file 工具
    2. 等待工具返回文件内容
    3. 基于文件内容进行分析和解释
    可用工具：
    - read_file: 读取文件内容（使用此工具来获取文件内容）
  `),
  // HumanMessage是用户输入的消息
  new HumanMessage('请读取 src/tool-file-read.mjs 文件内容，并解释代码'),
]

let response = await modelWithTools.invoke(messages)
// console.log(response)

// 把ai返回的消息也放到messages数组，也就是对话记录
// ai返回的是AIMessage类型的消息 它里面有tool_calls属性 里面组合了工具名和调用工具的参数
// 那接下来我们基于这个参数调用下工具不就行了
messages.push(response)

while (response.tool_calls && response.tool_calls.length > 0) {
  console.log(`\n[监测到 ${response.tool_calls.length} 个工具调用]`)

  // 执行所有工具调用
  const toolResults = await Promise.all(
    response.tool_calls.map(async (toolCall) => {
      const tool = tools.find(tool => tool.name === toolCall.name)
      if (!tool) {
        return `错误：找不到工具 ${toolCall.name}`
      }
      console.log(`[执行工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`)
      try {
        // 调用readFileTool 传入参数 filePath
        const result = await tool.invoke(toolCall.args)
        return result
      } catch (error) {
        return `工具执行错误：${error.message}`
      }
    })
  )

  // 将工具调用的结果ToolMessage添加到对消息历史
  response.tool_calls.forEach((toolCall, index) => {
    messages.push(
      new ToolMessage({
        content: toolResults[index],
        tool_call_id: toolCall.id,
      })
    )
  })
  // 再次调用模型 传入工具结果
  response = await modelWithTools.invoke(messages)
  messages.push(response)
}
// console.log('---messages---', messages) // 包含SystemMessage、HumanMessage、AIMessage、ToolMessage
console.log('\n[最终回复]')

console.log(response.content)