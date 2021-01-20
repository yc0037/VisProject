import * as utils from './utils.js';
import { getDest } from "./data.js";
<<<<<<< HEAD
import {generateHeatMap, hideLoadingMask, showHeatPoint, showLoadingMask,currentScale,currentTranslate,_maxDis,normalMode,isHeatmap,globalCenter} from "./map.js";
=======
import {generateHeatMap, hideLoadingMask, showHeatPoint, showLoadingMask, normalMode, currentScale, keyTime, currentTranslate, generateKeyHeatMap, keyHeatMap, _maxDis} from "./map.js";
>>>>>>> af5c2832122402eab7d06ef739d723f40ea8130f
const { mainHeight, mainWidth,sideWidth } = utils;
const beijingMap = './data/110000_full.json';
const maskTime = 200;


d3.select('#side').select('svg').remove();

let sideSvg = d3.select('#side-up')
let titleMargin = 0.1 * document.body.clientHeight;
let dest = sideSvg.append('div').attr('id', 'dest-container');
<<<<<<< HEAD
let clickNum = 0;

=======
>>>>>>> af5c2832122402eab7d06ef739d723f40ea8130f

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
            .attr('x', iWidth * (i+1) )
            .attr('y', 20)
            .attr('font-size', 12)
            .text(dest_class[i])
            .attr('color', '#A0C53E');
        dest1.on('mouseover', e => {
            dest1.attr('font-size', 14);
            let main_g = d3.select('#main-svg').select('g');
            let subwayLines_2 = subwayLines[dest_class[i]];
            let this_g = main_g.append('div')
                .attr('id','select-point-1');
            // console.log(subwayLines_2.length);
            for(let j = 0; j < subwayLines_2.length;j++){
                let lat1 = subwayLines_2[j]['x'];
                let lon1 = subwayLines_2[j]['y'];
                let startPoint = utils.getPointJson();
                startPoint.geometry.coordinates = [lat1, lon1];
                this_g.append('path')
                    .datum(startPoint)
                    .attr('class', 'select-point-1')
                    .attr('f', '#ff0000')
                    .attr('pointRadius',100)
                    .attr("pointer-events", 'none')
                    .attr('transform', `translate(0, -${offset})`)
                    .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
                // let c = geoprojection([lat1,lon1]);
                // let content =
                //     `<span class="tooltip-title">${subwayLines_2[j]['name']}</span>`;
                // // id: ${d.id}`;
                // console.log(c);
                // d3.select('#main-tooltip').append('div')
                //     .html(content)
                //     .style('top', `${c[1]-offset}px`)
                //     .style('left', `${c[0]}px`)
                //     .style('visibility', 'visible');
            }
        });
        dest1.on('mouseout', e => {
            dest1.attr('font-size', 12);
            document.getElementById('select-point-1').remove();
            // d3.select('.tooltip-title').remove();
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
                // console.log(`#${dest_class[i]}`);
                document.getElementById(`${dest_class[i]}`).style.color = "#ff0000";
                // console.log(document.getElementById(`${dest_class[i]}`).style);
                // console.log(document.getElementById(`${dest_class[i]}`));
                d3.select(`${dest_class[i]}`)
                    .style('background-color', '#dddddddd');
                //先删掉之前的二级类目
                var thisNode=document.getElementById("second_class_dest");
                // console.log(thisNode);
                if(thisNode != null){
                    thisNode.remove();
                }
                // 显示二级类目
                let subwayLines_2 = subwayLines[dest_class[i]];
                // console.log(subwayLines_2);
                //得计算一下长度
                let total_length = 0;
                let total_char = 36;
                for(let j = 0; j < subwayLines_2.length; j++){
                    //console.log(subwayLines_2[j]['name'].length);
                    total_length += subwayLines_2[j]['name'].length;
                }
                let gap = (total_char - total_length) / (subwayLines_2.length + 1);
                // console.log(gap);

                let jWidth = destWidth / total_char;
                // console.log(jWidth);
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
                    // console.log(jWidth * (accumulate_width + 1));
                    let dest2 = g3.append('text')
                        .attr('class','second_class_dest')
                        .attr('id',subwayLines_2[j]['name'])
                        .attr('x', jWidth * (accumulate_width + gap * (j+1) - 1))
                        .attr('y', 50)
                        .attr('font-size', 12)
                        .text(subwayLines_2[j]['name']);
                    if(subwayLines_2.length >= 5 && j != 0){
                        accumulate_width -= 1;
                    }
                    accumulate_width += subwayLines_2[j]['name'].length + 1;
                    //图上标记点
                    let lat = subwayLines_2[j]['x'];
                    let lon = subwayLines_2[j]['y'];

                    dest2.on('click', e =>{
<<<<<<< HEAD

                        if(isHeatmap){
                            clickNum = 1 - clickNum;
                            //第一次点击的时候点出点，第二次点消
                            if(clickNum == 0){
                                dest2.attr('font-size', 12);
                                d3.select('.tooltip-title').remove();
                                d3.select('#main-tooltip').style('visibility','hidden');
                                d3.selectAll('#select-point').remove();
                            }else{
                                dest2.attr('font-size', 14);
                                let startPoint = utils.getPointJson();
                                startPoint.geometry.coordinates = [lat, lon];

                                let main_g = d3.select('#main-svg').select('g');
                                // console.log(main_g)
                                // console.log(main_g.append('circle'));
                                console.log(geopath.pointRadius(1.3 * geoScale / 40000));
                                main_g.append('circle')
                                    .attr('cx',lat)
                                    .attr('cy', lon)
                                    .attr('transform', `translate(0, -${offset})`)
                                    .attr('r', 5);


                                main_g.append('path')
                                    .datum(startPoint)
                                    .attr('id', 'select-point')
                                    .attr('f', '#ff0000')
                                    .attr('radius',100)
                                    .attr("pointer-events", 'none')
                                    .attr('transform', `translate(0, -${offset})`)
                                    .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
                                let c = geoprojection([lat,lon]);
                                console.log(c);
                                let content =
                                    `<span class="tooltip-title">${subwayLines_2[j]['name']}</span>`;
                                // id: ${d.id}`;
                                d3.select('#main-tooltip')
                                    .html(content)
                                    .style('top', `${(c[1]-offset)*currentScale+titleMargin + currentTranslate.y + 3}px`)
                                    .style('left', `${c[0] * currentScale + currentTranslate.x + 3}px`)
                                    .style('visibility', 'visible');
                            }
                        }else{
                            normalMode();
                            showLoadingMask();
=======
                        normalMode();
                        showLoadingMask();
                        setTimeout(() => {
                            generateHeatMap('notStation', [lat, lon], _maxDis);
                            for(let i=0;i<keyTime.length;i++)
                                generateKeyHeatMap(keyTime[i],'notStation', [lat, lon], _maxDis);
                            keyHeatMap();
>>>>>>> af5c2832122402eab7d06ef739d723f40ea8130f
                            setTimeout(() => {
                                generateHeatMap('notStation', [lat, lon], _maxDis);
                                setTimeout(() => {
                                    hideLoadingMask();
                                    setTimeout(() => showHeatPoint(), maskTime + 4);
                                }, maskTime);
                            }, maskTime);
                        }

                    });
                    dest2.on('mouseover', (e,d) => {

                        dest2.attr('font-size', 14);
                        let startPoint = utils.getPointJson();
                        startPoint.geometry.coordinates = [lat, lon];

                        let main_g = d3.select('#main-svg').select('g');
                        // console.log(main_g)
                        // console.log(main_g.append('circle'));
                        // console.log(geopath.pointRadius(1.3 * geoScale / 40000));
                        // main_g.append('circle')
                        //     .attr('cx',lat)
                        //     .attr('cy', lon)
                        //     .attr('transform', `translate(0, -${offset})`)
                        //     .attr('r', 5);


                        main_g.append('path')
                            .datum(startPoint)
                            .attr('id', 'select-point')
                            .attr('fill', '#ff0000')
                            .attr('radius',100)
                            .attr("pointer-events", 'none')
                            .attr('transform', `translate(0, -${offset})`)
<<<<<<< HEAD
                            .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
                        let c = geoprojection([lat,lon]);
                        console.log(c);
                        let content =
                            `<span class="tooltip-title">${subwayLines_2[j]['name']}</span>`;
                        // id: ${d.id}`;
                        d3.select('#main-tooltip')
                            .html(content)
                            .style('top', `${(c[1]-offset)*currentScale+titleMargin + currentTranslate.y + 3}px`)
                            .style('left', `${c[0] * currentScale + currentTranslate.x + 3}px`)
                            .style('visibility', 'visible');

=======
                            .attr('d', geopath.pointRadius(2.6 * geoScale / 40000));
                            let c = geoprojection([lat,lon]);
                            // console.log(c);
                            let content =
                                                `<span class="tooltip-title">${subwayLines_2[j]['name']}</span>`;
                                            // id: ${d.id}`;
                            d3.select('#main-tooltip')
                                                .html(content)
                                                .style('top', `${(c[1]-offset)*currentScale+titleMargin + currentTranslate.y + 3}px`)
                                                .style('left', `${c[0] * currentScale + currentTranslate.x + 3}px`)
                                                .style('visibility', 'visible');
>>>>>>> af5c2832122402eab7d06ef739d723f40ea8130f
                    });
                    dest2.on('mouseout', e => {
                        if(clickNum == 0 || !isHeatmap){
                            dest2.attr('font-size', 12);
                            d3.select('.tooltip-title').remove();
                            d3.select('#main-tooltip').style('visibility','hidden');
                            d3.selectAll('#select-point').remove();
                        }
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