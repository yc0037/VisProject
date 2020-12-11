import { getSubway } from "./data.js";
import * as utils from './utils.js';

const { mainHeight, mainWidth } = utils;

let geoFeature;
let geopath;
let geoprojection;

// const beijingMap = 'https://geo.datav.aliyun.com/areas_v2/bound/110000_full.json';
const beijingMap = './data/110000_full.json';

let currentScale = 1;
let g;
let stations;

export async function initMain() {
  geoFeature = await fetch(beijingMap)
    .then(response => response.json());
  geoprojection = d3.geoMercator()
                    .fitExtent([[-mainWidth, mainHeight * (-3.5)], 
                                [mainWidth * 2.3, mainHeight * 3.5]], 
                                geoFeature);
  geopath = d3.geoPath(geoprojection);
  const mainSvg = d3.select('#main').append('svg');
  g = mainSvg
    .style('width', '100%')
    .style('height', '100%')
    .attr('id', 'main-svg')
    .append('g')
    .append('path')
    .datum(geoFeature)
    .attr('d', geopath)
    .attr('transform', `translate(0, -${mainHeight * mainWidth / 1600})`)
    .attr('fill', 'transparent')
    .attr('stroke', '#666666')
    .attr('stroke-width', 0.2)
    .attr('id', 'border-path');
  drawSubway();
  const zoom = d3.zoom().on('zoom', e => {
    currentScale = e.transform.k;
    g.transition().ease(d3.easeExpOut).duration(1000).attr('transform', e.transform);
    g.selectAll('.border-path')
      .attr('stroke-width', 0.2 / Math.sqrt(e.transform.k));
    g.selectAll('.fake-point')
      .attr('d', geopath.pointRadius(Math.max(1.3, 4 / Math.sqrt(currentScale))));
  });
  mainSvg.call(zoom);
  drawLegend();
}

async function drawSubway() {
  const subwayLines = await getSubway();
  stations = subwayLines.map(v => v.st.map(vv => {
    let point = utils.getPointJson();
    point.properties.name = vv.name;
    point.geometry.coordinates = [+vv.x, +vv.y];
    return point;
  }));
  stations = _.flattenDeep(stations);
  stations = _.uniqWith(stations, _.isEqual);
  let links = subwayLines.map(v => {
    let line = utils.getLineJson();
    line.properties.name = v.name;
    line.properties.color = utils.colors[v.name];
    line.geometry.coordinates = v.st.map(vv => [vv.x, vv.y]);
    if (v.isLoop) {
      line.geometry.coordinates.push([v.st[0].x, v.st[0].y]);
    }
    return line;
  });
  g = d3.select('#main-svg')
    .select('g')
  g.selectAll('.path-link')
    .data(links)
    .enter().append('path')
      .attr('class', 'path-link')
      .attr('id', d => `subway-line-${d.properties.name}`)
      .attr('d', geopath)
      .attr('transform', `translate(0, -${mainHeight * mainWidth / 1600})`)
      .attr('fill', 'transparent')
      .attr('stroke', d => d.properties.color)
      .attr('stroke-width', 1.5);
  g.selectAll('.path-point')
    .data(stations)
    .enter().append('path')
      .attr('class', 'path-point')
      .attr('d', geopath.pointRadius(1.3))
      .attr('transform', `translate(0, -${mainHeight * mainWidth / 1600})`)
      .attr('fill', '#ffffff')
      .attr('stroke', '#333333')
      .attr('stroke-width', 0.2)
      .attr('id', d => d.properties.name);
  g.selectAll('.fake-point')
    .data(stations)
    .enter().append('path')
      .attr('class', 'fake-point')
      .attr('d', geopath.pointRadius(4))
      .attr('transform', `translate(0, -${mainHeight * mainWidth / 1600})`)
      .attr('fill', 'transparent')
      .attr('id', d => d.properties.name + '-fake')
      .on('mouseover', (e, d) => {
        d3.select(`#${d.properties.name}`)
          .transition()
          .duration(100)
          .attr('d', geopath.pointRadius(2));
        d3.select(`#${d.properties.name}-fake`)
          .attr('d', geopath.pointRadius(Math.max(2, 4 / Math.sqrt(currentScale))));
        let content = `${d.properties.name}`;
        d3.select('#main-tooltip')
          .html(content)
          .style('top', `${e.clientY + 3}px`)
          .style('left', `${e.clientX + 3}px`)
          .style('visibility', 'visible');
      })
      .on('mouseout', (e, d) => {
        d3.select(`#${d.properties.name}`)
          .transition()
          .duration(100)
          .attr('d', geopath.pointRadius(1.3));
        d3.select(`#${d.properties.name}-fake`)
          .attr('d', geopath.pointRadius(Math.max(1.3, 4 / Math.sqrt(currentScale))));
        d3.select('#main-tooltip')
          .style('visibility', 'hidden');
      })
      .on('click', (e, d) => {
        generateHeatMap(d.geometry.coordinates);
      });
}

function drawLegend() {
  const legends = d3.select('#main')
    .append('div').attr('id', 'map-legend-container');
  const colors = utils.colors;
  for (const key in colors) {
    const legend = legends.append('div')
            .attr('id', `legend-${key}`)
            .classed(`map-legend flex center`, true);
    legend.append('div')
      .classed('legend-color', true)
      .style('background-color', colors[key]);
    legend.append('div')
      .classed('legend-label', true)
      .text(key);
    legend.on('mouseover', e => {
      d3.select(`#legend-${key}`)
        .style('background-color', '#dddddddd');
      d3.select(`#subway-line-${key}`)
        .attr('stroke', d3.color(colors[key]).brighter().toString());
    });
    legend.on('mouseout', e => {
      d3.select(`#legend-${key}`)
        .style('background-color', '#eeeeeedd');
      d3.select(`#subway-line-${key}`)
      .attr('stroke', colors[key]);
    })
  }
}

function generateHeatMap(center, delta = [0.003, 0.0023]) {
  let centerX = center[0];
  let centerY = center[1];
  let deltaX = delta[0];
  let deltaY = delta[1];
  let points = [];
  for (let i = -10; i <= 10; i++) {
    for (let j = -10; j <= 10; j++) {
      let point = utils.getPointJson();
      point.geometry.coordinates = [centerX + i * deltaX, centerY + j * deltaY];
      points.push(point);
    }
  }
  g.selectAll('.heat_point')
    .remove();
  addPoints(points, 'heat_point');
  points.forEach(function(point) {
    let min = 100000;
    for (let i = 0; i < stations.length; i++) {
      let dis = distance(stations[i].geometry.coordinates[0], stations[i].geometry.coordinates[1],
          point.geometry.coordinates[0], point.geometry.coordinates[1]);
      if (dis < min) {
        min = dis;
        point.nearest = stations[i];
      }
    }
  })
  console.log(points);
  g.selectAll('line')
    .data(points)
    .join('line')
      .attr('x1', d => geoprojection(d.nearest.geometry.coordinates)[0])
      .attr('y1', d => geoprojection(d.nearest.geometry.coordinates)[1])
      .attr('x2', d => geoprojection(d.geometry.coordinates)[0])
      .attr('y2', d => geoprojection(d.geometry.coordinates)[1])
      .attr('transform', `translate(0, -${mainHeight * mainWidth / 1600})`)
      .attr('stroke', '#2f54eb')
      .attr('stroke-width', '0.15px');
}

function addPoints(points, _class) {
  g.selectAll('.' + _class)
    .data(points)
    .enter().append('path')
      .attr('class', _class)
      .attr('d', geopath.pointRadius(1.3))
      .attr('transform', `translate(0, -${mainHeight * mainWidth / 1600})`)
      .attr('fill', '#ffffff')
      .attr('stroke', '#333333')
      .attr('stroke-width', 0.2);
  align();
}

function align() {
  g.selectAll('.path-link').raise();
  g.selectAll('.path-point').raise();
  g.selectAll('.fake-point').raise();
}

const EARTH_RADIUS = 6378.137;
function distance(lat1, lng1, lat2, lng2) {

  function rad(d) {
    return d * Math.PI / 180;
  }

  let radLat1 = rad(lat1);
  let radLat2 = rad(lat2);
  let a = radLat1 - radLat2;
  let b = rad(lng1) - rad(lng2);

  let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a/2),2) +
          Math.cos(radLat1)*Math.cos(radLat2)*Math.pow(Math.sin(b/2),2)));
  s = s * EARTH_RADIUS;
  return s;
}