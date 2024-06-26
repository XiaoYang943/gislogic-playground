import type { File, Store } from '../store/store'
import type {
  BindingMetadata,
  CompilerOptions,
  SFCDescriptor,
} from 'vue/compiler-sfc'
import { transform } from 'sucrase'
import hashId from 'hash-sum'

export const COMP_IDENTIFIER = `__sfc__`

async function transformTS(src: string) {
  return transform(src, {
    transforms: ['typescript'],
  }).code
}

export async function compileFile(
  store: Store,
  { filename, code, compiled }: File,
): Promise<(string | Error)[]> {
  // debugger
  // 如果没有code 则返回空
  if (!code.trim()) {
    return []
  }
  // 如果是css内容则直接返回css
  if (filename.endsWith('.css')) {
    compiled.css = code
    return []
  }
  // 处理js 以及ts 模块
  if (filename.endsWith('.js') || filename.endsWith('.ts')) {
    if (filename.endsWith('.ts')) {
      code = await transformTS(code)
    }
    compiled.js = compiled.ssr = code
    return []
  }
  // 处理json
  if (filename.endsWith('.json')) {
    let parsed
    try {
      parsed = JSON.parse(code)
    } catch (err: any) {
      console.error(`Error parsing ${filename}`, err.message)
      return [err.message]
    }
    compiled.js = compiled.ssr = `export default ${JSON.stringify(parsed)}`
    return []
  }

  if (!filename.endsWith('.vue')) {
    return []
  }
  // 最后处理vue 模板
  // 生成唯一id
  const id = hashId(filename)
  //debugger
  // 拆分文件
  const { errors, descriptor } = store.compiler.parse(code, {
    filename,
    sourceMap: true,
    templateParseOptions: store.sfcOptions?.template?.compilerOptions,
  })
  if (errors.length) {
    return errors
  }

  if (
    descriptor.styles.some((s) => s.lang) ||
    (descriptor.template && descriptor.template.lang)
  ) {
    return [
      `lang="x" pre-processors for <template> or <style> are currently not ` +
        `supported.`,
    ]
  }

  const scriptLang =
    (descriptor.script && descriptor.script.lang) ||
    (descriptor.scriptSetup && descriptor.scriptSetup.lang)
  const isTS = scriptLang === 'ts'
  if (scriptLang && !isTS) {
    return [`Only lang="ts" is supported for <script> blocks.`]
  }

  const hasScoped = descriptor.styles.some((s) => s.scoped)
  let clientCode = ''
  let ssrCode = ''

  const appendSharedCode = (code: string) => {
    clientCode += code
    ssrCode += code
  }

  let clientScript: string
  let bindings: BindingMetadata | undefined
  // 处理js
  try {
    ;[clientScript, bindings] = await doCompileScript(
      store,
      descriptor,
      id,
      false,
      isTS,
    )
  } catch (e: any) {
    return [e.stack.split('\n').slice(0, 12).join('\n')]
  }

  clientCode += clientScript

  // script ssr needs to be performed if :
  // 1.using <script setup> where the render fn is inlined.
  // 2.using cssVars, as it do not need to be injected during SSR.
  if (descriptor.scriptSetup || descriptor.cssVars.length > 0) {
    try {
      const ssrScriptResult = await doCompileScript(
        store,
        descriptor,
        id,
        true,
        isTS,
      )
      ssrCode += ssrScriptResult[0]
    } catch (e) {
      ssrCode = `/* SSR compile error: ${e} */`
    }
  } else {
    // the script result will be identical.
    ssrCode += clientScript
  }

  // template
  // only need dedicated compilation if not using <script setup>
  // 处理模板
  if (
    descriptor.template &&
    (!descriptor.scriptSetup ||
      store.sfcOptions?.script?.inlineTemplate === false)
  ) {
    const clientTemplateResult = await doCompileTemplate(
      store,
      descriptor,
      id,
      bindings,
      false,
      isTS,
    )
    if (Array.isArray(clientTemplateResult)) {
      return clientTemplateResult
    }
    clientCode += `;${clientTemplateResult}`

    const ssrTemplateResult = await doCompileTemplate(
      store,
      descriptor,
      id,
      bindings,
      true,
      isTS,
    )
    if (typeof ssrTemplateResult === 'string') {
      // ssr compile failure is fine
      ssrCode += `;${ssrTemplateResult}`
    } else {
      ssrCode = `/* SSR compile error: ${ssrTemplateResult[0]} */`
    }
  }

  if (hasScoped) {
    appendSharedCode(
      `\n${COMP_IDENTIFIER}.__scopeId = ${JSON.stringify(`data-v-${id}`)}`,
    )
  }

  // styles
  const ceFilter = store.sfcOptions.script?.customElement || /\.ce\.vue$/
  function isCustomElement(filters: typeof ceFilter): boolean {
    if (typeof filters === 'boolean') {
      return filters
    }
    if (typeof filters === 'function') {
      return filters(filename)
    }
    return filters.test(filename)
  }
  let isCE = isCustomElement(ceFilter)

  let css = ''
  let styles: string[] = []
  for (const style of descriptor.styles) {
    if (style.module) {
      return [`<style module> is not supported in the playground.`]
    }

    const styleResult = await store.compiler.compileStyleAsync({
      ...store.sfcOptions?.style,
      source: style.content,
      filename,
      id,
      scoped: style.scoped,
      modules: !!style.module,
    })
    if (styleResult.errors.length) {
      // postcss uses pathToFileURL which isn't polyfilled in the browser
      // ignore these errors for now
      if (!styleResult.errors[0].message.includes('pathToFileURL')) {
        store.errors = styleResult.errors
      }
      // proceed even if css compile errors
    } else {
      isCE ? styles.push(styleResult.code) : (css += styleResult.code + '\n')
    }
  }
  if (css) {
    compiled.css = css.trim()
  } else {
    compiled.css = isCE
      ? (compiled.css =
          '/* The component style of the custom element will be compiled into the component object */')
      : '/* No <style> tags present */'
  }

  if (clientCode || ssrCode) {
    const ceStyles = isCE
      ? `\n${COMP_IDENTIFIER}.styles = ${JSON.stringify(styles)}`
      : ''
    appendSharedCode(
      `\n${COMP_IDENTIFIER}.__file = ${JSON.stringify(filename)}` +
        ceStyles +
        `\nexport default ${COMP_IDENTIFIER}`,
    )
    compiled.js = clientCode.trimStart()
    compiled.ssr = ssrCode.trimStart()
    // 输出编译后的结果 包括ssr 和js
    //debugger
    console.log(compiled)
  }

  return []
}

async function doCompileScript(
  store: Store,
  descriptor: SFCDescriptor,
  id: string,
  ssr: boolean,
  isTS: boolean,
): Promise<[code: string, bindings: BindingMetadata | undefined]> {
  if (descriptor.script || descriptor.scriptSetup) {
    const expressionPlugins: CompilerOptions['expressionPlugins'] = isTS
      ? ['typescript']
      : undefined
    const compiledScript = store.compiler.compileScript(descriptor, {
      inlineTemplate: true,
      ...store.sfcOptions?.script,
      id,
      templateOptions: {
        ...store.sfcOptions?.template,
        ssr,
        ssrCssVars: descriptor.cssVars,
        compilerOptions: {
          ...store.sfcOptions?.template?.compilerOptions,
          expressionPlugins,
        },
      },
    })
    let code = ''
    if (compiledScript.bindings) {
      code += `\n/* Analyzed bindings: ${JSON.stringify(
        compiledScript.bindings,
        null,
        2,
      )} */`
    }
    code +=
      `\n` +
      store.compiler.rewriteDefault(
        compiledScript.content,
        COMP_IDENTIFIER,
        expressionPlugins,
      )

    if ((descriptor.script || descriptor.scriptSetup)!.lang === 'ts') {
      code = await transformTS(code)
    }

    return [code, compiledScript.bindings]
  } else {
    return [`\nconst ${COMP_IDENTIFIER} = {}`, undefined]
  }
}

async function doCompileTemplate(
  store: Store,
  descriptor: SFCDescriptor,
  id: string,
  bindingMetadata: BindingMetadata | undefined,
  ssr: boolean,
  isTS: boolean,
) {
  //https://github.com/yixinagqingyuan/yys-browser/tree/master
  let { code, errors } = store.compiler.compileTemplate({
    isProd: false,
    ...store.sfcOptions?.template,
    ast: descriptor.template!.ast,
    source: descriptor.template!.content,
    filename: descriptor.filename,
    id,
    scoped: descriptor.styles.some((s) => s.scoped),
    slotted: descriptor.slotted,
    ssr,
    ssrCssVars: descriptor.cssVars,
    compilerOptions: {
      ...store.sfcOptions?.template?.compilerOptions,
      bindingMetadata,
      expressionPlugins: isTS ? ['typescript'] : undefined,
    },
  })
  if (errors.length) {
    return errors
  }

  const fnName = ssr ? `ssrRender` : `render`

  code =
    `\n${code.replace(
      /\nexport (function|const) (render|ssrRender)/,
      `$1 ${fnName}`,
    )}` + `\n${COMP_IDENTIFIER}.${fnName} = ${fnName}`

  if ((descriptor.script || descriptor.scriptSetup)?.lang === 'ts') {
    code = await transformTS(code)
  }

  return code
}
