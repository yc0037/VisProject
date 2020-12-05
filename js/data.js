export async function getSubway() {
  let subwayLines = 
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
  return subwayLines;
}