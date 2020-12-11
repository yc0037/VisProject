import * as utils from './utils.js';

const { mainHeight, sideWidth } = utils;

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


export function initSide() {
  const cellWidth = 8;
  const topOffset = (mainHeight - cellWidth * distMatrix.length - 40) / 2;
  const leftOffset = (sideWidth - cellWidth * distMatrix.length) / 2;
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
    let content = `起点：${ii}<br/>终点：${jj}<br/>用时：${distMatrix[ii][jj]}`;
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
  for (let i = 0; i < distMatrix.length; ++i) {
    for (let j = 0; j < distMatrix[i].length; ++j) {
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
          .text('10')
}

function _updateSide() {
  for (let i = 0; i < 50; ++i) {
    for (let j = 0; j < 50; ++j) {
      distMatrix[i][j] = (Math.random() * 10).toFixed(2);
      g.select(`#cell-${i}-${j}`)
       .attr('fill', colorScale(distMatrix[i][j]));
    }
  }
}

export const updateSide = _.debounce(_updateSide, 50);