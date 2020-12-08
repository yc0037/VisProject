import { getSubway } from "./data.js";
import * as utils from './utils.js';

const outerMargin = 20;
const windowWidth = document.documentElement.clientWidth - 2 * outerMargin;
const windowHeight = document.documentElement.clientHeight - 2 * outerMargin;  const mainWidth = document.querySelector('#main').clientWidth;
const mainHeight = document.querySelector('#main').clientHeight;
const sideWidth = document.querySelector('#side').clientWidth;
let geoFeature;
let geopath;
let geoprojection;

const beijingMap = 'https://geo.datav.aliyun.com/areas_v2/bound/110000_full.json';

async function initBottom() {
  let timeData = await fetch('../data/time.json')
    .then(response => response.json());
  let [minYear, maxYear] = [d3.min(timeData, d => d.year), d3.max(timeData, d => d.year)];
  let timeScale = d3.scaleLinear()
                    .domain([minYear - 0.1, maxYear + 1])
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
  // points
  bottomSvg.append('g')
    .selectAll('circle')
    .data(timeData)
    .enter().append('circle')
    .attr('cx', d => timeScale(d.year))
    .attr('cy', d => valueScale(d.value))
    .attr('r', 3)
    .attr('id', d => `point-${d.year}`)
    .style('fill', '#597ef7')
    .style('stroke', '#2f54eb')
    .style('stroke-width', '0.5px')
    .on('mouseover', (e, d) => {
      const current = d3.select(`#point-${d.year}`);
      current
        .transition()
        .duration(200)
        .attr('r', 5);
      const tooltip = d3.select('#bottom-tooltip');
      tooltip
        .style('top', `${valueScale(d.value) - 25}px`)
        .style('left', `${timeScale(d.year) - 10}px`)
        .style('visibility', 'visible')
        .text(d.value);
    })
    .on('mouseout', (e, d) => {
      const current = d3.select(`#point-${d.year}`);
      current
        .transition()
        .duration(200)
        .attr('r', 3);
      const tooltip = d3.select('#bottom-tooltip');
      tooltip.style('visibility', 'hidden');
    });
  drawDrag(minYear, maxYear, timeScale(minYear));
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
  let sideSvg = d3.select('#side').append('svg')
                                  .style('width', '100%')
                                  .style('height', '100%');
  let g = sideSvg.append('g').attr('id', 'matrix');
  const cellWidth = 8;
  const topOffset = (mainHeight - cellWidth * distMatrix.length - 40) / 2;
  const leftOffset = (sideWidth - cellWidth * distMatrix.length) / 2;
  for (let i = 0; i < distMatrix.length; ++i) {
    for (let j = 0; j < distMatrix[i].length; ++j) {
      function fover(e) {
        let [ , ii, jj] = e.target.id.split('-');
        const parent = document.querySelector('#matrix');
        parent.insertAdjacentElement('beforeEnd', document.querySelector(`#${e.target.id}`));
        d3.select(`#${e.target.id}`)
          .transition()
          .duration(100)
          .attr('width', cellWidth + 8)
          .attr('height', cellWidth + 8)
          .attr('x', leftOffset + jj * cellWidth - 4)
          .attr('y', topOffset + ii * cellWidth - 4)
          .attr('stroke-width', 1);
        let content = `起点：${ii}<br/>终点：${jj}<br/>用时：${distMatrix[i][j]}`;
        d3.select('#side-tooltip')
          .html(content)
          .style('top', `${topOffset + ii * cellWidth - 2}px`)
          .style('right', `${leftOffset + (distMatrix.length - jj) * cellWidth + 10}px`)
          .style('visibility', 'visible');
      };
      function fout(e) {
        let [ , ii, jj] = e.target.id.split('-');
        d3.select(`#${e.target.id}`)
          .transition()
          .duration(100)
          .attr('width', cellWidth)
          .attr('height', cellWidth)
          .attr('x', leftOffset + jj * cellWidth)
          .attr('y', topOffset + ii * cellWidth);
        d3.select('#side-tooltip')
          .style('visibility', 'hidden');
      }
      g.append('rect')
        .attr('x', leftOffset + j * cellWidth)
        .attr('y', topOffset + i * cellWidth)
        .attr('width', cellWidth)
        .attr('height', cellWidth)
        .attr('fill', colorScale(distMatrix[i][j]))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 0.5)
        .attr('id', `cell-${i}-${j}`)
        .on('mouseover', fover)
        .on('mouseout', fout);
    }
  }
  let linearGradient = sideSvg.append('defs')
                              .append('linearGradient')
                                .attr('id', 'linearColor')
                                .attr('x1', '0%')
                                .attr('x2', '100%')
                                .attr('y1', '0%')
                                .attr('y2', '0%');
  linearGradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', '#52c41a');
  linearGradient.append('stop')
                .attr('offset', '50%')
                .attr('stop-color', '#ffffff');
  linearGradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', '#f5222d');
  sideSvg.append('rect')
          .attr('width', sideWidth * 0.8)
          .attr('height', 20)
          .attr('x', sideWidth * 0.1)
          .attr('y', topOffset + distMatrix.length * cellWidth + 20)
          .attr('fill', `url(#${linearGradient.attr('id')})`);
  sideSvg.append('text')
          .attr('x', sideWidth * 0.1 - 4)
          .attr('y', topOffset + distMatrix.length * cellWidth + 55)
          .attr('font-size', 12)
          .text('0');
  sideSvg.append('text')
          .attr('x', sideWidth * 0.5 - 4)
          .attr('y', topOffset + distMatrix.length * cellWidth + 55)
          .attr('font-size', 12)
          .text('5');
  sideSvg.append('text')
          .attr('x', sideWidth * 0.9 - 4)
          .attr('y', topOffset + distMatrix.length * cellWidth + 55)
          .attr('font-size', 12)
          .text('10');
}

function drawDrag(minYear, maxYear, offset) {
  const bottomContainer = d3.select('#bottom-container');
  const xMin = offset;
  const xMax = outerMargin + windowWidth * 0.9;
  const yDate = windowHeight * 0.22;
  const yTime = windowHeight * 0.27;
  let slideBlock;
  function getX(rx) {
    if (rx < xMin) {
      return xMin;
    } else if (rx > xMax - 8) {
      return xMax - 8;
    } else {
      return rx;
    }
  }
  function getDate(x) {
    const numSeg = (maxYear + 1 - minYear) * 12,
          segLen = (xMax - xMin) / numSeg,
          nSeg = Math.floor((x - xMin) / segLen),
          year = Math.floor(nSeg / 12) + minYear,
          month = nSeg % 12 + 1;
    return `${year}/${month}`;
  }
  function getTime(x) {
    const segLen = (xMax - xMin - 8) / 1440,
          nSeg = Math.floor((x - xMin) / segLen),
          hour = Math.floor(nSeg / 60),
          minute = nSeg % 60;
    return `${hour < 10 ? 0 : ''}${hour}:${minute < 10 ? 0 : ''}${minute}`;
  }
  function startDrag(e) {
    slideBlock = d3.select(this);
    slideBlock.attr('fill', d3.color('#597ef7').darker(1).toString());
  }
  function endDrag(e) {
    slideBlock.attr('fill', '#597ef7');
  }
  const dragDate = d3.drag()
  .on('start', startDrag)
  .on('drag', (e) => {
    slideBlock.attr('x', getX(e.x));
    d3.select('#date-text').text(getDate(getX(e.x)));
  })
  .on('end', endDrag);
  const dragTime = d3.drag()
  .on('start', startDrag)
  .on('drag', (e) => {
    slideBlock.attr('x', getX(e.x));
    d3.select('#time-text').text(getTime(getX(e.x)));
  })
  .on('end', endDrag);
  bottomContainer.append('line')
    .attr('x1', xMin)
    .attr('x2', xMax)
    .attr('y1',yDate)
    .attr('y2',yDate)
    .style('stroke', '#061178')
    .style('stroke-width', '1.5px');
  bottomContainer.append('rect')
    .attr('x', xMin)
    .attr('y',yDate - 10)
    .attr('width', 8)
    .attr('height', 20)
    .attr('fill', '#597ef7')
    .call(dragDate);
  bottomContainer.append('text')
    .attr('id', 'date-text')
    .attr('x', xMax + 32)
    .attr('y', yDate + 5)
    .attr('font-size', '12px')
    .style('user-select', 'none')
    .text(getDate(xMin));
  bottomContainer.append('line')
    .attr('x1', xMin)
    .attr('x2', xMax)
    .attr('y1', yTime)
    .attr('y2', yTime)
    .style('stroke', '#061178')
    .style('stroke-width', '1.5px');
  bottomContainer.append('rect')
    .attr('x', xMin)
    .attr('y', yTime - 10)
    .attr('width', 8)
    .attr('height', 20)
    .attr('fill', '#597ef7')
    .call(dragTime);
  bottomContainer.append('text')
    .attr('id', 'time-text')
    .attr('x', xMax + 32)
    .attr('y', yTime + 5)
    .attr('font-size', '12px')
    .style('user-select', 'none')
    .text(getTime(xMin));
}

async function initMain() {
  geoFeature = await fetch(beijingMap)
    .then(response => response.json());
  geoprojection = d3.geoMercator()
                    .fitExtent([[- mainWidth, mainHeight * (-3.5)], 
                                [mainWidth * 2.3, mainHeight * 3.5]], 
                                geoFeature);
  geopath = d3.geoPath(geoprojection);
  const mainSvg = d3.select('#main').append('svg');
  mainSvg
    .style('width', '100%')
    .style('height', '100%')
    .attr('id', 'main-svg')
    .append('g')
    .append('path')
    .datum(geoFeature)
    .attr('d', geopath)
    .attr('transform', `translate(0, ${-mainHeight * 0.9})`)
    .attr('fill', 'transparent')
    .attr('stroke', '#666666')
    .attr('stroke-width', 0.2)
    .attr('id', 'border-path');
  drawSubway();
  const zoom = d3.zoom().on('zoom', e => {
    const g = d3.select('#main-svg').select('g');
    g.attr('transform', e.transform);
    g.selectAll('.border-path')
     .attr('stroke-width', 0.2 / Math.sqrt(e.transform.k));
  }).duration(100);
  mainSvg.call(zoom);
}

async function drawSubway() {
  const subwayLines = await getSubway();
  let stations = subwayLines.map(v => v.st.map(vv => {
    let point = utils.getPointJson();
    point.properties.name = vv.name;
    point.geometry.coordinates = [vv.x, vv.y];
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
  const g = d3.select('#main-svg')
    .select('g');
  g.selectAll('.path-link')
    .data(links)
    .enter().append('path')
      .attr('class', 'path-link')
      .attr('d', geopath)
      .attr('transform', `translate(0, ${-mainHeight * 0.9})`)
      .attr('fill', 'transparent')
      .attr('stroke', d => d.properties.color)
      .attr('stroke-width', 1.5);
  g.selectAll('.path-point')
    .data(stations)
    .enter().append('path')
      .attr('class', 'path-point')
      .attr('d', geopath.pointRadius(1.3))
      .attr('transform', `translate(0, ${-mainHeight * 0.9})`)
      .attr('fill', '#ffffff')
      .attr('stroke', '#333333')
      .attr('stroke-width', 0.2)
      .attr('id', d => d.properties.name)
      .on('mouseover', (e, d) => {
        d3.select(`#${d.properties.name}`)
            .transition()
            .duration(200)
            .attr('d', geopath.pointRadius(2));
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
            .duration(200)
            .attr('d', geopath.pointRadius(1.3));
        d3.select('#main-tooltip')
          .style('visibility', 'hidden');
      });
}

async function main() {
  initBottom();
  initSide();
  initMain();
}

main();