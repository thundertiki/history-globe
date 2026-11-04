// About dialog: what the app is, how precise the borders are, and every data source's license.
const HTML = `
<h2>About History Globe</h2>
<p>Pick a date to see the world's political borders at that moment. Tap a country for details.</p>
<p><b>How precise is it?</b> Before 1886 borders come from about 40 world snapshots, so the map shows the latest
snapshot at or before your date. From 1886 to 2019 borders change on the exact day. After 2019 the map shows
present-day borders. Ancient borders are approximate.</p>
<h3>Sources</h3>
<ul>
  <li><a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener">historical-basemaps</a>
    by André Ourednik and contributors (GPL-3.0): borders before 1886.</li>
  <li><a href="https://icr.ethz.ch/data/cshapes/" target="_blank" rel="noopener">CShapes 2.0</a>,
    Schvitz et al. (2022), ETH Zürich (CC BY-NC-SA 4.0): borders 1886–2019. Simplified for this app.</li>
  <li><a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> (public domain):
    present-day borders and land.</li>
  <li><a href="https://www.wikipedia.org/" target="_blank" rel="noopener">Wikipedia</a> summaries (CC BY-SA 4.0) and
    <a href="https://www.wikidata.org/" target="_blank" rel="noopener">Wikidata</a> (CC0).</li>
  <li>Map rendering: <a href="https://maplibre.org/" target="_blank" rel="noopener">MapLibre GL JS</a>; labels in
    Open Sans (Apache-2.0).</li>
</ul>
<h3>Names and summaries</h3>
<ul>
  <li>From 1886, names are matched to the period from the historical-basemaps snapshots, so 1914 shows the
    Russian Empire rather than Russia. They change when a snapshot changes, which is not always the exact day.</li>
  <li>Wikipedia summaries were collected when the app was built and describe each place overall.</li>
</ul>
<p>Free and open source (GPL-3.0). Non-commercial.</p>
<form method="dialog"><button>Close</button></form>`;

export function initAbout() {
  const dlg = document.getElementById('about') as HTMLDialogElement;
  dlg.innerHTML = HTML;
  document.getElementById('about-btn')!.addEventListener('click', () => dlg.showModal());
}
