import 'dotenv/config'
import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import { ChatOpenAI } from '@langchain/openai'
import chalk from 'chalk'
import { HumanMessage, ToolMessage, SystemMessage } from '@langchain/core/messages'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME || "qwen-plus",
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  }
})

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    'my-mcp-server': {
      command: 'node',
      args: [
        "/Users/dongyuekai/Desktop/demos/AI_DEV/tool-test/src/my-mcp-server.mjs"
      ]
    }
  }
})

const tools = await mcpClient.getTools()
const modelWithTools = model.bindTools(tools)

async function runAgentWithTools(query, maxIterations = 30) {
  // 读取resource内容
  const res = await mcpClient.listResources();
  let resourceContent = ''
  for (const [serverName, resources] of Object.entries(res)) {
    for (const resource of resources) {
      const content = await mcpClient.readResource(serverName, resource.uri);
      // console.log('dyk---', serverName, resource.uri, content);
      resourceContent += content[0].text
    }
  }
  const messages = [
    new SystemMessage(resourceContent),
    new HumanMessage(query)
  ]
  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`))
    const response = await modelWithTools.invoke(messages)
    messages.push(response)

    // 检查是否有工具调用
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`)
      return response.content
    }
    console.log(chalk.bgBlue(`[监测到 ${response.tool_calls.length} 个工具调用]`))
    console.log(chalk.bgBlue(`工具调用：${response.tool_calls.map(t => t.name).join(', ')}`))

    // 执行工具调用
    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find(t => t.name === toolCall.name)
      if (foundTool) {
        const toolResult = await foundTool.invoke(toolCall.args)
        console.log(chalk.bgCyan(`📝 工具调用参数: ${JSON.stringify(toolCall.args)}`))
        console.log(chalk.bgCyan(`📝 工具调用结果: ${toolResult}`))
        messages.push(new ToolMessage({
          content: toolResult,
          tool_call_id: toolCall.id
        }))
        console.log('messages:', messages)
      }
    }
  }
  // messages数组中最后一个元素就是ToolMessage,格式如下：
  // ToolMessage {
  //   "content": "用户信息：\n- ID：002\n- 姓名：李四\n- 邮箱：lisi@example.com\n- 角色：user",
  //   "additional_kwargs": {},
  //   "response_metadata": {},
  //   "tool_call_id": "call_7f23eb1164f74ab9873c9133"
  // }
  return messages[messages.length - 1].content
}

await runAgentWithTools('查一下用户 002 的信息')

await mcpClient.close()