<template>
  <div id="cesiumContainer"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import * as Cesium from 'Cesium'
import 'CesiumWidget'
console.log("Cesium",Cesium)
// window.CESIUM_BASE_URL = '/node_modules/cesium/Build/CesiumUnminified/'
const init = () => {
  Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxOTA1MmVlYi01MGE4LTRkNDktYThjNC0xMGE0ZjBiM2VlNGIiLCJpZCI6OTc3MTIsImlhdCI6MTcxMjI5MDczNH0.4d9IebgKzizrnsVA2vvNvcQosHWM1aVjMOfLxlH7tCI";
  window.viewer = new Cesium.Viewer("cesiumContainer", {
    timeline: false, //时间轴
    animation: false, //动画控制器
    geocoder: false, //地名查找控制器
    homeButton: false, //Home按钮
    sceneModePicker: false, //投影方式控制器
    baseLayerPicker: false, //图层选择控制器
    navigationHelpButton: false, //帮助按钮
    fullscreenButton: false, //全屏按钮
  });
  console.log("viewer",viewer)
  // 东南西北ESWN
  // Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(73.0, 3.0, 135.0, 53.0);
  // viewer.camera.flyHome();
  viewer._cesiumWidget._creditContainer.style.display = "none"; // LOGO
}

onMounted(() => {
  init();
})
</script>

<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100%;
  margin:0px;
}
</style>


