export function getPointJson() {
  return ({
    "type": "Feature",
    "properties": {},
    "geometry": {
      "type": "Point",
      "coordinates": []
    }
  });
}

export function getLineJson() {
  return ({
    "type": "Feature",
    "properties": {},
    "geometry": {
      "type": "LineString",
      "coordinates": []
    }
  });
}

export const colors = {
  "S1线": "#b35a1f",
  "地铁1号线": "#cc0000",
  "地铁2号线": "#0065b3",
  "地铁4号线大兴线": "#008187",
  "地铁5号线": "#a61d7f",
  "地铁6号线": "#d0970a",
  "地铁7号线": "#f9be58",
  "地铁8号线": "#018237",
  "地铁8号线南段": "#018237",
  "地铁9号线": "#86b81c",
  "地铁10号线": "#019ac3",
  "地铁13号线": "#fcd600",
  "地铁14号线东段": "#e4a8a3",
  "地铁14号线西段": "#e4a8a3",
  "地铁15号线": "#793e8c",
  "地铁16号线": "#6cb46b",
  "地铁八通线": "#cc0000",
  "地铁昌平线": "#eb81b9",
  "北京大兴国际机场线": "#2249a3",
  "地铁房山线": "#ee782e",
  "首都机场线": "#a49abd",
  "西郊线": "#fc0601",
  "地铁燕房线": "#ee782e",
  "地铁亦庄线": "#f0087d"
}

export const windowWidth = document.documentElement.clientWidth;
export const windowHeight = document.documentElement.clientHeight;
export const outerMargin = 20;
export const mainWidth = document.querySelector('#main').clientWidth;
export const mainHeight = document.querySelector('#main').clientHeight;
export const sideWidth = document.querySelector('#side').clientWidth;