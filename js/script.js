import { getSubway } from "./data.js";
import * as utils from './utils.js';

const outerMargin = 20;
const windowWidth = document.documentElement.clientWidth - 2 * outerMargin;
const windowHeight = document.documentElement.clientHeight - 2 * outerMargin;  const mainWidth = document.querySelector('#main').clientWidth;
const mainHeight = document.querySelector('#main').clientHeight;
let geoFeature;

const beijingMap = 'https://geo.datav.aliyun.com/areas_v2/bound/110000_full.json';

async function initBottom() {
  let timeData = await fetch('../data/time.json')
    .then(response => response.json());
  let timeScale = d3.scaleLinear()
                    .domain([d3.min(timeData, d => d.year), d3.max(timeData, d => d.year)])
                    .range([outerMargin + windowWidth * 0.1, outerMargin + windowWidth * 0.9]);
  let timeAxis = d3.axisBottom(timeScale)
                   .ticks(timeData.length)
                   .tickFormat(d => d);
  let valueScale = d3.scaleLinear()
                     .domain([0, d3.max(timeData, d => d.value)])
                     .range([windowHeight * 0.16, windowHeight * 0.01]);
  let valueAxis = d3.axisLeft(valueScale)
                    .ticks(Math.ceil(d3.max(timeData, d => d.value) / 100))
                    .tickFormat(d => d);
  let bottomSvg = d3.select('#bottom').append('svg')
                      .attr('id', 'bottom-container')
                      .attr('height', '100%')
                      .attr('width', '100%');
  bottomSvg.append('g')
        .attr('transform', `translate(0, ${0.16 * windowHeight})`)
        .call(timeAxis)
          .style('user-select', 'none');
  bottomSvg.append('g')
        .attr('transform', `translate(${outerMargin + windowWidth * 0.1}, 0)`)
        .call(valueAxis)
          .style('user-select', 'none');
  // points
  bottomSvg.append('g')
    .selectAll('circle')
    .data(timeData)
    .enter().append('circle')
    .attr('cx', d => timeScale(d.year))
    .attr('cy', d => valueScale(d.value))
    .attr('r', '3px')
    .style('fill', '#597ef7')
    .style('stroke', '#2f54eb')
    .style('stroke-width', '0.5px');
  // lines
  const lines = [];
  for (let i = 0; i < timeData.length - 1; ++i) {
    lines.push({
      source: timeData[i],
      target: timeData[i + 1]
    });
  }
  bottomSvg.append('g')
    .selectAll('line')
    .data(lines)
    .join('line')
      .attr('x1', d => timeScale(d.source.year))
      .attr('x2', d => timeScale(d.target.year))
      .attr('y1', d => valueScale(d.source.value))
      .attr('y2', d => valueScale(d.target.value))
      .attr('stroke', '#2f54eb')
      .attr('stroke-width', '0.5px');
  drawDrag();
}

function initSide() {
  const distMatrix = [];
  for (let i = 0; i < 50; ++i) {
    distMatrix[i] = [];
    for (let j = 0; j < 50; ++j) {
      distMatrix[i][j] = (Math.random() * 10).toFixed(2);
    }
  }
  let colorScale = d3.scaleDiverging()
                       .domain([10, 5, 0])
                       .interpolator(d3.piecewise(d3.interpolate, ['#f5222d', '#ffffff', '#52c41a']));
  d3.select('#side').append('table')
    .selectAll('tr')
    .data(distMatrix)
    .join('tr')
    .style('height', '5px')
    .selectAll('td')
    .data(d => d)
    .join('td')
      .style('width', '5px')
      .style('background-color', d => colorScale(d));
}

function drawDrag() {
  console.log('hey')
  const bottomContainer = d3.select('#bottom-container');
  bottomContainer.append('line')
    .attr('x1', outerMargin + windowWidth * 0.1)
    .attr('x2', outerMargin + windowWidth * 0.9)
    .attr('y1', windowHeight * 0.22)
    .attr('y2', windowHeight * 0.22)
    .style('stroke', '#597ef7')
    .style('stroke', '#000000')
    .style('stroke-width', '1.5px');
  bottomContainer.append('rect')
    .attr('x', outerMargin + windowWidth * 0.1)
    .attr('y', windowHeight * 0.22 - 10)
    .attr('width', 8)
    .attr('height', 20)
    .attr('fill', '#2f54eb');
  bottomContainer.append('text')
    .attr('x', outerMargin + windowWidth * 0.9 + 32)
    .attr('y', windowHeight * 0.22 + 5)
    .attr('font-size', '12px')
    .style('user-select', 'none')
    .text('2006/9');
}

async function initMain() {
  geoFeature = await fetch(beijingMap)
    .then(response => response.json());
  const mainSvg = d3.select('#main').append('svg');
  mainSvg
    .style('width', '100%')
    .style('height', '100%')
    .attr('id', 'main-svg')
    .append('g')
    .append('path')
    .datum(geoFeature)
    .attr('d', d3.geoPath(
      d3.geoMercator()
        .fitExtent([[0, 0], [mainWidth - 40, mainHeight * 2 - 40]], geoFeature)
    ))
    .attr('transform', `translate(0, ${-mainHeight * 0.9})`)
    .attr('fill', 'transparent')
    .attr('stroke', '#333333');
  drawSubway();
  const zoom = d3.zoom().on('zoom', e => {
    const g = d3.select('#main-svg').select('g');
    g.attr('transform', e.transform);
  });
  mainSvg.call(zoom);
}

async function drawSubway() {
  const subwayLines = await getSubway();
  let stations = subwayLines.map(v => v.st.map(vv => {
    let point = utils.getPointJson();
    point.geometry.coordinates = [vv.x, vv.y];
    return point;
  }));
  stations = _.flattenDeep(stations);
  stations = _.uniqWith(stations, _.isEqual);
  let links = subwayLines.map(v => {
    let line = utils.getLineJson();
    line.properties.color = utils.colors[v.name];
    line.geometry.coordinates = v.st.map(vv => [vv.x, vv.y]);
    if (v.isLoop) {
      console.log('#', v.name);
      line.geometry.coordinates.push([v.st[0].x, v.st[0].y]);
    }
    return line;
  });
  const g = d3.select('#main-svg')
    .select('g');
  g.selectAll('.path-link')
    .data(links)
    .enter().append('path')
      .attr('class', 'path-link')
      .attr('d', d3.geoPath(
        d3.geoMercator()
          .translate([0, 0.5 * mainHeight])
          .fitExtent([[0, 0], [mainWidth - 40, mainHeight * 2 - 40]], geoFeature)
      ))
      .attr('transform', `translate(0, ${-mainHeight * 0.9})`)
      .attr('fill', 'transparent')
      .attr('stroke', d => d.properties.color)
      .attr('stroke-width', 0.5);
  g.selectAll('.path-point')
    .data(stations)
    .enter().append('path')
      .attr('class', 'path-point')
      .attr('d', d3.geoPath(
        d3.geoMercator()
          .translate([0, 0.5 * mainHeight])
          .fitExtent([[0, 0], [mainWidth - 40, mainHeight * 2 - 40]], geoFeature)
      ).pointRadius(0.5))
      .attr('transform', `translate(0, ${-mainHeight * 0.9})`)
      .attr('fill', '#ffffff')
      .attr('stroke', '#333333')
      .attr('stroke-width', 0.1);
}

async function main() {
  initBottom();
  initSide();
  initMain();
}

main();