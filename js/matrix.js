import * as utils from './utils.js';
import { getDest } from "./data.js";
import {generateHeatMap, hideLoadingMask, showHeatPoint, showLoadingMask} from "./map.js";
const maskTime = 200;

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
  const topOffset = (mainHeight - cellWidth * 50 + 100) / 2;
  const leftOffset = (sideWidth - cellWidth * 50) / 2;
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
  drawDest(cellWidth);
  // for (let i = 0; i < distMatrix.length; ++i) {
  //   for (let j = 0; j < distMatrix[i].length; ++j) {
  //     g.append('rect')
  //       .attr('x', leftOffset + j * cellWidth)
  //       .attr('y', topOffset + i * cellWidth)
  //       .attr('width', cellWidth)
  //       .attr('height', cellWidth)
  //       .attr('fill', colorScale(distMatrix[i][j]))
  //       .attr('stroke', '#ffffff')
  //       .attr('stroke-width', 0.5)
  //       .attr('id', `cell-${i}-${j}`)
  //       .on('mouseover', fover)
  //       .on('mouseout', fout);
  //   }
  // }
  // let linearGradient = sideSvg.append('defs')
  //                             .append('linearGradient')
  //                               .attr('id', 'linearColor')
  //                               .attr('x1', '0%')
  //                               .attr('x2', '100%')
  //                               .attr('y1', '0%')
  //                               .attr('y2', '0%');
  // linearGradient.append('stop')
  //               .attr('offset', '0%')
  //               .attr('stop-color', '#52c41a');
  // linearGradient.append('stop')
  //               .attr('offset', '50%')
  //               .attr('stop-color', '#ffffff');
  // linearGradient.append('stop')
  //               .attr('offset', '100%')
  //               .attr('stop-color', '#f5222d');
  // sideSvg.append('rect')
  //         .attr('width', sideWidth * 0.8)
  //         .attr('height', 20)
  //         .attr('x', sideWidth * 0.1)
  //         .attr('y', topOffset + distMatrix.length * cellWidth + 20)
  //         .attr('fill', `url(#${linearGradient.attr('id')})`);
  // sideSvg.append('text')
  //         .attr('x', sideWidth * 0.1 - 4)
  //         .attr('y', topOffset + distMatrix.length * cellWidth + 55)
  //         .attr('font-size', 12)
  //         .text('0');
  // sideSvg.append('text')
  //         .attr('x', sideWidth * 0.5 - 4)
  //         .attr('y', topOffset + distMatrix.length * cellWidth + 55)
  //         .attr('font-size', 12)
  //         .text('5');
  // sideSvg.append('text')
  //         .attr('x', sideWidth * 0.9 - 4)
  //         .attr('y', topOffset + distMatrix.length * cellWidth + 55)
  //         .attr('font-size', 12)
  //         .text('10')

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



export async function drawDest(cellWidth){
  const subwayLines = await getDest();
  const dest_class = Object.keys(subwayLines);
  const destHeight = (mainHeight - cellWidth * 50 + 100) / 2;
  const destWidth = sideWidth;
  let g2 = sideSvg.append('g').attr('id', 'destinations');
  let g3;
  let iWidth = destWidth / (dest_class.length + 1);
  // 写一级类别
  for(let i = 0; i < dest_class.length; i++){
    const dest1 = g2.append('text')
        .attr('id',dest_class[i])
        .attr('x', iWidth * (i + 1))
        .attr('y', 20)
        .attr('font-size', 12)
        .text(dest_class[i])
        .style('background-color', '#A0C53E');
    dest1.on('click', e => {
      d3.select(`#${dest_class[i]}`)
          .style('background-color', '#dddddddd');
      //先删掉之前的二级类目
      var thisNode=document.getElementById("second_class_dest");
      console.log(thisNode);
      if(thisNode != null){
        thisNode.remove();
      }
      // 显示二级类目
      let subwayLines_2 = subwayLines[dest_class[i]];
      console.log(subwayLines_2);
      //得计算一下长度
      let total_length = 0;
      let total_char = 36;
      for(let j = 0; j < subwayLines_2.length; j++){
          //console.log(subwayLines_2[j]['name'].length);
          total_length += subwayLines_2[j]['name'].length;
      }
      let gap = (total_char - total_length) / (subwayLines_2.length + 1);
      console.log(gap);

      let jWidth = destWidth / total_char;
      console.log(jWidth);
      g3 = g2.append('g').attr('id', 'second_class_dest');
      //测试代码
      // g3.append('text')
      //     .attr('class','second_class_dest')
      //     .attr('x', 0)
      //     .attr('y', 50)
      //     .attr('font-size', 12)
      //     .text("这是一段测试代码这是一段测试代码这是一段测试代码这是一段测试代码这是一段测试代码这是一段测试代码这是一段测试代码");


      let accumulate_width = 0;
      for(let j = 0; j < subwayLines_2.length; j++){
        console.log(jWidth * (accumulate_width + 1));
        let dest2 = g3.append('text')
            .attr('class','second_class_dest')
            .attr('id',subwayLines_2[j]['name'])
            .attr('x', jWidth * (accumulate_width + gap * (j+1) - 1))
            .attr('y', 50)
            .attr('font-size', 12)
            .text(subwayLines_2[j]['name']);
        accumulate_width += subwayLines_2[j]['name'].length + 1;
        //图上标记点
        dest2.on('click', e =>{
          showLoadingMask();
          setTimeout(() => {
            let lat = subwayLines_2[j]['x'];
            let lon = subwayLines_2[j]['y'];
            generateHeatMap('notStation', [lat, lon]);
            setTimeout(() => {
              hideLoadingMask();
              setTimeout(() => showHeatPoint(), maskTime + 4);
            }, maskTime);
          }, maskTime);
        });
      }
    });
  }


}