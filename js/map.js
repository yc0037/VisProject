import { getStationCode, getSubway,getStationOpen ,getKeyInfo} from "./data.js";
import * as utils from './utils.js';
import {windowHeight, windowWidth} from "./utils.js";
import {get_point_min_max} from "./utils.js";

const { mainHeight, mainWidth,sideWidth } = utils;

let geoFeature;
let geopath;
let geoprojection;
let geoScale;

// const beijingMap = 'https://geo.datav.aliyun.com/areas_v2/bound/110000_full.json';
const beijingMap = './data/110000_full.json';

let currentScale = 1;
let currentTranslate = d3.zoomIdentity;
let currentStation;
let mainSvg;
let g;
let pointG;
let map;
let offset;
let stations;
let links;
let stationMap;
let numStations;
let disStations;
let label;
let pathStations;
let loadingMask;
let timeData;
let openData;//地铁开通时间
let detailMode = false;
let adjStation;
let legends;
let date=2020.83;//当前年月
let time;     //当前时间
let isHeatmap;//判断是否现在显示有热力图
const maskTime = 200;
let subwayLines;
let allLinks; //保存初始的所有线路
let keyTime=[1980,2000,2010,2020];//关键帧时间
let keyInfo={};

//更改年月或日期调用函数
export const updateMap = _.debounce(_updateMap,50)

async function _updateMap(_date,_time){
  //更新时去掉已画热力图
  if(isHeatmap===true)
  {
    normalMode();
    isHeatmap=false;
  }
  //normalMode();
  pointG.selectAll('circle').remove();
  date=_date;
  time=_time;
  //根据当前年月和时间维护numStations,links,stations,stationMap
  [stations,numStations,stationMap,links] = await lineStationPrepare(subwayLines,date,time);
  for(let i=0;i<keyTime.length;i++){
    [keyInfo[keyTime[i]].keyStations,
      keyInfo[keyTime[i]].keyNumStations,
      keyInfo[keyTime[i]].keyStationMap,
      keyInfo[keyTime[i]].keyLinks] = await lineStationPrepare(subwayLines,keyTime[i],_time);
  }
  await drawSubway(date,time);
}

export async function initMain(_date,_time) {
  date=_date;
  time=_time;
  createLoadingMask();
  //读取地铁站基本信息
  subwayLines = await getSubway();
  //读取地铁站开通时间
  openData = await getStationOpen();
  //站点每天开始结束时间
  timeData = await fetch('./data/subwaytime.json')
      .then(response => response.json());
  //根据当前年月和时间生成numStations,links,stations,stationMap
  [ stations, numStations, stationMap, links] = await lineStationPrepare(subwayLines,date,time);
  //生成关键帧的数据结构
  for(let i=0;i<keyTime.length;i++){
    keyInfo[keyTime[i]]=await getKeyInfo(keyTime[i]);
    await lineStationPrepare(subwayLines,keyTime[i],12.06);
    [keyInfo[keyTime[i]].keyStations,
      keyInfo[keyTime[i]].keyNumStations,
      keyInfo[keyTime[i]].keyStationMap,
      keyInfo[keyTime[i]].keyLinks] = await lineStationPrepare(subwayLines,keyTime[i],12.06);
  }
  //console.log('key',keyInfo);
  console.log('timeata',timeData);
  console.log('date',date);

  geoFeature = await fetch(beijingMap)
      .then(response => response.json());
  geoprojection = d3.geoTransverseMercator().angle(231)
    .fitExtent([[-mainWidth, -mainHeight * 3.5],
                [mainWidth * 2.3, mainHeight * 3.5]],
                geoFeature);
  geoScale = geoprojection.scale();
  offset = geoScale / 200;
  geopath = d3.geoPath(geoprojection);

  mainSvg = d3.select('#main').append('svg');
  map = mainSvg
    .style('width', '100%')
    .style('height', '100%')
    .attr('id', 'main-svg')
    .append('g')
    .append('path')
    .datum(geoFeature)
      .attr('d', geopath)
      .attr('transform', `translate(0, -${offset})`)
      .attr('fill', 'transparent')
      .attr('stroke', '#666666')
      .attr('stroke-width', 0.2)
      .attr('id', 'border-path')
      .on("click", (e, d) => {
        if (detailMode) {
          normalMode();
          isHeatmap=false;
        }
        else {
          showLoadingMask();
          setTimeout(() => {
            let [lat, lon] = ClientToCoordinate(e.clientX, e.clientY);
            generateHeatMap('notStation', [lat, lon]);
            for(let i=0;i<keyTime.length;i++)
              generateKeyHeatMap(keyTime[i],'notStation',[lat, lon]);
            keyHeatMap();
            setTimeout(() => {
              hideLoadingMask();
              setTimeout(() => showHeatPoint(), maskTime + 4);
            }, maskTime);
          }, maskTime);
        }
      });

  g = d3.select('#main-svg')
      .select('g');
  pointG = d3.select('#side').select('svg')
      .append('g');
  //生成线路的底色
  await g.selectAll('.all-link')
      .data(allLinks)
      .enter().append('path')
      .attr('class', 'all-link')
      .attr('d', geopath)
      .attr('transform', `translate(0, -${offset})`)
      .attr('fill', 'transparent')
      .attr('opacity','0.3')
      .attr('stroke', d => d3.rgb(d.properties.color).brighter(0).toString())
      .attr('stroke-width', 1)
      .attr("pointer-events", 'none');

  await drawSubway(date,time);

  const zoom = d3.zoom().on('zoom', e => {
    currentScale = e.transform.k;
    currentTranslate = e.transform;
    g.transition().ease(d3.easeExpOut).duration(1000).attr('transform', e.transform);
    g.selectAll('.border-path')
      .attr('stroke-width', 0.2 / Math.sqrt(e.transform.k));
    if (!detailMode) {
      g.selectAll('.fake-point')
        .attr('d', geopath.pointRadius(Math.max(1.3, 4 / Math.sqrt(currentScale)) * geoScale / 40000));
    }
    else {
      g.selectAll('.fake-point')
        .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
    }
  });

  mainSvg.call(zoom);

  drawLegend();
}

function createLoadingMask() {
  loadingMask = d3.select('#main')
                  .append('div')
                    .attr('id', 'loading-mask');
  loadingMask.append('img')
                .classed('loading', true)
                .attr('src', './assets/loading.svg');
  loadingMask.append('div')
                .text('加载中...')
                .style('user-select', 'none');
}

export function hideLoadingMask() {
  console.log('hide');
  loadingMask.transition().duration(maskTime)
    .style('opacity', 0);
  setTimeout(() => {
    loadingMask.style('display', 'none');
  }, maskTime + 40);
}

export function showLoadingMask() {
  console.log('show');
  loadingMask.style('display', 'flex');
  loadingMask.transition().duration(maskTime)
    .style('opacity', 1);
}

const appearTimeInterpolate = d3.interpolate(10, 350);

export function showHeatPoint() {
  g.selectAll('.heat-point').each((d, i, nodes) => {
    setTimeout(() => {
      d3.select(nodes[i])
        .style('visibility', 'visible');
      d3.select(nodes[i]).transition().ease(d3.easePolyOut).duration(120)
        .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
    }, appearTimeInterpolate(d.colorIndex));
  });
  setTimeout(() => {
    g.selectAll('.heat-line').transition().duration(500).style('opacity', 1);
  }, 355);
}

async function lineStationPrepare(subwayLines,date,time){
  // 命名前加下划线表示局部变量
  let _stations = subwayLines.map(function(line){
    let tempStations=new Array();
    for(let i=0;i<line.st.length;i++){
      let station = line.st[i];
      let open = openData[station.name][line.name];
      let start=24;
      let end =0;
      for(let line in timeData[station.name]){
        for(let sta in timeData[station.name][line]) {
          let current = timeData[station.name][line][sta][0].split(':');
      //    console.log('curent', current);//.split(':');
          current = parseInt(current[0]) + current[1] / 60;
          start = Math.min(current, start);
          current = timeData[station.name][line][sta][1].split(':');
          current = parseInt(current[0]) + current[1] / 60;
          if(current<1)//半夜
            current+=24;
          end = Math.max(current, end);
        }
      }

      //console.log(start,time,end);
      if(open<date){   //在当前选择日期已经开通
        if((line.isLoop && time>5 && time<23.8)||(!line.isLoop && time>start && time<end)) {
          //if(open<date){   //在当前时间已经开通
          let point = utils.getPointJson();
          point.properties.name = station.name;
          point.properties.time=[start,end];
          point.properties.line.push(line.name); //站点所属线路信息
          point.properties.open = openData[station.name];//加上车站开通时间
          point.geometry.coordinates = [+station.x, +station.y];
          tempStations.push(point);
        }
      }
      else if(time<start || time>end){
        console.log(station.name,"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!1")
      }
    }
    return tempStations;
  });
  _stations = _.flattenDeep(_stations);
  let _numStations = _stations.length;
  console.log('station',_stations);
  //换乘站点地铁线路合并
  for (let i = 0; i < _numStations; i++){
    for (let j = i+1; j < _numStations; j++){
      if (_.isEqual(_stations[i].geometry.coordinates,_stations[j].geometry.coordinates)&& i!=j){
        let merge = _stations[i].properties.line.concat(_stations[j].properties.line);
        merge =_.uniqWith(merge,_.isEqual);
        _stations[i].properties.line = merge;
        _stations[j].properties.line = merge;
      }
    }
  }
  // 去除重复地铁站
  _stations = _.uniqWith(_stations, _.isEqual);

  let _stationMap = new Map();
  _numStations = _stations.length;
  //console.log(_numStations);
  for(let i=0;i<_numStations;i++){
    _stations[i].id = i;
    _stationMap.set(_stations[i].properties.name, i);
  }
  let _links = [];
  for(let i=0;i<subwayLines.length;i++){
    let _line = subwayLines[i];
    let line = utils.getLineJson();
    line.geometry.coordinates = [];
    line.stations = [];
    for(let j=0;j<_line.st.length;j++){
      let station = _line.st[j];
      let _station = _stations[_stationMap.get(station.name)];
      if(typeof (_station)==='undefined')
        continue;
      console.log(_station,station.name,"dfgsfdgsfdgsdfgsdfgsdfgsdg");
      if(openData[station.name][_line.name]<date){
        if((!_line.isLoop && time>_station.properties.time[0] && time<_station.properties.time[1])||
            (_line.isLoop && time>5 && time<23.8)) {
          line.geometry.coordinates.push([station.x, station.y]);
          line.stations.push(_stationMap.get(station.name));
          }
      }
    }
    if(line.geometry.coordinates.length===0)//去除还未开通地铁线路
      continue;
    line.properties.name = _line.name;
    line.properties.color = utils.colors[_line.name];
    if (_line.isLoop) {
      line.firstStation = _line.st[0].name;
      line.lastStation = _line.st[0].name;
    }
    else {
      line.firstStation=_line.st[0].name;
      line.lastStation=_line.st[_line.st.length-1].name;
    }
    if(_line.name==='地铁八通线')
      line.lastStation='土桥';
    if (_line.name==='地铁亦庄线')
      line.lastStation='次渠';
    //环线处理
    line.isLoop = _line.isLoop;
     // if ((_line.name==='地铁2号线'&&date>=1988) ||(_line.name==='地铁10号线'&&date>2013.3)) {
     if ((_line.name==='地铁2号线') ||(_line.name==='地铁10号线')) {
      line.geometry.coordinates.push([_line.st[0].x, _line.st[0].y]);
      line.stations.push(_stationMap.get(_line.st[0].name));
      //line.isLoop=true;
    }
    _links.push(line);
  }
  console.log('link',_links);

  //最全线路记录
  if(date>=2020.8)
    allLinks=_links;

  //传参
  return[_stations,_numStations,_stationMap,_links];
}

async function drawSubway(date,time) {

  [disStations,label,pathStations,adjStation] = await calcDistForStations(links,stations,stationMap,numStations);
  for(let history in keyInfo){
    [
      keyInfo[history].keyDisStations,
      keyInfo[history].keyLabel,
      keyInfo[history].keyPathStations,
      keyInfo[history].keyAdjStations
    ] = await calcDistForStations(keyInfo[history].keyLinks,
                                  keyInfo[history].keyStations,
                                  keyInfo[history].keyStationMap,
                                  keyInfo[history].keyNumStations);
  }
  //原先画的线路图，路径点，站点先都删除
  await g.selectAll('.path-link').remove();
  await g.selectAll('.path-point').remove();
  await g.selectAll('.fake-point').remove();

  await g.selectAll('.path-link')
    .data(links)
    .enter().append('path')
      .attr('class', 'path-link')
      .attr('id', d => `subway-line-${d.properties.name}`)
      .attr('d', geopath)
      .attr('transform', `translate(0, -${offset})`)
      .attr('fill', 'transparent')
      .attr('stroke', d => d.properties.color)
      .attr('stroke-width', 1.5)
      .attr("pointer-events", 'none');
  await g.selectAll('.path-point')
    .data(stations)
    .enter().append('path')
      .attr('class', 'path-point')
      .attr('d', geopath.pointRadius(1.3 * geoScale / 40000))
      .attr('transform', `translate(0, -${offset})`)
      .attr('fill', '#ffffff')
      .attr('stroke', '#333333')
      .attr('stroke-width', 0.2)
      .attr('id', d => d.properties.name)
      .attr("pointer-events", 'none');
  await g.selectAll('.fake-point')
    .data(stations)
    .enter().append('path')
      .attr('class', 'fake-point')
      .attr('d', geopath.pointRadius(4 * geoScale / 40000))
      .attr('transform', `translate(0, -${offset})`)
      .attr('fill', 'transparent')
      .attr('id', d => d.properties.name + '-fake')
      .on('mouseover', (e, d) => {
        d3.select(`#${d.properties.name}`)
          .transition()
          .duration(100)
          .attr('d', geopath.pointRadius(2 * geoScale / 40000));
        d3.select(`#${d.properties.name}-fake`)
          .attr('d', geopath.pointRadius(Math.max(2, 4 / Math.sqrt(currentScale)) * geoScale / 40000));
        let content =
            `<span class="tooltip-title">${d.properties.name}</span><br />
            <span class="tooltip-line">${d.properties.line}</span><br />`;
            // id: ${d.id}`;
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
          .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
        if (!detailMode) {
          d3.select(`#${d.properties.name}-fake`)
            .attr('d', geopath.pointRadius(Math.max(1.3, 4 / Math.sqrt(currentScale)) * geoScale / 40000));
        }
        else {
          d3.select(`#${d.properties.name}-fake`)
            .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
        }
        d3.select('#main-tooltip')
          .style('visibility', 'hidden');
      })
      .on('click', function(e, d) {
        showLoadingMask();
        setTimeout(() => {
          //console.log('当前站点',stations);
          generateHeatMap(d, d.geometry.coordinates);
          for(let i=0;i<keyTime.length;i++){
            generateKeyHeatMap(keyTime[i],d,d.geometry.coordinates);
          }
          keyHeatMap();
          setTimeout(() => {
            hideLoadingMask();
            setTimeout(() => showHeatPoint(), maskTime + 4);
          }, maskTime);
        }, maskTime);
      });
    hideLoadingMask();
    console.log('和平门到宣武门: ', directDistance(116.384209, 39.900098, 116.374314, 39.899765, 'Euclidean')); // 837m
    console.log('西单到宣武门: ', directDistance(116.374072, 39.907383, 116.374314, 39.899765, 'Euclidean')); // 828m
}

function drawLegend() {
  legends = d3.select('#main')
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
        .attr('stroke', d3.color(colors[key]).darker().toString())
        .attr('stroke-width', 2);
    });
    legend.on('mouseout', e => {
      d3.select(`#legend-${key}`)
        .style('background-color', '#eeeeeedd');
      d3.select(`#subway-line-${key}`)
        .attr('stroke', colors[key])
        .attr('stroke-width', 1.5);
      //console.log('wrong!');
    });
    legend.on('click')
  }
}


async function calcDistForStations(links,stations,stationMap,numStations) {
  let dis = new Array();
  let label = new Array(); // 记录地铁线路信息，用于计算换乘时间，label[i][j]表示i到j的最短路上的第一条地铁线路
  let pathStations = new Array(); // 记录路径信息，path[i][j]表示i到j的最短路上的第二个点
  for (let i = 0; i < numStations; i++) {
    dis[i] = new Array();
    dis[i][i] = 0;
    label[i] = new Array();
    pathStations[i] = new Array();
  }
  for (let i = 0, it = links.length; i < it; i++) {
    let link = links[i];
    let jt = link.stations.length;
    const lineName = link.properties.name;
    if (lineName === '地铁八通线' || lineName === '地铁亦庄线' ) {
      jt = jt - 1;
    } else if (lineName === '首都机场线') {
      continue;
    }
    //console.log('wrong',link);
    //console.log('wrong',link.stations[0]);
    //console.log('wrong',stations[link.stations[0]]);
    // let firstStation = stations[link.stations[0]].properties.name;
    // let lastStation = stations[link.stations[jt - 1]].properties.name;
    let firstStation = link.firstStation;
    let lastStation = link.lastStation;
    for (let j = 0; j < jt - 1; j++) {
      let s = link.stations[j], t = link.stations[(j + 1) % jt];
      const sName = stations[s].properties.name, tName = stations[t].properties.name;
      let sFirst, tFirst;
      //console.log(sName,tName,lineName,firstStation,lastStation);
      if (link.isLoop) {
        //console.log(sName,tName,lineName,firstStation,lastStation);
        let tNextName = stations[link.stations[(j + 2) % jt]].properties.name;
        console.log(tNextName);
        if (j === jt - 2)
        tNextName = stations[link.stations[1]].properties.name;
        sFirst = timeData[sName][lineName][tName][0];
        tFirst = timeData[tName][lineName][tNextName][0];
      } else {
        if (j === jt - 2) {
          sFirst = timeData[tName][lineName][firstStation][0];
          tFirst = timeData[sName][lineName][firstStation][0];
        } else {
          //console.log(timeData[sName],'wrong')
          sFirst = timeData[sName][lineName][lastStation][0];
          tFirst = timeData[tName][lineName][lastStation][0];
        }
      }
      if (tFirst === '00:00') {
        dis[s][t] = dis[t][s] = 1 / 12;
      } else {
        sFirst = `2020-12-22 ${sFirst}`;
        tFirst = `2020-12-22 ${tFirst}`;
        dis[s][t] = dis[t][s] = dayjs(tFirst, 'YYYY-MM-DD HH:mm').diff(dayjs(sFirst, 'YYYY-MM-DD HH:mm'), 'hour', true);
        if (dis[s][t] <= 0.0) {
          dis[s][t] = dis[t][s] = 1 / 12;
        }
      }
      let x = link.geometry.coordinates[j], y = link.geometry.coordinates[j + 1];
      dis[s][t] = dis[t][s] = directDistance(x[0], x[1], y[0], y[1], 'Euclidean') / 35 + 0.004;
      label[s][t] = label[t][s] = i;
      pathStations[s][t] = t;
      pathStations[t][s] = s;
    }
  }

    // 处理首都机场线
    const t2 = stationMap.get('T2航站楼'),
        t3 = stationMap.get('T3航站楼'),
        dzm = stationMap.get('东直门'),
        syq = stationMap.get('三元桥');
    console.log('t2',t2);
    if(typeof(t2)!='undefined'&&typeof(t3)!='undefined'&&typeof(dzm)!='undefined'&&typeof(syq)!='undefined') {
      dis[dzm][syq] = dis[syq][dzm] = 1 / 15;
      label[dzm][syq] = label[syq][dzm] = 20;
      pathStations[dzm][syq] = syq;
      pathStations[syq][dzm] = dzm;
      dis[syq][t3] = 0.3;
      label[syq][t3] = 20;
      pathStations[syq][t3] = t3;
      dis[t3][t2] = 7 / 30;
      label[t3][t2] = 20;
      pathStations[t3][t2] = t2;
      dis[t2][syq] = 19 / 60;
      label[t2][syq] = 20;
      pathStations[t2][syq] = syq;
    }
    // 几个漏掉的车站

    const yzhcz = stationMap.get('亦庄火车站');
    const cq = stationMap.get('次渠');
    if(typeof (yzhcz)!='undefined'&&typeof(cq)!='undefined'){
      dis[yzhcz][cq] = dis[cq][yzhcz] = 1 / 12;
      label[yzhcz][cq] = label[cq][yzhcz] = 23;
      pathStations[yzhcz][cq] = cq;
      pathStations[cq][yzhcz] = yzhcz;
    }
    const hz = stationMap.get('花庄');
    const tq = stationMap.get('土桥');
    if(typeof (hz)!='undefined'&&typeof (tq)!='undefined') {
      dis[hz][tq] = dis[tq][hz] = 0.1;
      label[hz][tq] = label[tq][hz] = 16;
      pathStations[hz][tq] = tq;
      pathStations[tq][hz] = hz;
    }

  for (let k = 0; k < numStations; k++)
    for (let i = 0; i < numStations; i++)
      if (i != k)
        for (let j = i + 1; j < numStations; j++)
          if (j != k) {
            let transfer = 0;
            if (label[k][i] != label[k][j])
              transfer = 0.05;
            if (dis[i][k] && dis[k][j] && (!dis[i][j] || dis[i][k] + dis[k][j] + transfer < dis[i][j])) {
              dis[i][j] = dis[j][i] = dis[i][k] + dis[k][j] + transfer;
              label[i][j] = label[i][k];
              label[j][i] = label[j][k];
              pathStations[i][j] = pathStations[i][k];
              pathStations[j][i] = pathStations[j][k];
            }
          }
  let adjStation = new Array();
  for (let i = 0; i < numStations; i++) {
    adjStation[i] = new Array();
    for (let j = 0; j < numStations; j++) {
      adjStation[i][j] = (pathStations[i][j] == j);
    }
  }
  return [dis,label,pathStations,adjStation];
}

function findPath(start, end) {
  let res = [];
  while (start != end) {
    let mid = pathStations[start][end];
    res.push([start, mid]);
    start = mid;
  }
  return res;
}

//@history 标记历史时间点
//@station 当前选中站点信息
function generateKeyHeatMap(history, station, center, delta = [0.003, 0.002335], maxDis = 0.6){
  console.log('test',keyInfo[history]);
  let [X, Y] = center;
  let [deltaX, deltaY] = delta;
  let stations = keyInfo[history].keyStations;
  let links = keyInfo[history].keyLinks;
  let stationMap = keyInfo[history].keyStationMap;
  let stationNum = keyInfo[history].keyNumStations;
  let disStations = keyInfo[history].keyDisStations;
  let adjStation = keyInfo[history].keyAdjStations;
  //判断当前选中车站在历史时刻是否开通
  let openFlag=0;
  if(station!='notStation'){
    for (let j in station.properties.open){
      console.log('current!!',station.properties.open[j],j);
      if(station.properties.open[j]<history)
        openFlag=1;
    }
    if (!openFlag)
      station='notStation';
    else
      station.id=stationMap.get(station.properties.name);
  }
  console.log('sign!!!!',stations);
  //station.id=stationMap.get(station.properties.name);
  let idList = new Array();
  let getOnDis = new Array();
  if (station === 'notStation') {
    // 找离起点最近的几个地铁站，记在idList里
    let nearFlag = new Array();
    for (let k = 0; k < stationNum; k++) {
      let [kx, ky] = stations[k].geometry.coordinates;
      for (let i = 0; i < stationNum; i++) {
        let [ix, iy] = stations[i].geometry.coordinates;
        for (let j = 0; j < stationNum; j++)
          if (adjStation[i][j]) {
            let [jx, jy] = stations[j].geometry.coordinates;
            let tmp1 = (ix - X) * (ky - Y) - (kx - X) * (iy - Y);
            let tmp2 = (jx - X) * (ky - Y) - (kx - X) * (jy - Y);
            let tmp3 = (kx - ix) * (jy - iy) - (jx - ix) * (ky - iy);
            let tmp4 = (X - ix) * (jy - iy) - (jx - ix) * (Y - iy);
            if (tmp1 * tmp2 < 0 && tmp3 * tmp4 < 0) {
              nearFlag[k] = -1;
              break;
            }
          }
        if (nearFlag[k] == -1) break;
      }
    }
    for (let i = 0; i < stationNum; i++)
      if (nearFlag[i] != -1) {
        idList.push(i);
        console.log(stations[i]);
        let [ix, iy] = stations[i].geometry.coordinates;
        getOnDis.push(directDistance(X, Y, ix, iy, 'Manhattan') / 5);
      }
  }
  else {
    console.log('210wrong',history,station,stations);
    idList.push(station.id);
    getOnDis.push(0);
  }

  let points = [];

  let flag = true;
  let t = 0, prevT = -1;

  while (flag) {
    flag = false;
    for (let i = 0, it = Math.sqrt(t); i <= it; i++)
      for (let j = Math.ceil(Math.sqrt(Math.max(prevT - i * i, 0))), jt = Math.sqrt(t - i * i); j <= jt; j++)
        for (let k = -1; k <= 1; k = k + 2)
          if (i != 0 || k != 1)
            for (let l = -1; l <= 1; l = l + 2)
              if (j != 0 || l != 1) {
                let dx = X + k * i * deltaX;
                let dy = Y + l * j * deltaY;
                let [dis, getOnStation, getOffStation] = actualMinDistance(idList, getOnDis, dx, dy,stations,stationNum,disStations);
                let walkDis = directDistance(X, Y, dx, dy, 'Manhattan') / 5;
                if (walkDis <= dis) {
                  dis = walkDis;
                  getOnStation = null;
                  getOffStation = null;
                }
                if (dis <= maxDis) {
                  let point = utils.getPointJson();
                  point.geometry.coordinates = [dx, dy];
                  point.colorIndex = dis / maxDis;
                  point.getOn = getOnStation;
                  point.getOff = getOffStation;
                  points.push(point);
                  flag = true;
                }
              }
    prevT = t;
    t = (t + 1) * 2;
  }
  keyInfo[history].keyPoints=points;
  console.log('pointsnum',history,points.length);
}

//将关键时间点的热力图画出
function keyHeatMap(){
  let a = d3.rgb(0, 0, 0);
  let b = d3.rgb(255, 255, 255);
  let c = d3.rgb(47, 84, 235);
  let allPoints=[];
  //分成四块区域
  let offset = {1980:[0,50],2000:[(windowWidth-mainWidth)/2,50],2010:[0,300],2020:[(windowWidth-mainWidth)/2,300]};
  let pointColorInterpolate = d3.interpolate(a, b);

  for(let keyTime in keyInfo) {
    console.log('pointsnum++',keyTime,keyInfo[keyTime].keyPoints.length);
    allPoints = allPoints.concat(allPoints,keyInfo[keyTime].keyPoints);
  }

  //console.log('gpmm', get_point_min_max(allPoints, 0));

    let x = d3.scaleLinear()
        .domain(get_point_min_max(allPoints, 0))
        .range([0, (windowWidth-mainWidth)/2]);

    let y = d3.scaleLinear()
        .domain(get_point_min_max(allPoints, 1))
        .range([0, 250]);

  for(let keyTime in keyInfo){
    let points = keyInfo[keyTime].keyPoints;
    let keyTimeSvg = pointG.append('g');
    keyTimeSvg.selectAll('circle')
        .data(points)
        .enter()
        .append('circle')
        .attr('class', keyTime+'circle')
        .attr('cx',(d,i)=>x(d.geometry.coordinates[0]))
        .attr('cy',(d,i)=>(250-y(d.geometry.coordinates[1])))
        .attr('r',15000/allPoints.length)
        .attr('transform', `translate(${offset[keyTime][0]}, ${offset[keyTime][1]})`)
        .attr('fill', d => pointColorInterpolate(d.colorIndex));
    keyTimeSvg.append('text')
        .text(keyTime)
        .attr('font-size','1rem')
        .attr('transform', `translate(${offset[keyTime][0]}, ${offset[keyTime][1]})`);
    //.style('visibility', 'hidden');

    // dots.selectAll('circle')
    //     .data(tailorData)
    //     .enter()
    //     .append('circle')
    //     .attr('class', 'point')
    //     .attr('fill', function(d){
    //       if(pattern.test(d['Research Interest']))
    //         return d3.color(schoolColor(d['Institution'])).darker(1).toString();
    //       return d3.color(schoolColor(d['Institution'])).toString();
    //     })
    //     .style("fill-opacity",'0.7')
    //     .attr('cx', (d, i) => x(parseInt(d[x_attr])))
    //     .attr('cy', (d, i) => y(parseInt(d[y_attr])))
    //     .attr('r',  (d, i) => radius(d[y_attr]))
  }
}
export function generateHeatMap(station, center, delta = [ 0.003,0.002335], maxDis = 0.6) {
  console.log('current!!',station);
  isHeatmap = true;
  detailMode = true;
  if (currentStation) {
    currentStation
      .attr('stroke', '#333333')
      .attr('stroke-width', 0.2);
    currentStation = null;
  }

  //判断当前选中车站在当前时刻是否开通
  if(station!='notStation'){
    let minDate=3000;
    for (let j in station.properties.open){
      console.log('current!!',station.properties.open[j],j);
      if(station.properties.open[j]<minDate)
        minDate=station.properties.open[j];
    }
    if (minDate>date)
      station='notStation';
    console.log(station,'now!')
    console.log('current!!',date,minDate);
  }


  d3.select('#start-point').remove();
  g.selectAll('.fake-point')
    .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
  if (station === 'notStation') {
    let startPoint = utils.getPointJson();
    startPoint.geometry.coordinates = center;
    g.append('path')
      .datum(startPoint)
      .attr('id', 'start-point')
      .attr('fill', '#ffffff')
      .attr('stroke', '#000000')
      .attr('transform', `translate(0, -${offset})`)
      .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
  }
  else {
    currentStation = d3.select(`#${station.properties.name}`);
    currentStation
      .attr('stroke', '#000000')
      .attr('stroke-width', 1);
  }
  legends.style("visibility", "hidden");

  let [X, Y] = center;
  let [deltaX, deltaY] = delta;

  let idList = [];
  let getOnDis = [];
  if (station === 'notStation') {
    // 找离起点最近的几个地铁站，记在idList里
    let nearFlag = new Array();
    for (let k = 0; k < numStations; k++) {
      let [kx, ky] = stations[k].geometry.coordinates;
      for (let i = 0; i < numStations; i++) {
        let [ix, iy] = stations[i].geometry.coordinates;
        for (let j = 0; j < numStations; j++)
          if (adjStation[i][j]) {
            let [jx, jy] = stations[j].geometry.coordinates;
            let tmp1 = (ix - X) * (ky - Y) - (kx - X) * (iy - Y);
            let tmp2 = (jx - X) * (ky - Y) - (kx - X) * (jy - Y);
            let tmp3 = (kx - ix) * (jy - iy) - (jx - ix) * (ky - iy);
            let tmp4 = (X - ix) * (jy - iy) - (jx - ix) * (Y - iy);
            if (tmp1 * tmp2 < 0 && tmp3 * tmp4 < 0) {
              nearFlag[k] = -1;
              break;
            }
          }
        if (nearFlag[k] == -1) break;
      }
    }
    for (let i = 0; i < numStations; i++)
      if (nearFlag[i] != -1) {
        idList.push(i);
        let [ix, iy] = stations[i].geometry.coordinates;
        getOnDis.push(directDistance(X, Y, ix, iy, 'Manhattan') / 5);
      }
  }
  else {
    idList.push(station.id);
    getOnDis.push(0);
  }

  let points = [];

  let flag = true;
  let t = 0, prevT = -1;

  while (flag) {
    flag = false;
    for (let i = 0, it = Math.sqrt(t); i <= it; i++)
      for (let j = Math.ceil(Math.sqrt(Math.max(prevT - i * i, 0))), jt = Math.sqrt(t - i * i); j <= jt; j++)
        for (let k = -1; k <= 1; k = k + 2)
          if (i != 0 || k != 1)
            for (let l = -1; l <= 1; l = l + 2)
              if (j != 0 || l != 1) {
                let dx = X + k * i * deltaX;
                let dy = Y + l * j * deltaY;
                let [dis, getOnStation, getOffStation] = actualMinDistance(idList, getOnDis, dx, dy,stations,numStations,disStations);
                let walkDis = directDistance(X, Y, dx, dy, 'Manhattan') / 5;
                if (walkDis <= dis) {
                  dis = walkDis;
                  getOnStation = null;
                  getOffStation = null;
                }
                if (dis <= maxDis) {
                  let point = utils.getPointJson();
                  point.geometry.coordinates = [dx, dy];
                  point.colorIndex = dis * dis / maxDis / maxDis;
                  point.getOn = getOnStation;
                  point.getOff = getOffStation;
                  points.push(point);
                  flag = true;
                }
              }
    prevT = t;
    t = (t + 1) * 2;
  }

  var a = d3.rgb(0, 0, 0);
  var b = d3.rgb(255, 255, 255);
  var c = d3.rgb(47, 84, 235);

  var pointColorInterpolate = d3.interpolate(a, b);
  var lineColorInterpolate = d3.interpolate(c, b);

  let currentDestination;
  let currentD;

  g.selectAll('.heat-point')
    .data(points)
    .join('path')
      .attr('class', 'heat-point')
      .attr('d', geopath.pointRadius(0))
      .attr('transform', `translate(0, -${offset})`)
      .attr('fill', d => pointColorInterpolate(d.colorIndex))
      .style('visibility', 'hidden')
    .on('mouseover', function(e, d) {
      if (currentDestination) {
        // undo previous animation
        currentDestination.attr('fill', pointColorInterpolate(currentD.colorIndex))
          .attr('stroke', 'none')
          .lower();
        map.lower();
        d3.select('#getOn-line').remove();
        d3.select('#getOff-line').remove();
        d3.select('#walk-line').remove();
      }
      currentDestination = d3.select(this);
      currentD = d;

      if (d.getOn) {
        // 需要乘坐地铁的情况
        let path = findPath(d.getOn.id, d.getOff.id);
        g.selectAll('.path-line')
          .data(path)
          .join('line')
            .attr('class', 'path-line')
            .attr('x1', d => geoprojection(stations[d[0]].geometry.coordinates)[0])
            .attr('y1', d => geoprojection(stations[d[0]].geometry.coordinates)[1])
            .attr('x2', d => geoprojection(stations[d[1]].geometry.coordinates)[0])
            .attr('y2', d => geoprojection(stations[d[1]].geometry.coordinates)[1])
            .attr('transform', `translate(0, -${offset})`)
            .attr('stroke', d => d3.color(utils.colors[links[label[d[0]][d[1]]].properties.name]).brighter().toString())
            .attr('stroke-width', 2.5)
            .attr('pointer-events', 'none')
            .raise();
        g.append('line')
          .datum(d)
            .attr('id', 'getOn-line')
            .attr('x1', geoprojection(center)[0])
            .attr('y1', geoprojection(center)[1])
            .attr('x2', geoprojection(d.getOn.geometry.coordinates)[0])
            .attr('y2', geoprojection(d.getOn.geometry.coordinates)[1])
            .attr('transform', `translate(0, -${offset})`)
            .attr('stroke', '#000000')
            .attr('stroke-width', 2.5)
            .attr('pointer-events', 'none')
            .raise();
        g.append('line')
          .datum(d)
            .attr('id', 'getOff-line')
            .attr('x1', geoprojection(d.getOff.geometry.coordinates)[0])
            .attr('y1', geoprojection(d.getOff.geometry.coordinates)[1])
            .attr('x2', geoprojection(d.geometry.coordinates)[0])
            .attr('y2', geoprojection(d.geometry.coordinates)[1])
            .attr('transform', `translate(0, -${offset})`)
            .attr('stroke', '#000000')
            .attr('stroke-width', 2.5)
            .attr('pointer-events', 'none')
            .raise();
        d3.select(this)
          .attr('fill', '#ffffff')
          .attr('stroke', '#000000')
          .raise();
        if (currentStation) currentStation.raise();
      }
      else {
        // 直接走到的情况
        g.append('line')
         .datum(d)
          .attr('id', 'walk-line')
          .attr('x1', geoprojection(center)[0])
          .attr('y1', geoprojection(center)[1])
          .attr('x2', geoprojection(d.geometry.coordinates)[0])
          .attr('y2', geoprojection(d.geometry.coordinates)[1])
          .attr('transform', `translate(0, -${offset})`)
          .attr('stroke', '#000000')
          .attr('stroke-width', 2.5)
          .attr('pointer-events', 'none')
          .raise();
        d3.select(this)
          .attr('fill', '#ffffff')
          .attr('stroke', '#000000')
          .raise();
      }
    })
    .on('click', function(e,d){
      normalMode();
      isHeatmap=false;
    });

  g.selectAll('.heat-line')
    .data(points)
    .join('line')
      .attr('class', 'heat-line')
      .attr('x1', d => d.getOff ? geoprojection(d.getOff.geometry.coordinates)[0] : geoprojection(center)[0])
      .attr('y1', d => d.getOff ? geoprojection(d.getOff.geometry.coordinates)[1] : geoprojection(center)[1])
      .attr('x2', d => geoprojection(d.geometry.coordinates)[0])
      .attr('y2', d => geoprojection(d.geometry.coordinates)[1])
      .attr('transform', `translate(0, -${offset})`)
      .attr('stroke', d => lineColorInterpolate(d.colorIndex))
      .attr('stroke-width', 0.5)
      .attr("pointer-events", 'none')
      .style('opacity', 0);

  arrangeOrder();
}

function normalMode() {
  detailMode = false;
  if (currentStation) {
    currentStation.attr('stroke', '#333333')
      .attr('stroke-width', 0.2);
    currentStation = null;
  }
  pointG.selectAll('circle').remove();
  d3.select('#start-point').remove();
  g.select('#getOn-line').remove();
  g.select('#getOff-line').remove();
  g.select('#walk-line').remove();
  g.selectAll('.heat-point').remove();
  g.selectAll('.path-line').remove();
  g.selectAll('.heat-line').remove();
  g.selectAll('.fake-point')
    .attr('d', geopath.pointRadius(Math.max(1.3, 4 / Math.sqrt(currentScale)) * geoScale / 40000));
  legends.style("visibility", "visible");
}

function arrangeOrder() {
  g.selectAll('.heat-point').raise();
  g.selectAll('.path-link').raise();
  g.selectAll('line').raise();
  g.select('#start-point').raise();
  g.selectAll('.path-point').raise();
  g.selectAll('.fake-point').raise();
}

function directDistance(lat1, lon1, lat2, lon2, type) {
  if (type == 'Euclidean') {
    return Math.sqrt((lat1 - lat2) * (lat1 - lat2) * 7150 + (lon1 - lon2) * (lon1 - lon2) * 11800);
  }
  if (type == 'Manhattan') {
    return Math.sqrt((lat1 - lat2) * (lat1 - lat2) * 7150) + Math.sqrt((lon1 - lon2) * (lon1 - lon2) * 11800);
  }
}

function actualMinDistance(idList, getOnDis, lat2, lon2,stations,numStations,disStations) {
  // 给定起始地点附近的地铁站idList、起始地点到附近地铁站的时间getOnDis、目标地点[lat2, lon2]，求最短时间
  let minDis = 100000;
  let getOnStation;
  let getOffStation;
  //console.log(disStations);
  for (let i = 0; i < numStations; i++) {
    let [lati, loni] = stations[i].geometry.coordinates;
    let getOffDis = directDistance(lati, loni, lat2, lon2, 'Manhattan') / 5;
    for (let j = 0, jt = idList.length; j < jt; j++) {
      // 先走到地铁站idList[j]，乘地铁到地铁站i，然后走到终点
      //console.log('wrong',idList)
      //console.log('wrong',idList[j],i)
      if(typeof (disStations[idList[j]])==='undefined')
        console.log('wrong',idList, numStations, disStations, stations);
      let tmp = getOnDis[j] + disStations[idList[j]][i] + getOffDis;
      if (tmp < minDis) {
        minDis = tmp;
        getOnStation = stations[idList[j]];
        getOffStation = stations[i];
      }
    }
  }
  return [minDis, getOnStation, getOffStation];
}

function ClientToCoordinate(ClientX, ClientY) {
  let titleMargin = 0.1 * document.body.clientHeight;
  return geoprojection.invert([(ClientX - currentTranslate.x) / currentScale, (ClientY - currentTranslate.y - titleMargin) / currentScale + offset]);
}
