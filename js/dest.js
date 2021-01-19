import * as utils from './utils.js';
import { getDest } from "./data.js";
import {generateHeatMap, hideLoadingMask, showHeatPoint, showLoadingMask} from "./map.js";
const { mainHeight, mainWidth,sideWidth } = utils;
const beijingMap = './data/110000_full.json';
const maskTime = 200;


d3.select('#side').select('svg').remove();

let sideSvg = d3.select('#side-up')
let main_g = d3.select('#main-svg');

let dest = sideSvg.append('div').attr('id', 'dest-container');



sideSvg =  dest.append('svg')
    .style('width', '100%')
    .style('height', '100%');

export function initDest() {
    const cellWidth = 8;
    // const topOffset = (mainHeight - cellWidth * distMatrix.length + 100) / 2;
    // const leftOffset = (sideWidth - cellWidth * distMatrix.length) / 2;
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
    let geoFeature = await fetch(beijingMap)
        .then(response => response.json());
    let geoprojection = d3.geoTransverseMercator().angle(231)
        .fitExtent([[-mainWidth, -mainHeight * 3.5],
                [mainWidth * 2.3, mainHeight * 3.5]],
            geoFeature);
    let geoScale = geoprojection.scale();
    let offset = geoScale / 200;
    let geopath = d3.geoPath(geoprojection);
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
            .attr('color', '#A0C53E');
        dest1.on('mouseover', e => {
            dest1.attr('font-size', 13);
        });
        dest1.on('mouseout', e => {
            dest1.attr('font-size', 12);
        });
        let flag = 0;
        dest1.on('click', e => {
            flag = 1-flag;
            if(flag){
                dest1.attr('font-size', 13).attr('textDecorationColor', "#ff0000");
                for(let j = 0; j < dest_class.length; j++){
                    if(j == i)
                        continue;
                    //document.getElementById(`${dest_class[j]}`).attr('font-size', 12)
                    document.getElementById(`${dest_class[j]}`).style.visibility = 'hidden';
                }
                console.log(`#${dest_class[i]}`);
                document.getElementById(`${dest_class[i]}`).style.color = "#ff0000";
                console.log(document.getElementById(`${dest_class[i]}`).style);
                console.log(document.getElementById(`${dest_class[i]}`));
                d3.select(`${dest_class[i]}`)
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
                    let lat = subwayLines_2[j]['x'];
                    let lon = subwayLines_2[j]['y'];
                    dest2.on('click', e =>{
                        showLoadingMask();
                        setTimeout(() => {
                            generateHeatMap('notStation', [lat, lon]);
                            setTimeout(() => {
                                hideLoadingMask();
                                setTimeout(() => showHeatPoint(), maskTime + 4);
                            }, maskTime);
                        }, maskTime);
                    });
                    dest2.on('mouseover', e => {
                        dest2.attr('font-size', 14);
                        let startPoint = utils.getPointJson();
                        startPoint.geometry.coordinates = [lat, lon];
                        main_g
                            .selectAll('circle')
                            .data(startPoint.geometry.coordinates)
                            .enter()
                            .append('circle')
                            .attr('cx', (d, i) => {
                                //console.log('data', d);
                                return parseInt(d[0]);
                            })
                            .attr('cy', (d, i) => parseInt(d[1]))
                            .attr('transform', `translate(0, -${offset})`)
                            .attr('r', (d,i) => geopath.pointRadius(1.3 * geoScale / 40000))


                        main_g.append('path')
                            .datum(startPoint)
                            .attr('id', 'select-point')
                            .attr('fill', '#ffffff')
                            .attr('stroke', '#333333')
                            .attr('stroke-width', 0.2)
                            .attr("pointer-events", 'none')
                            .attr('transform', `translate(0, -${offset})`)
                            .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
            //                 .on('mouseover', (e, d) => {
            //                     d3.select(`#${d.properties.name}`)
            //                         .transition()
            //                         .duration(100)
            //                         .attr('d', geopath.pointRadius(2 * geoScale / 40000));
            //                     d3.select(`#${d.properties.name}-fake`)
            //                         .attr('d', geopath.pointRadius(Math.max(2, 4 / Math.sqrt(currentScale)) * geoScale / 40000));
            //                     let content =
            //                         `<span class="tooltip-title">${d.properties.name}</span><br />
            // <span class="tooltip-line">${d.properties.line}</span><br />`;
            //                     // id: ${d.id}`;
            //                     d3.select('#main-tooltip')
            //                         .html(content)
            //                         .style('top', `${e.clientY + 3}px`)
            //                         .style('left', `${e.clientX + 3}px`)
            //                         .style('visibility', 'visible');
            //                 })
            //                 .on('mouseout', (e, d) => {
            //                     d3.select(`#${d.properties.name}`)
            //                         .transition()
            //                         .duration(100)
            //                         .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
            //                     if (!detailMode) {
            //                         d3.select(`#${d.properties.name}-fake`)
            //                             .attr('d', geopath.pointRadius(Math.max(1.3, 4 / Math.sqrt(currentScale)) * geoScale / 40000));
            //                     }
            //                     else {
            //                         d3.select(`#${d.properties.name}-fake`)
            //                             .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
            //                     }
            //                     d3.select('#main-tooltip')
            //                         .style('visibility', 'hidden');
            //                 })

                    });
                    dest2.on('mouseout', e => {
                        dest2.attr('font-size', 12);
                    });
                }
            }
            else{
                for(let j = 0; j < dest_class.length; j++){
                    if(j == i)
                        continue;
                    //document.getElementById(`${dest_class[j]}`).attr('font-size', 12)
                    document.getElementById(`${dest_class[j]}`).style.visibility = 'visible';
                }
                document.getElementById("second_class_dest").remove();
            }
        });
    }


}