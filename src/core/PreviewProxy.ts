// ReplProxy and srcdoc implementation from Svelte REPL
// MIT License https://github.com/sveltejs/svelte-repl/blob/master/LICENSE

let uid = 1

export class PreviewProxy {
  iframe: HTMLIFrameElement
  handlers: Record<string, Function>
  pending_cmds: Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason?: any) => void }
  >
  handle_event: (e: any) => void

  /**
   *
   * @param iframe  iframe 实例
   * @param handlers  回调函数
   */
  constructor(iframe: HTMLIFrameElement, handlers: Record<string, Function>) {
    this.iframe = iframe
    this.handlers = handlers
    this.pending_cmds = new Map()

    this.handle_event = (e) => this.handle_repl_message(e)

    //监听事件，实现和 iframe 的通信
    window.addEventListener('message', this.handle_event, false)
  }
  // 销毁监听
  destroy() {
    window.removeEventListener('message', this.handle_event)
  }

  iframe_command(action: string, args: any) {
    return new Promise((resolve, reject) => {
      const cmd_id = uid++

      this.pending_cmds.set(cmd_id, { resolve, reject })
      // 通知子 iframe 发送事件
      this.iframe.contentWindow!.postMessage({ action, cmd_id, args }, '*')
    })
  }

  handle_command_message(cmd_data: any) {
    let action = cmd_data.action
    let id = cmd_data.cmd_id
    let handler = this.pending_cmds.get(id)

    if (handler) {
      this.pending_cmds.delete(id)
      if (action === 'cmd_error') {
        let { message, stack } = cmd_data
        let e = new Error(message)
        e.stack = stack
        handler.reject(e)
      }

      if (action === 'cmd_ok') {
        handler.resolve(cmd_data.args)
      }
    } else if (action !== 'cmd_error' && action !== 'cmd_ok') {
      console.error('command not found', id, cmd_data, [
        ...this.pending_cmds.keys(),
      ])
    }
  }

  // 初始化回调
  handle_repl_message(event: any) {
    if (event.source !== this.iframe.contentWindow) return

    const { action, args } = event.data
 // 错误成功开始结束的等一些事件回调
    switch (action) {
     
      case 'cmd_error':
      case 'cmd_ok':
        return this.handle_command_message(event.data)
      case 'fetch_progress':
        return this.handlers.on_fetch_progress(args.remaining)
      case 'error':
        return this.handlers.on_error(event.data)
      case 'unhandledrejection':
        return this.handlers.on_unhandled_rejection(event.data)
      // console类型
      case 'console':
        return this.handlers.on_console(event.data)
      case 'console_group':
        return this.handlers.on_console_group(event.data)
      case 'console_group_collapsed':
        return this.handlers.on_console_group_collapsed(event.data)
      case 'console_group_end':
        return this.handlers.on_console_group_end(event.data)
    }
  }
  // 浏览器执行代码(js代码字符串)
  eval(script: string | string[]) {
    //debugger
    return this.iframe_command('eval', { script })
  }

  handle_links() {
    return this.iframe_command('catch_clicks', {})
  }
}
