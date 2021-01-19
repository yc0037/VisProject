export async function getSubway() {
  const subwayLines = 
    await fetch('./data/subway.json')
      .then(response => response.json())
      .then(result => result.l.map(v => ({
        st: v.st.map(vv => ({
          name: vv.n,
          x: vv.sl.split(',')[0],
          y: vv.sl.split(',')[1],
          t: vv.t
        })),
        name: v.kn,
        isLoop: v.lo === "1",
      })));
  console.log("subwayLines",subwayLines);
  return subwayLines;
}

export async function getKeyInfo(date){
    const keyInfo={
        keyDate:date,
        keyStations:[],
        keyNumStations:0,
        keyLinks:[],
        keyStationMap:{},
        keyLabel:[],
        keyPathStations:[],
        keyAdjStations:[],
        keyDisStations:[]
    }
    return keyInfo;
}
export async function getStationOpen() {
    const stationOpentimes =
        await fetch('./data/subwayopen.json')
            .then(response=>response.json());
    for(let station in stationOpentimes)
        for (let line in stationOpentimes[station]){
            let year = stationOpentimes[station][line].split('.')[0];
            let month = stationOpentimes[station][line].split('.')[1];
            stationOpentimes[station][line]=parseInt(year)+(month-1)/12;
        }
    console.log('open',stationOpentimes);
  return stationOpentimes;
}

export async function getStationCode() {
  const code2Station = {};
  const code2Line = {};
  const stations = {};
  await fetch('./data/subway.json')
        .then(response => response.json())
        .then(result => {
          const lines = result.l;
          for (let line of lines) {
            code2Line[line.ls] = line.kn;
            for (let st of line.st) {
              code2Station[st.sid] = st.n;
            }
          }
        });
  await fetch('./data/subwayinfo.json')
        .then(response => response.json())
        .then(result => {
          const lines = result.l;
          for (let line of lines) {
            for (let st of line.st) {
              const stName = code2Station[st.si];
              if (!stations.hasOwnProperty(stName)) {
                stations[stName] = {};
              }
              for (let d of st.d) {
                if (code2Station[d.n] === stName) {
                  continue;
                }
                const lineName = code2Line[d.ls];
                if (!stations[stName].hasOwnProperty(lineName)) {
                  stations[stName][lineName] = {};
                }
                stations[stName][lineName][code2Station[d.n]] = [d.ft, d.lt];
              }
            }
          }
        })
        console.log(code2Station);
  console.log(JSON.stringify(stations));
}

export async function getDest(){
    const dests =
        await fetch('./data/destination.json')
            .then(response => response.json());

    console.log("dests",dests);
    return dests;
}