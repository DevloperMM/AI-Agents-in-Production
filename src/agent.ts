import { addMessages, getMessages, saveToolResponse } from './memory'
import { runLLM } from './llm'
import { showLoader, logMessage, askForApproval } from './ui'
import { runTool } from './toolRunner'

export const runAgent = async (userMessage: string, tools: any[]) => {
  await addMessages([{ role: 'user', content: userMessage }])

  let loader = showLoader('🤔')

  while (true) {
    const history = await getMessages()
    const response = await runLLM({ messages: history, tools })

    await addMessages([response])

    if (response.content) {
      loader.stop()
      logMessage(response)
      return getMessages()
    }

    if (response.tool_calls) {
      const toolCall = response.tool_calls[0]
      logMessage(response)

      if (toolCall.type === 'function') {
        loader.stop()

        const isApproved = await askForApproval(toolCall.function.name)

        if (isApproved) {
          const toolLoader = showLoader(`executing: ${toolCall.function.name}`)

          const toolResponse = await runTool(toolCall, userMessage)
          await saveToolResponse(toolCall.id, toolResponse)

          toolLoader.succeed(`done: ${toolCall.function.name}`)
        } else {
          await saveToolResponse(
            toolCall.id,
            'User denied the execution of tool which was requested by assistant for completing the task',
          )
        }

        loader = showLoader('🤔')
      }
    }
  }
}
