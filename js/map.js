import { getSubway } from "./data.js";
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
let currentDestination;
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
let detailMode = false;

export async function initMain() {
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
        generateHeatMap_Station(d.id, d.geometry.coordinates);
        detailMode = true;
        currentNode = d3.select(`#${d.properties.name}`);
        currentNode.attr('stroke', '#000000')
          .attr('stroke-width', 1);
        g.selectAll('.fake-point')
          .attr('d', geopath.pointRadius(1.3 * geoScale / 40000));
      });
 
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
    for (let j = 0, jt = link.stations.length; j < jt - 1; j++) {
      let s = link.stations[j], t = link.stations[j + 1];
      let x = link.geometry.coordinates[j], y = link.geometry.coordinates[j + 1];
      dis[s][t] = dis[t][s] = directDistance(x[0], x[1], y[0], y[1], 'Euclidean') / 35 + 0.004;
      label[s][t] = label[t][s] = i;
      pathStations[s][t] = t;
      pathStations[t][s] = s;
    }
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

  g.selectAll('.heat-point')
    .data(points)
    .join('path')
      .attr('class', 'heat-point')
      .attr('d', geopath.pointRadius(1.3 * geoScale / 40000))
      .attr('transform', `translate(0, -${offset})`)
      .attr('fill', d => pointColorInterpolate(d.colorIndex))
    .on('mouseover', function(e, d) {
      if (currentDestination) {
        console.log('suc');
        currentDestination.attr('fill', pointColorInterpolate(d.colorIndex))
          .attr('stroke', 'none')
          .lower();
        map.lower();
        d3.select('#walk-line').remove();
      }
      currentDestination = d3.select(this);

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
    .on('mouseout', function(e, d) {
      currentDestination = d3.select(this);
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
      .attr("pointer-events", 'none');

  arrangeOrder();
}

function generateHeatMap_Anywhere(center, delta = [0.003, 0.002335], maxDis = 0.6) {
    //TODO
}

function normalMode() {
  detailMode = false;
  currentNode.attr('stroke', '#333333')
    .attr('stroke-width', 0.2);
  currentDestination = null;
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