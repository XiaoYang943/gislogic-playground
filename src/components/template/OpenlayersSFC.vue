<template>
  <div id="map"></div>
  <div>{{moment()}}</div>

</template>

<script setup>
import { onMounted } from 'vue'
import moment from 'moment'
import Map from 'ol/Map.js';
import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js';
import { Tile } from 'ol/layer.js'
import { XYZ } from 'ol/source.js'
const init = () => {
  const map = new Map({
    layers: [
      new TileLayer({
        source: new OSM(),
      }),
      new Tile({
        source: new XYZ({
          url: 'http://t0.tianditu.com/DataServer?T=vec_w&tk=a9bbec302f2213e1fe33e9775187d021&x={x}&y={y}&l={z}',
        }),
        zIndex: 0,
      }),
    ],
    target: 'map',
    // view: new View({
    //   center: [123,99],
    //   zoom: 2,
    // }),
  });
  console.log(map.getAllLayers())
}
onMounted(() => {
  init();
})
</script>

<style scoped>
#map {
  width: 500px;
  height: 500px;
  margin:0px;
}
</style>


