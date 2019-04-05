require('../../resources/big.min.js');
require('../../resources/stuquery.js');
require('../../resources/graph.js');
require('../../resources/timeseries.js');
require('../../resources/timeseries.css');

function component() {

  let element = document.createElement('div');
  element.setAttribute("id", "example1");
  return element;

}

document.body.appendChild(component());

S(document).ready(function(){
  ex1 = TimeSeries.create("lightcurve.json");
  ex1.initialize(document.getElementById('example1'));
});
