import * as utils from './utils.js';
import { updateSide } from './matrix.js';
import {getStationOpen} from "./data.js";
import {updateMap} from "./map.js";

const { windowHeight, windowWidth, outerMargin } = utils;

export async function initBottom() {

  let oldest = {'year':1971,'month':1};
  let newest = {'year':2020,'month':11};

  let [minYear, maxYear] = [oldest['year']+(oldest['month']-1)/12-1, newest['year']+(newest['month']-1)/12];
  let dateScale = d3.scaleLinear()
                    .domain([minYear, maxYear])
                    .range([outerMargin + windowWidth * 0.1, outerMargin + windowWidth * 0.9]);
  let dateAxis = d3.axisBottom(dateScale)
                    .ticks(10)
                    .tickFormat(d => d);
  let timeScale = d3.scaleLinear()
                    .domain([0, 24])
                    .range([outerMargin + windowWidth * 0.1, outerMargin + windowWidth * 0.9]);

  let timeAxis = d3.axisBottom(timeScale)
                    .ticks(12)
                    .tickFormat(d => d);

  let bottomSvg = d3.select('#bottom').append('svg')
                      .attr('id', 'bottom-container')
                      .attr('height', '100%')
                      .attr('width', '100%');
  let yearCordi =bottomSvg.append('g')
      .attr('transform', `translate(${0}, ${windowHeight*0.02})`)
      .call(dateAxis)
      .attr('font-size', '0.8rem');
  let timeCordi =bottomSvg.append('g')
      .attr('transform', `translate(${0}, ${windowHeight*0.068})`)
      .call(timeAxis)
      .attr('font-size', '0.8rem');
  // bottomSvg.append('g')
  //       .attr('transform', `translate(0, ${0.16 * windowHeight})`)
  //       .call(timeAxis)
  //         .style('user-select', 'none');
  // bottomSvg.append('g')
  //       .attr('transform', `translate(${outerMargin + windowWidth * 0.1}, 0)`)
  //       .call(valueAxis)
  //         .style('user-select', 'none');
  // // lines
  // const lines = [];
  // for (let i = 0; i < timeData.length - 1; ++i) {
  //   lines.push({
  //     source: timeData[i],
  //     target: timeData[i + 1]
  //   });
  // }
  // bottomSvg.append('g')
  //   .selectAll('line')
  //   .data(lines)
  //   .join('line')
  //     .attr('x1', d => timeScale(d.source.year))
  //     .attr('x2', d => timeScale(d.target.year))
  //     .attr('y1', d => valueScale(d.source.value))
  //     .attr('y2', d => valueScale(d.target.value))
  //     .attr('stroke', '#2f54eb')
  //     .attr('stroke-width', '0.5px');
  // // points
  // bottomSvg.append('g')
  //   .selectAll('circle')
  //   .data(timeData)
  //   .enter().append('circle')
  //   .attr('cx', d => timeScale(d.year))
  //   .attr('cy', d => valueScale(d.value))
  //   .attr('r', 3)
  //   .attr('id', d => `point-${d.year}`)
  //   .style('fill', '#597ef7')
  //   .style('stroke', '#2f54eb')
  //   .style('stroke-width', '0.5px')
  //   .on('mouseover', (e, d) => {
  //     const current = d3.select(`#point-${d.year}`);
  //     current
  //       .transition()
  //       .duration(200)
  //       .attr('r', 5);
  //     const tooltip = d3.select('#bottom-tooltip');
  //     tooltip
  //       .style('top', `${windowHeight * 0.7  + valueScale(d.value) - 25}px`)
  //       .style('left', `${timeScale(d.year) - 10}px`)
  //       .style('visibility', 'visible')
  //       .text(d.value);
  //   })
  //   .on('mouseout', (e, d) => {
  //     const current = d3.select(`#point-${d.year}`);
  //     current
  //       .transition()
  //       .duration(200)
  //       .attr('r', 3);
  //     const tooltip = d3.select('#bottom-tooltip');
  //     tooltip.style('visibility', 'hidden');
  //   });
  drawDrag(minYear, maxYear, dateScale(minYear));
}
//全局变量初值
let currentYear=2020;//现在年月
let currentMonth=11;
let currentTime=12.067;//现在时间
function drawDrag(minYear, maxYear, offset) {
  const bottomContainer = d3.select('#bottom-container');
  const xMin = offset;
  const xMax = outerMargin + windowWidth * 0.9;
  const yDate = windowHeight * 0.02;
  const yTime = windowHeight * 0.07;

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
    const numSeg = (maxYear- minYear) * 12+4,
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
    const text = d3.select('#date-text').text();
    currentYear=getDate(getX(e.x)).split('/')[0];
    currentMonth=getDate(getX(e.x)).split('/')[1];
    d3.select('#date-text').text(getDate(getX(e.x)));
    if (text !== d3.select('#date-text').text()){
      //updateSide('date', getDate(getX(e.x)));
      updateMap(parseInt(currentYear)+(currentMonth-1)/12,currentTime);
    }
  })
  .on('end', endDrag);
  const dragTime = d3.drag()
  .on('start', startDrag)
  .on('drag', (e) => {
    slideBlock.attr('x', getX(e.x));
    const text = d3.select('#time-text').text();
    currentTime=parseInt(getTime(getX(e.x)).split(':')[0])+getTime(getX(e.x)).split(':')[1]/60;
    d3.select('#time-text').text(getTime(getX(e.x)));
    if (text !== d3.select('#time-text').text()){
      updateMap(parseInt(currentYear)+(currentMonth-1)/12,currentTime);
      //updateSide('time', getTime(getX(e.x)));
    }
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
    .attr('x', xMax)
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
    .text(getDate(xMax));
  bottomContainer.append('line')
    .attr('x1', xMin)
    .attr('x2', xMax)
    .attr('y1', yTime)
    .attr('y2', yTime)
    .style('stroke', '#061178')
    .style('stroke-width', '1.5px');
  bottomContainer.append('rect')
    .attr('x', (xMax+xMin)/2)
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
    .text(getTime((xMax+xMin)/2));
}