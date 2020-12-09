import { getSubway } from "./data.js";
import * as utils from './utils.js';

const { mainHeight, mainWidth } = utils;

let geoFeature;
let geopath;
let geoprojection;

const beijingMap = 'https://geo.datav.aliyun.com/areas_v2/bound/110000_full.json';

export async function initMain() {
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
    g.transition().ease(d3.easeExpOut).duration(1000).attr('transform', e.transform);
    g.selectAll('.border-path')
     .attr('stroke-width', 0.2 / Math.sqrt(e.transform.k));
  });
  mainSvg.call(zoom);
  drawLegend();
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
      .attr('id', d => `subway-line-${d.properties.name}`)
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
            .duration(100)
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
            .duration(100)
            .attr('d', geopath.pointRadius(1.3));
        d3.select('#main-tooltip')
          .style('visibility', 'hidden');
      });
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
        .attr('stroke', d3.color(colors[key]).brighter().toString());
    });
    legend.on('mouseout', e => {
      d3.select(`#legend-${key}`)
        .style('background-color', '#eeeeeedd');
      d3.select(`#subway-line-${key}`)
      .attr('stroke', colors[key]);
    })
  }
}