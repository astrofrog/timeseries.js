/*
	AAS Time Series graphing library.
	Written by Stuart Lowe
	
	INCLUDES:
	* Fix for setTimeout in IE - http://webreflection.blogspot.com/2007/06/simple-settimeout-setinterval-extra.html
	* Full screen API - http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/
	
	USAGE:
		<html>
		<head>
			<script src="stuquery.js" type="text/javascript"></script>
			<script src="graph.js" type="text/javascript"></script>
			<script src="timeseries.js" type="text/javascript"></script>
			<script type="text/javascript">
			</script>
		</head>
		<body>
			<div id="lightcurve" style="width:100%;height:350px;font-size:0.8em;font-family:Century Gothic,sans-serif;"></div>
		</body>
		</html>
*/

var TimeSeries;

(function(){

	// First we will include all the useful helper functions
	// Get the current Julian Date
	function getJD(today) {
		// The Julian Date of the Unix Time epoch is 2440587.5
		if(!today) today = new Date();
		return ( today.getTime() / 86400000.0 ) + 2440587.5;
	}

	// A non-jQuery dependent function to get a style
	function getStyle(el, styleProp) {
		if (typeof window === 'undefined') return;
		var style;
		var el = document.getElementById(el);
		if (el.currentStyle) style = el.currentStyle[styleProp];
		else if (window.getComputedStyle) style = document.defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
		if (style && style.length === 0) style = null;
		return style;
	}
	// End of helper functions

	TimeSeries = function(file){
		this.options = {
			xaxis:{ label:'Time (HJD)', log: false, fit:true },
			yaxis: { label: 'Delta (mag)', log: false },
			grid: { hoverable: true, clickable: true }
		}
		this.datasets = [];
		this.file = file;

		return this;
	}
	TimeSeries.prototype.load = function(f){
		this.file = f;
		S().ajax(this.file,{
			"dataType": "json",
			"this": this,
			"success": function(d,attr){
				this.json = d;
				this.datasets = {};
				this.dataloaded = 0;
				console.log(d)
				if(d.width) this.options.width = d.width;
				if(d.height) this.options.height = d.height;
				if(d.padding) this.options.padding = d.padding;
				this.graph = new Graph('lightcurve', [], this.options) // Need to make this target the correct element
				
				this.graph.canvas.container.append('<div class="loader"><div class="spinner"><div class="rect1 seasonal"></div><div class="rect2 seasonal"></div><div class="rect3 seasonal"></div><div class="rect4 seasonal"></div><div class="rect5 seasonal"></div></div></div>');

				for(var j = 0; j < d.data.length; j++){
					this.loadDataset(j);
				}
			}
		});
		return this;
	}
	TimeSeries.prototype.loadDataset = function(j){
		// Now grab the data
		S().ajax(this.json.data[j].url,{
			"dataType": "csv",
			"this": this,
			"j": j,
			"success": function(d,attr){
	
				// Remove extra newlines at the end
				d = d.replace(/[\n\r]$/,"");

				//var data = CSV2JSON(d,this.json.data[attr.j].format.parse);
				this.datasets[this.json.data[attr.j].name] = CSV2JSON(d,this.json.data[attr.j].format.parse);//{ data: data, points :{show:true, radius: 1.5}, title:(this.json.data[attr.j].name), color: '#000000', lines: { show: false }, clickable: true, hoverable:true, hover:{ text:'{{xlabel}}: {{x}}<br />{{ylabel}}: {{y}}<br />Uncertainty: {{err}}',before:'{{title}}<br />'},css:{'font-size':'0.8em','background-color':'#000000'} };
				this.dataloaded++;

				this.update();

				if(this.dataloaded == this.json.data.length) this.loaded();
			}
		});

		return this;
	}
	TimeSeries.prototype.update = function(){

		var data = new Array();
		var id,mark;
		this.olddatasetsused = this.datasetsused;
		this.datasetsused = "";
		for(var m = 0; m < this.json.marks.length; m++){
			id = "";
			mark = this.json.marks[m];
			if(mark.from.data) id = mark.from.data;



			if(this.datasets[id]){
				this.datasetsused += id;
				var update = mark.encode.update;
				var datum;
				// Keep our evaluation contained
				var ev = function(str,datum){
					return eval(str);
				}
				
				if(update){
					for(var d = 0; d < this.datasets[id].length; d++){
						datum = this.datasets[id][d];

						x2 = undefined;
						y2 = undefined;
						x = undefined;
						y = undefined;
						err = undefined;

						// Update the data
						if(update.x && update.x.field){
							if(datum[update.x.field]) x = datum[update.x.field];
							else{
								try { x = ev.call(datum,update.x.field,datum); }
								catch { console.log('Error'); }
							}
						}
						if(update.x2 && update.x2.field){
							if(datum[update.x2.field]) x2 = datum[update.x2.field];
							else{
								try { x2 = ev.call(datum,update.x.field,datum); }
								catch { console.log('Error'); }
							}
						}
						if(update.y && update.y.field){
							if(datum[update.y.field]) y = datum[update.y.field];
							else{
								try { y = ev.call(datum,update.y.field,datum); }
								catch { console.log('Error'); }
							}
						}
						if(update.y2 && update.y2.field){
							err = 0;
							if(datum[update.y2.field]) y2 = datum[update.y2.field];
							else{
								try { y2 = ev.call(datum,update.y2.field,datum); }
								catch { console.log('Error'); }
							}
						}

						if(x && x2){
							xerr = (x2-x)/2;
							x += xerr;
						}
						if(y && y2){
							yerr = (y2-y)/2;
							y += yerr;
							err = yerr;
						}
						if(x) datum.x = x;
						if(y) datum.y = y;
						if(err){
							datum.err = err;
						}

						this.datasets[id][d] = datum;

					}
				}
				if(mark.type == "symbol") data.push({ data: this.datasets[id], points: {show:true, radius: ((mark.encode.enter.size.value/2)||1.5)}, title: id, color: mark.encode.update.fill.value||"#000000", lines: { show: false }, clickable: true, hoverable:true, hover:{ text:'{{xlabel}}: {{x}}<br />{{ylabel}}: {{y}}<br />Uncertainty: {{err}}',before:'{{title}}<br />'},css:{'font-size':'0.8em','background-color':(mark.encode.hover.fill.value||'#000000')} });
				else if(mark.type == "line") data.push({ data: this.datasets[id], points: {show:false}, title: id, color: mark.encode.update.fill.value||"#000000", lines: { show: true, 'width':((mark.encode.enter.strokeWidth.value)||1) }, clickable: true, hoverable:true, hover:{ text:'{{xlabel}}: {{x}}<br />{{ylabel}}: {{y}}<br />Uncertainty: {{err}}',before:'{{title}}<br />'},css:{'font-size':'0.8em','background-color':(mark.encode.hover.fill.value||'#000000')} });
			}
			
		}

		if(this.datasetsused != this.olddatasetsused){
			console.log('updateData')
			this.graph.updateData(data);
		}

		return this;
	}
	TimeSeries.prototype.loaded = function(){
		this.graph.canvas.container.find('.loader').remove();;
	//	console.log('loaded',this)
		//this.update();
		return this;
	}


	/**
	 * CSVToArray parses any String of Data including '\r' '\n' characters,
	 * and returns an array with the rows of data.
	 * @param {String} CSV_string - the CSV string you need to parse
	 * @param {String} delimiter - the delimeter used to separate fields of data
	 * @returns {Array} rows - rows of CSV where first row are column headers
	 */
	function CSVToArray (CSV_string, delimiter) {
		delimiter = (delimiter || ","); // user-supplied delimeter or default comma

		var pattern = new RegExp( // regular expression to parse the CSV values.
			( // Delimiters:
				"(\\" + delimiter + "|\\r?\\n|\\r|^)" +
				// Quoted fields.
				"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
				// Standard fields.
				"([^\"\\" + delimiter + "\\r\\n]*))"
			), "gi"
		);

		var rows = [[]];  // array to hold our data. First row is column headers.
		// array to hold our individual pattern matching groups:
		var matches = false; // false if we don't find any matches
		// Loop until we no longer find a regular expression match
		while (matches = pattern.exec( CSV_string )) {
			var matched_delimiter = matches[1]; // Get the matched delimiter
			// Check if the delimiter has a length (and is not the start of string)
			// and if it matches field delimiter. If not, it is a row delimiter.
			if (matched_delimiter.length && matched_delimiter !== delimiter) {
				// Since this is a new row of data, add an empty row to the array.
				rows.push( [] );
			}
			var matched_value;
			// Once we have eliminated the delimiter, check to see
			// what kind of value was captured (quoted or unquoted):
			if (matches[2]) { // found quoted value. unescape any double quotes.
				matched_value = matches[2].replace(
					new RegExp( "\"\"", "g" ), "\""
				);
			} else { // found a non-quoted value
				matched_value = matches[3];
			}
			// Now that we have our value string, let's add
			// it to the data array.
			rows[rows.length - 1].push(matched_value);
		}
		return rows; // Return the parsed data Array
	}

	// Function to parse a CSV file and return a JSON structure
	// Guesses the format of each column based on the data in it.
	function CSV2JSON(data,parse){

		// Split by the end of line characters
		if(typeof data==="string") data = CSVToArray(data);

		var line,datum,header,types,rows;
		var newdata = new Array();
		var formats = new Array();
		var header = new Array();

		formats = new Array(data[0].length)
		header = new Array(data[0].length)
		// Loop over each column in the line to find headers
		for(var j=0; j < data[0].length; j++){
			header[j] = data[0][j];
			formats[j] = parse[header[j]] || "string";
		}

		for(var i = 1 ; i < data.length; i++){
			// If there is no content on this line we skip it
			if(!data[i] || data[i] == "") continue;
			
			datum = {};
			//console.log(i,data[i]);
			// Loop over each column in the line
			for(var j=0; j < data[i].length; j++){
				if(formats[j]!="string"){
					// "number", "boolean" or "date"
					if(formats[j]=="number"){
						data[i][j] = parseFloat(data[i][j]);
					}else if(formats[j]=="date"){
						data[i][j] = new Date(data[i][j].replace(/^"/,"").replace(/"$/,""));
					}else if(formats[j]=="boolean"){
						if(data[i][j]=="1" || data[i][j]=="true" || data[i][j]=="Y") data[i][j] = true;
						else if(data[i][j]=="0" || data[i][j]=="false" || data[i][j]=="N") data[i][j] = false;
						else data[i][j] = null;
					}
				}
				datum[header[j]] = data[i][j];
				//if(header[j]=="HJD") datum['x'] = data[i][j];
				//if(header[j]=="dmag") datum['y'] = data[i][j];
			}
			newdata.push(datum);
		}

		// Return the structured data
		return newdata;
	}
	// Function to clone a hash otherwise we end up using the same one
	function clone(hash) {
		var json = JSON.stringify(hash);
		var object = JSON.parse(json);
		return object;
	}
	/*S.Timeseries = function(element, data, options) {
		return new Timeseries(element, data, options);
	}*/

})(S);