import { computed, version as currentVersion, ref } from 'vue'

export function useVueImportMap(
  defaults: {
    runtimeDev?: string | (() => string)
    runtimeProd?: string | (() => string)
    serverRenderer?: string | (() => string)
    vueVersion?: string | null
  } = {},
) {
  function normalizeDefaults(defaults?: string | (() => string)) {
    if (!defaults) return
    return typeof defaults === 'string' ? defaults : defaults()
  }

  const productionMode = ref(false)
  const vueVersion = ref<string | null>(defaults.vueVersion || null)
  const importMap = computed<ImportMap>(() => {
    const vue =
      (!vueVersion.value &&
        normalizeDefaults(
          productionMode.value ? defaults.runtimeProd : defaults.runtimeDev,
        )) ||
      `https://cdn.jsdelivr.net/npm/@vue/runtime-dom@${
        vueVersion.value || currentVersion
      }/dist/runtime-dom.esm-browser${productionMode.value ? `.prod` : ``}.js`


    // const ol = "https://cdn.jsdelivr.net/npm/ol@9.1.0/+esm";
    // const ol = "/node_modules/ol/dist/ol.js";
    // const ol = "https://cdn.jsdelivr.net/npm/openlayers/dist/ol.js";
    // const ol = "https://cdn.jsdelivr.net/npm/ol/esm/"
    const ol = "/node_modules/ol/"
    const Cesium = "/node_modules/cesium/Build/CesiumUnminified/index.js";
    const CesiumWidget = "/node_modules/cesium/Build/CesiumUnminified/Widgets/widgets.css"
    const moment = '/node_modules/moment/dist/moment.js';
    const serverRenderer =
      (!vueVersion.value && normalizeDefaults(defaults.serverRenderer)) ||
      `https://cdn.jsdelivr.net/npm/@vue/server-renderer@${
        vueVersion.value || currentVersion
      }/dist/server-renderer.esm-browser.js`
    return {
      imports: {
        vue,
        'vue/server-renderer': serverRenderer,
        'ol/':ol,
        Cesium,
        CesiumWidget,
        moment,
      },
    }
  })

  return {
    productionMode,
    importMap,
    vueVersion,
    defaultVersion: currentVersion,
  }
}

export interface ImportMap {
  imports?: Record<string, string | undefined>
  scopes?: Record<string, Record<string, string>>
}

export function mergeImportMap(a: ImportMap, b: ImportMap): ImportMap {
  return {
    imports: { ...a.imports, ...b.imports },
    scopes: { ...a.scopes, ...b.scopes },
  }
}
