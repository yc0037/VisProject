import { getStationCode, getSubway } from "./data.js";
import * as utils from './utils.js';

const { mainHeight, mainWidth } = utils;

let geoFeature;
let geopath;
let geoprojection;
let geoScale;

// const beijingMap = 'https://geo.datav.aliyun.com/areas_v2/bound/110000_full.json';
const beijingMap = './data/110000_full.json';

let currentScale = 1;
let currentTranslate = d3.zoomIdentity;
let currentNode;
let mainSvg;
let g;
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
let detailMode = false;
const maskTime = 200;

export async function initMain() {
  geoFeature = await fetch(beijingMap)
    .then(response => response.json());
  timeData = await fetch('../data/subwaytime.json')
    .then(response => response.json());
  geoprojection = d3.geoTransverseMercator().angle(231)
    .fitExtent([[-mainWidth, -mainHeight * 3.5], 
                [mainWidth * 2.3, mainHeight * 3.5]], 
                geoFeature);
  geoScale = geoprojection.scale();
  offset = geoScale / 200;
  geopath = d3.geoPath(geoprojection);
  mainSvg = d3.select('#main').append('svg');
  createLoadingMask();
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
        normalMode();
        // generateHeatMap_Anywhere(ClientToCoordinate(e.clientX, e.clientY));
      });
  drawSubway();
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
                .attr('src', '../assets/loading.svg');
  loadingMask.append('div')
                .text('加载中...')
                .style('user-select', 'none');
}

function hideLoadingMask() {
  console.log('hide');
  loadingMask.transition().duration(maskTime)
    .style('opacity', 0);
  setTimeout(() => {
    loadingMask.style('display', 'none');
  }, maskTime + 40);
}

function showLoadingMask() {
  console.log('show');
  loadingMask.style('display', 'flex');
  loadingMask.transition().duration(maskTime)
    .style('opacity', 1);
}

const appearTimeInterpolate = d3.interpolate(10, 350);
function showHeatPoint() {
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
  stationMap = new Map();
  numStations = stations.length;
  for (let i = 0; i < numStations; i++){
    stations[i].id = i;
    stationMap.set(stations[i].properties.name, i);
  }
  links = subwayLines.map(v => {
    let line = utils.getLineJson();
    line.properties.name = v.name;
    line.properties.color = utils.colors[v.name];
    line.geometry.coordinates = v.st.map(vv => [vv.x, vv.y]);
    line.stations = v.st.map(vv => stationMap.get(vv.name));
    line.isLoop = v.isLoop;
    if (v.isLoop) {
      line.geometry.coordinates.push([v.st[0].x, v.st[0].y]);
      line.stations.push(stationMap.get(v.st[0].name));
    }
    return line;
  });
  disStations = calcDistForStations(links);
  
  g = d3.select('#main-svg')
    .select('g')
  g.selectAll('.path-link')
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
  g.selectAll('.path-point')
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
  g.selectAll('.fake-point')
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
        let content = `name: ${d.properties.name}, id: ${d.id}`;
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
          generateHeatMap_Station(d.id, d.geometry.coordinates);
          detailMode = true;
          if (currentNode) {
            currentNode
              .attr('stroke', '#333333')
              .attr('stroke-width', 0.2);
          }
          currentNode = d3.select(`#${d.properties.name}`);
          currentNode
            .attr('stroke', '#000000')
            .attr('stroke-width', 1);
          g.selectAll('.fake-point')
            .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
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
        .attr('stroke', d3.color(colors[key]).darker().toString())
        .attr('stroke-width', 2.5)
        .raise();
    });
    legend.on('mouseout', e => {
      d3.select(`#legend-${key}`)
        .style('background-color', '#eeeeeedd');
      d3.select(`#subway-line-${key}`)
        .attr('stroke', colors[key])
        .attr('stroke-width', 1.5)
        .lower();
    })
  }
}

function calcDistForStations(links) {
  let dis = new Array();
  label = new Array(); // 记录地铁线路信息，用于计算换乘时间，label[i][j]表示i到j的最短路上的第一条地铁线路
  pathStations = new Array(); // 记录路径信息，path[i][j]表示i到j的最短路上的第二个点
  for (let i = 0; i < numStations; i++) {
    dis[i] = new Array();
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
    let firstStation = stations[link.stations[0]].properties.name;
    let lastStation = stations[link.stations[jt - 1]].properties.name;
    for (let j = 0; j < jt - 1; j++) {
      let s = link.stations[j], t = link.stations[(j + 1) % jt];
      const sName = stations[s].properties.name, tName = stations[t].properties.name;
      let sFirst, tFirst;

      if (link.isLoop) {
        let tNextName = stations[link.stations[(j + 2) % jt]].properties.name;
        if (j === jt - 2)
        tNextName = stations[link.stations[1]].properties.name;
        // console.log(`${lineName}: ${sName}---${tName}/${tName}---${tNextName}`)
        sFirst = timeData[sName][lineName][tName][0];
        tFirst = timeData[tName][lineName][tNextName][0];
      } else {
        if (j === jt - 2) {
          // console.log(`${lineName}: ${tName}/${sName}---${firstStation}`)
          sFirst = timeData[tName][lineName][firstStation][0];
          tFirst = timeData[sName][lineName][firstStation][0];
        } else {
          // console.log(`${lineName}: ${sName}/${tName}---${lastStation}`)
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
      // console.log(dis[s][t]);
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
  // 几个漏掉的车站
  const yzhcz = stationMap.get('亦庄火车站');
  const cq = stationMap.get('次渠');
  dis[yzhcz][cq] = dis[cq][yzhcz] = 1 / 12;
  label[yzhcz][cq] = label[cq][yzhcz] = 23;
  pathStations[yzhcz][cq] = cq;
  pathStations[cq][yzhcz] = yzhcz;
  const hz = stationMap.get('花庄');
  const tq = stationMap.get('土桥');
  dis[hz][tq] = dis[tq][hz] = 0.1;
  label[hz][tq] = label[tq][hz] = 16;
  pathStations[hz][tq] = tq;
  pathStations[tq][hz] = hz;

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
  return dis;
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

function generateHeatMap_Station(id, center, delta = [0.003, 0.002335], maxDis = 0.6) {

  let [centerX, centerY] = center;
  let [deltaX, deltaY] = delta;
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
                let [dis, getOffStation] = actualDistance_StationToAnywhere(id, centerX + k * i * deltaX, centerY + l * j * deltaY);
                if (dis <= maxDis) {
                  let point = utils.getPointJson();
                  point.geometry.coordinates = [centerX + k * i * deltaX, centerY + l * j * deltaY];
                  point.colorIndex = dis / maxDis;
                  point.nearest = getOffStation;
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
        currentDestination.attr('fill', pointColorInterpolate(currentD.colorIndex))
          .attr('stroke', 'none')
          .lower();
        map.lower();
        d3.select('#walk-line').remove();
      }
      currentDestination = d3.select(this);
      currentD = d;

      let path = findPath(id, d.nearest.id);
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
          .attr('id', 'walk-line')
          .attr('x1', geoprojection(d.nearest.geometry.coordinates)[0])
          .attr('y1', geoprojection(d.nearest.geometry.coordinates)[1])
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
      currentNode.raise();
    })
    .on('click', normalMode);

  g.selectAll('.heat-line')
    .data(points)
    .join('line')
      .attr('class', 'heat-line')
      .attr('x1', d => geoprojection(d.nearest.geometry.coordinates)[0])
      .attr('y1', d => geoprojection(d.nearest.geometry.coordinates)[1])
      .attr('x2', d => geoprojection(d.geometry.coordinates)[0])
      .attr('y2', d => geoprojection(d.geometry.coordinates)[1])
      .attr('transform', `translate(0, -${offset})`)
      .attr('stroke', d => lineColorInterpolate(d.colorIndex))
      .attr('stroke-width', 0.5)
      .attr("pointer-events", 'none')
      .style('opacity', 0);

  arrangeOrder();
}

function generateHeatMap_Anywhere(center, delta = [0.003, 0.002335], maxDis = 0.6) {
    //TODO
}

function normalMode() {
  detailMode = false;
  currentNode.attr('stroke', '#333333')
    .attr('stroke-width', 0.2);
  g.select('#walk-line').remove();
  g.selectAll('.heat-point').remove();
  g.selectAll('.path-line').remove();
  g.selectAll('.heat-line').remove();
  g.selectAll('.fake-point')
    .attr('d', geopath.pointRadius(Math.max(1.3, 4 / Math.sqrt(currentScale)) * geoScale / 40000));
}

function arrangeOrder() {
  g.selectAll('.heat-point').raise();
  g.selectAll('.path-link').raise();
  g.selectAll('line').raise();
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

function actualDistance_StationToAnywhere(id, lat2, lon2) {
  let minDis = 100000;
  let getOffStation;
  for (let i = 0; i < numStations; i++) {
    let [lati, loni] = stations[i].geometry.coordinates;
    let tmp = disStations[id][i] + directDistance(lati, loni, lat2, lon2, 'Manhattan') / 5;
    if (tmp < minDis) {
      minDis = tmp;
      getOffStation = stations[i];
    }
  }
  return [minDis, getOffStation];
}

function ClientToCoordinate(ClientX, ClientY) {
  let titleMargin = 0.1 * document.body.clientHeight;
  return geoprojection.invert([(e.clientX - currentTranslate.x) / currentScale, (e.clientY - currentTranslate.y - titleMargin) / currentScale + offset]);
}